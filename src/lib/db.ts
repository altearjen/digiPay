import { Payment, Transaction, FraudCheck } from '@/types'

/**
 * In-memory store simulating a database.
 * In production this would be backed by PostgreSQL or similar.
 */

const payments: Map<string, Payment> = new Map()
const transactions: Map<string, Transaction> = new Map()
const fraudChecks: Map<string, FraudCheck> = new Map()

// Index for looking up payments by idempotency key
const idempotencyIndex: Map<string, string> = new Map()

export const db = {
  payments: {
    findById(id: string): Payment | undefined {
      return payments.get(id)
    },
    findByIdempotencyKey(key: string): Payment | undefined {
      const paymentId = idempotencyIndex.get(key)
      return paymentId ? payments.get(paymentId) : undefined
    },
    findAll(): Payment[] {
      return Array.from(payments.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },
    create(payment: Payment): Payment {
      payments.set(payment.id, payment)
      idempotencyIndex.set(payment.idempotencyKey, payment.id)
      return payment
    },
    update(id: string, updates: Partial<Payment>): Payment | undefined {
      const existing = payments.get(id)
      if (!existing) return undefined
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
      payments.set(id, updated)
      return updated
    },
  },

  transactions: {
    findById(id: string): Transaction | undefined {
      return transactions.get(id)
    },
    findByPaymentId(paymentId: string): Transaction[] {
      return Array.from(transactions.values()).filter(t => t.paymentId === paymentId)
    },
    findAll(): Transaction[] {
      return Array.from(transactions.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },
    create(transaction: Transaction): Transaction {
      transactions.set(transaction.id, transaction)
      return transaction
    },
  },

  fraudChecks: {
    findByPaymentId(paymentId: string): FraudCheck | undefined {
      return Array.from(fraudChecks.values()).find(fc => fc.paymentId === paymentId)
    },
    findAll(): FraudCheck[] {
      return Array.from(fraudChecks.values()).sort(
        (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
      )
    },
    create(fraudCheck: FraudCheck): FraudCheck {
      fraudChecks.set(fraudCheck.id, fraudCheck)
      return fraudCheck
    },
  },

  /** Reset all data — used in tests */
  _reset() {
    payments.clear()
    transactions.clear()
    fraudChecks.clear()
    idempotencyIndex.clear()
  },
}
