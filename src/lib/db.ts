import Database from 'better-sqlite3'
import path from 'path'
import { Payment, Transaction, FraudCheck } from '@/types'

const dbPath = path.join(process.cwd(), 'digipay.db')
const sqlite = new Database(dbPath)

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL')

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    idempotencyKey TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    method TEXT NOT NULL,
    merchantId TEXT NOT NULL,
    merchantName TEXT NOT NULL,
    customerId TEXT NOT NULL,
    customerEmail TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency
    ON payments(idempotencyKey);

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    paymentId TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fraud_checks (
    id TEXT PRIMARY KEY,
    paymentId TEXT NOT NULL,
    riskScore REAL NOT NULL,
    riskLevel TEXT NOT NULL,
    flags TEXT NOT NULL DEFAULT '[]',
    recommendation TEXT NOT NULL,
    checkedAt TEXT NOT NULL
  );
`)

// Prepared statements
const stmts = {
  payments: {
    findById: sqlite.prepare('SELECT * FROM payments WHERE id = ?'),
    findByIdempotencyKey: sqlite.prepare('SELECT * FROM payments WHERE idempotencyKey = ?'),
    findAll: sqlite.prepare('SELECT * FROM payments ORDER BY createdAt DESC'),
    create: sqlite.prepare(`
      INSERT INTO payments (id, idempotencyKey, amount, currency, status, method, merchantId, merchantName, customerId, customerEmail, description, metadata, createdAt, updatedAt)
      VALUES (@id, @idempotencyKey, @amount, @currency, @status, @method, @merchantId, @merchantName, @customerId, @customerEmail, @description, @metadata, @createdAt, @updatedAt)
    `),
    update: sqlite.prepare(`
      UPDATE payments SET status = COALESCE(@status, status), updatedAt = @updatedAt WHERE id = @id
    `),
  },
  transactions: {
    findById: sqlite.prepare('SELECT * FROM transactions WHERE id = ?'),
    findByPaymentId: sqlite.prepare('SELECT * FROM transactions WHERE paymentId = ?'),
    findAll: sqlite.prepare('SELECT * FROM transactions ORDER BY createdAt DESC'),
    create: sqlite.prepare(`
      INSERT INTO transactions (id, paymentId, type, amount, currency, status, createdAt)
      VALUES (@id, @paymentId, @type, @amount, @currency, @status, @createdAt)
    `),
  },
  fraudChecks: {
    findByPaymentId: sqlite.prepare('SELECT * FROM fraud_checks WHERE paymentId = ? LIMIT 1'),
    findAll: sqlite.prepare('SELECT * FROM fraud_checks ORDER BY checkedAt DESC'),
    create: sqlite.prepare(`
      INSERT INTO fraud_checks (id, paymentId, riskScore, riskLevel, flags, recommendation, checkedAt)
      VALUES (@id, @paymentId, @riskScore, @riskLevel, @flags, @recommendation, @checkedAt)
    `),
  },
}

function rowToPayment(row: Record<string, unknown>): Payment {
  return { ...row, metadata: JSON.parse(row.metadata as string) } as Payment
}

function rowToFraudCheck(row: Record<string, unknown>): FraudCheck {
  return { ...row, flags: JSON.parse(row.flags as string) } as FraudCheck
}

export const db = {
  payments: {
    findById(id: string): Payment | undefined {
      const row = stmts.payments.findById.get(id) as Record<string, unknown> | undefined
      return row ? rowToPayment(row) : undefined
    },
    findByIdempotencyKey(key: string): Payment | undefined {
      const row = stmts.payments.findByIdempotencyKey.get(key) as Record<string, unknown> | undefined
      return row ? rowToPayment(row) : undefined
    },
    findAll(): Payment[] {
      const rows = stmts.payments.findAll.all() as Record<string, unknown>[]
      return rows.map(rowToPayment)
    },
    create(payment: Payment): Payment {
      stmts.payments.create.run({
        ...payment,
        metadata: JSON.stringify(payment.metadata),
      })
      return payment
    },
    update(id: string, updates: Partial<Payment>): Payment | undefined {
      stmts.payments.update.run({
        id,
        status: updates.status ?? null,
        updatedAt: new Date().toISOString(),
      })
      return this.findById(id)
    },
  },

  transactions: {
    findById(id: string): Transaction | undefined {
      return stmts.transactions.findById.get(id) as Transaction | undefined
    },
    findByPaymentId(paymentId: string): Transaction[] {
      return stmts.transactions.findByPaymentId.all(paymentId) as Transaction[]
    },
    findAll(): Transaction[] {
      return stmts.transactions.findAll.all() as Transaction[]
    },
    create(transaction: Transaction): Transaction {
      stmts.transactions.create.run(transaction)
      return transaction
    },
  },

  fraudChecks: {
    findByPaymentId(paymentId: string): FraudCheck | undefined {
      const row = stmts.fraudChecks.findByPaymentId.get(paymentId) as Record<string, unknown> | undefined
      return row ? rowToFraudCheck(row) : undefined
    },
    findAll(): FraudCheck[] {
      const rows = stmts.fraudChecks.findAll.all() as Record<string, unknown>[]
      return rows.map(rowToFraudCheck)
    },
    create(fraudCheck: FraudCheck): FraudCheck {
      stmts.fraudChecks.create.run({
        ...fraudCheck,
        flags: JSON.stringify(fraudCheck.flags),
      })
      return fraudCheck
    },
  },

  /** Reset all data — used in tests */
  _reset() {
    sqlite.exec('DELETE FROM payments; DELETE FROM transactions; DELETE FROM fraud_checks;')
  },
}
