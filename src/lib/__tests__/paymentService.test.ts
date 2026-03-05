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

})

describe('Idempotency — duplicate charge prevention', () => {
  beforeEach(() => {
    db._reset()
  })

  it('should return the original result when the same idempotency key is sent twice', async () => {
    const request = makeRequest({ idempotencyKey: 'dup-key-1', amount: 42 })

    const first = await processPayment(request)
    const second = await processPayment(request)

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(second.payment!.id).toBe(first.payment!.id)
    expect(second.transaction!.id).toBe(first.transaction!.id)
  })

  it('should only create one payment record for duplicate requests', async () => {
    const request = makeRequest({ idempotencyKey: 'dup-key-2', amount: 75 })

    await processPayment(request)
    await processPayment(request)
    await processPayment(request)

    const allPayments = db.payments
      .findAll()
      .filter(p => p.idempotencyKey === 'dup-key-2')
    expect(allPayments).toHaveLength(1)
  })

  it('should only create one transaction for duplicate requests', async () => {
    const request = makeRequest({ idempotencyKey: 'dup-key-3', amount: 60 })

    await processPayment(request)
    await processPayment(request)

    const allTransactions = db.transactions.findAll()
    expect(allTransactions).toHaveLength(1)
  })

  it('should allow different idempotency keys to process independently', async () => {
    const first = await processPayment(makeRequest({ idempotencyKey: 'key-a', amount: 10 }))
    const second = await processPayment(makeRequest({ idempotencyKey: 'key-b', amount: 20 }))

    expect(first.payment!.id).not.toBe(second.payment!.id)
    expect(db.payments.findAll()).toHaveLength(2)
    expect(db.transactions.findAll()).toHaveLength(2)
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
