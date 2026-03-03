import { v4 as uuidv4 } from 'uuid'
import {
  Payment,
  Transaction,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
} from '@/types'
import { db } from './db'
import { evaluateFraudRisk } from './fraud'
import { MERCHANTS, CURRENCY_USD } from './constants'

/**
 * Core payment processing service.
 * Handles payment creation, fraud evaluation, and transaction settlement.
 */
export async function processPayment(
  request: ProcessPaymentRequest
): Promise<ProcessPaymentResponse> {
  try {
    // Validate basic fields
    if (!request.amount || request.amount <= 0) {
      return { success: false, error: 'Invalid payment amount' }
    }

    if (!request.merchantId || !MERCHANTS[request.merchantId]) {
      return { success: false, error: 'Invalid merchant' }
    }

    // Check for existing payment with same idempotency key
    const existingPayment = db.payments.findByIdempotencyKey(request.idempotencyKey)
    if (existingPayment) {
      const existingTransaction = db.transactions.findByPaymentId(existingPayment.id)[0]
      const existingFraudCheck = db.fraudChecks.findByPaymentId(existingPayment.id)
      return {
        success: existingPayment.status === 'completed',
        payment: existingPayment,
        transaction: existingTransaction,
        fraudCheck: existingFraudCheck,
      }
    }

    // Create the payment record
    const paymentId = uuidv4()
    const now = new Date().toISOString()

    const payment: Payment = {
      id: paymentId,
      idempotencyKey: request.idempotencyKey,
      amount: request.amount,
      currency: request.currency || CURRENCY_USD,
      status: 'pending',
      method: request.method,
      merchantId: request.merchantId,
      merchantName: MERCHANTS[request.merchantId],
      customerId: request.customerId,
      customerEmail: request.customerEmail,
      description: request.description,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    }

    db.payments.create(payment)

    // Run fraud evaluation
    const recentPayments = db.payments
      .findAll()
      .filter(p => p.customerId === request.customerId)
    const fraudCheck = evaluateFraudRisk(paymentId, request, recentPayments.length)
    db.fraudChecks.create(fraudCheck)

    // If fraud check recommends blocking, flag the payment
    if (fraudCheck.recommendation === 'block') {
      db.payments.update(paymentId, { status: 'flagged' })
      return {
        success: false,
        payment: { ...payment, status: 'flagged' },
        fraudCheck,
        error: 'Payment flagged for fraud review',
      }
    }

    // If fraud check recommends review, mark as flagged but still process
    if (fraudCheck.recommendation === 'review') {
      db.payments.update(paymentId, { status: 'flagged' })
      payment.status = 'flagged'
    }

    // Process the charge
    db.payments.update(paymentId, { status: 'processing' })

    // Simulate payment gateway processing
    await simulateGatewayDelay()

    // Create the transaction record
    const transaction: Transaction = {
      id: uuidv4(),
      paymentId,
      type: 'charge',
      amount: request.amount,
      currency: request.currency || CURRENCY_USD,
      status: 'settled',
      createdAt: new Date().toISOString(),
    }

    db.transactions.create(transaction)
    db.payments.update(paymentId, { status: 'completed' })

    const finalPayment = db.payments.findById(paymentId)!

    return {
      success: true,
      payment: finalPayment,
      transaction,
      fraudCheck,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

async function simulateGatewayDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 50))
}
