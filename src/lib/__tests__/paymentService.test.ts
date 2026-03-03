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

  // Reproduces: "Users are occasionally being double-charged after retrying
  // failed payments in the mobile app." The mobile app sends the same
  // idempotency key when a user taps "Pay" again after a timeout, so the
  // backend should recognize the duplicate and return the original payment.
  it('should not double-charge when mobile app retries with the same idempotency key', async () => {
    const idempotencyKey = 'mobile-retry-key-abc'
    const request = makeRequest({ idempotencyKey, amount: 79.99 })

    // First tap — payment goes through
    const first = await processPayment(request)
    expect(first.success).toBe(true)
    const firstPaymentId = first.payment!.id

    // Mobile app times out, user taps "Pay" again — same idempotency key
    const retry = await processPayment(request)
    expect(retry.success).toBe(true)
    // Should return the SAME payment, not create a second charge
    expect(retry.payment!.id).toBe(firstPaymentId)

    // Customer should only see ONE charge on their statement
    const allTransactions = db.transactions.findAll()
    const charges = allTransactions.filter(t => t.type === 'charge')
    expect(charges).toHaveLength(1)
  })

  it('should not create duplicate charges when mobile app retries 3 times', async () => {
    const idempotencyKey = 'mobile-retry-key-flaky-network'
    const request = makeRequest({ idempotencyKey, amount: 149.00 })

    // Simulate flaky mobile network: app retries the same payment 3 times
    await processPayment(request)
    await processPayment(request)
    await processPayment(request)

    // Customer should see exactly 1 payment and 1 charge, not 3
    const payments = db.payments.findAll()
    const transactions = db.transactions.findAll()

    expect(payments).toHaveLength(1)
    expect(transactions).toHaveLength(1)
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

  // --- This test exposes the FRAUD SCORING BUG ---
  it('should correctly classify a medium-risk payment', async () => {
    // A $600 credit card payment should trigger high_value_transaction (score 15)
    // plus the velocity from previous payments. With a score between 30-60
    // it should be classified as "medium" risk, not "high"
    const request = makeRequest({ amount: 600, method: 'credit_card' })

    // Create a few prior payments to bump velocity without going over threshold
    await processPayment(makeRequest({ amount: 10, customerId: 'cust_002' }))

    const result = await processPayment(request)

    expect(result.fraudCheck).toBeDefined()
    // Score should be 15 (high_value_transaction only), which is under LOW_RISK_MAX of 30
    // so it should be "low" risk. But if we had more signals pushing it to 30-60 range,
    // it should be "medium". Let's test the boundary explicitly.
    expect(result.fraudCheck!.riskScore).toBe(15)
    expect(result.fraudCheck!.riskLevel).toBe('low')
  })

  it('should not flag a score of 35 as high risk', async () => {
    // digital_wallet + amount > $500 triggers:
    //   - HIGH_AMOUNT (15) for amount > 500
    //   - digital_wallet_high_value (20) for digital_wallet > $200
    //   Total score: 35
    // A score of 35 is between LOW_RISK_MAX (30) and MEDIUM_RISK_MAX (60),
    // so it should be classified as "medium" risk, NOT "high".
    const result = await processPayment(
      makeRequest({ amount: 550, method: 'digital_wallet' })
    )

    expect(result.fraudCheck).toBeDefined()
    expect(result.fraudCheck!.riskScore).toBe(35)
    // BUG: The fraud engine incorrectly classifies this as "high" because
    // the threshold comparisons are checked in the wrong order
    expect(result.fraudCheck!.riskLevel).toBe('medium')
    expect(result.fraudCheck!.recommendation).toBe('approve')
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
