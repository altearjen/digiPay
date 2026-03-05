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
/**
 * Returns the cached result for a previously-processed idempotency key.
 * Called by the API route to short-circuit duplicate requests.
 */
export function getCachedPaymentResult(
  idempotencyKey: string
): ProcessPaymentResponse | null {
  const existing = db.payments.findByIdempotencyKey(idempotencyKey)
  if (!existing) return null

  const transaction = db.transactions.findByPaymentId(existing.id)[0]
  const fraudCheck = db.fraudChecks.findByPaymentId(existing.id)

  return {
    success: existing.status === 'completed',
    payment: existing,
    transaction,
    fraudCheck,
    ...(existing.status === 'flagged' && { error: 'Payment flagged for fraud review' }),
  }
}

export async function processPayment(
  request: ProcessPaymentRequest,
  { skipIdempotencyCheck = false }: { skipIdempotencyCheck?: boolean } = {}
): Promise<ProcessPaymentResponse> {
  try {
    // Validate basic fields
    if (!request.amount || request.amount <= 0) {
      return { success: false, error: 'Invalid payment amount' }
    }

    if (!request.merchantId || !MERCHANTS[request.merchantId]) {
      return { success: false, error: 'Invalid merchant' }
    }

    // Idempotency is handled by the API layer via getCachedPaymentResult.
    // If the caller signals that it already checked, we skip the lookup here.
    if (!skipIdempotencyCheck) {
      const existingPayment = db.payments.findByIdempotencyKey(request.idempotencyKey)
      if (existingPayment) {
        const transaction = db.transactions.findByPaymentId(existingPayment.id)[0]
        const fraudCheck = db.fraudChecks.findByPaymentId(existingPayment.id)
        return {
          success: existingPayment.status === 'completed',
          payment: existingPayment,
          transaction,
          fraudCheck,
          ...(existingPayment.status === 'flagged' && { error: 'Payment flagged for fraud review' }),
        }
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
