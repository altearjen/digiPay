export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'flagged'

export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet'

export type FraudRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface Payment {
  id: string
  idempotencyKey: string
  amount: number
  currency: string
  status: PaymentStatus
  method: PaymentMethod
  merchantId: string
  merchantName: string
  customerId: string
  customerEmail: string
  description: string
  metadata: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  paymentId: string
  type: 'charge' | 'refund' | 'chargeback'
  amount: number
  currency: string
  status: 'settled' | 'pending' | 'reversed'
  createdAt: string
}

export interface FraudCheck {
  id: string
  paymentId: string
  riskScore: number
  riskLevel: FraudRiskLevel
  flags: string[]
  recommendation: 'approve' | 'review' | 'block'
  checkedAt: string
}

export interface ProcessPaymentRequest {
  idempotencyKey: string
  amount: number
  currency: string
  method: PaymentMethod
  merchantId: string
  customerId: string
  customerEmail: string
  description: string
}

export interface ProcessPaymentResponse {
  success: boolean
  payment?: Payment
  transaction?: Transaction
  fraudCheck?: FraudCheck
  error?: string
}
