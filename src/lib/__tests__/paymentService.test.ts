import { describe, it, expect, beforeEach } from 'vitest'
import { processPayment } from '../paymentService'
import { db } from '../db'
import { ProcessPaymentRequest } from '@/types'

function makeRequest(overrides: Partial<ProcessPaymentRequest> = {}): ProcessPaymentRequest {
  return {
    idempotencyKey: `key-${Date.now()}-${Math.random()}`,
    amount: 50,
    currency: 'USD',
    method: 'credit_card',
    merchantId: 'merch_001',
    customerId: 'cust_001',
    customerEmail: 'test@example.com',
    description: 'Test payment',
    ...overrides,
  }
}

describe('Payment Processing Service', () => {
  beforeEach(() => {
    db._reset()
  })

  it('should process a valid payment successfully', async () => {
    const request = makeRequest({ amount: 25 })
    const result = await processPayment(request)

    expect(result.success).toBe(true)
    expect(result.payment).toBeDefined()
    expect(result.payment!.amount).toBe(25)
    expect(result.transaction).toBeDefined()
    expect(result.transaction!.status).toBe('settled')
  })

  it('should reject payments with invalid amount', async () => {
    const result = await processPayment(makeRequest({ amount: -10 }))
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid payment amount')
  })

  it('should reject payments with invalid merchant', async () => {
    const result = await processPayment(makeRequest({ merchantId: 'bad_merchant' }))
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid merchant')
  })

  it('should return the original payment on duplicate idempotency key', async () => {
    const request = makeRequest({ amount: 42 })
    const first = await processPayment(request)
    const second = await processPayment(request)

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(second.payment!.id).toBe(first.payment!.id)
    expect(second.transaction!.id).toBe(first.transaction!.id)
  })

  it('should not create duplicate transactions on retry', async () => {
    const request = makeRequest({ amount: 75 })
    const first = await processPayment(request)
    await processPayment(request)
    await processPayment(request)

    const allTransactions = db.transactions.findAll()
    const matching = allTransactions.filter(
      t => t.paymentId === first.payment!.id
    )
    expect(matching.length).toBe(1)
  })

  it('should not create duplicate payment records on retry', async () => {
    const request = makeRequest({ amount: 60 })
    await processPayment(request)
    await processPayment(request)

    const allPayments = db.payments.findAll()
    const matching = allPayments.filter(
      p => p.idempotencyKey === request.idempotencyKey
    )
    expect(matching.length).toBe(1)
  })

})

describe('Fraud Detection', () => {
  beforeEach(() => {
    db._reset()
  })

  it('should approve a low-risk payment', async () => {
    const result = await processPayment(makeRequest({ amount: 25, method: 'credit_card' }))

    expect(result.success).toBe(true)
    expect(result.fraudCheck).toBeDefined()
    expect(result.fraudCheck!.riskLevel).toBe('low')
    expect(result.fraudCheck!.recommendation).toBe('approve')
  })

  it('should correctly classify a medium-risk payment', async () => {
    const request = makeRequest({ amount: 600, method: 'credit_card' })

    await processPayment(makeRequest({ amount: 10, customerId: 'cust_002' }))

    const result = await processPayment(request)

    expect(result.fraudCheck).toBeDefined()
    expect(result.fraudCheck!.riskScore).toBe(15)
    expect(result.fraudCheck!.riskLevel).toBe('low')
  })

  it('should not produce excessive fraud flags for normal transactions', async () => {
    // Process 10 small, normal payments
    const results = []
    for (let i = 0; i < 10; i++) {
      const result = await processPayment(
        makeRequest({
          amount: 20 + i,
          customerId: `cust_${i}`,
          idempotencyKey: `normal-${i}`,
        })
      )
      results.push(result)
    }

    const flagged = results.filter(r => r.payment?.status === 'flagged')
    // Normal low-value payments from different customers should not get flagged
    expect(flagged.length).toBe(0)
  })
})
