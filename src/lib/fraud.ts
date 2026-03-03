import { v4 as uuidv4 } from 'uuid'
import { FraudCheck, FraudRiskLevel, ProcessPaymentRequest } from '@/types'
import { FRAUD_THRESHOLDS, FRAUD_SCORE_WEIGHTS } from './constants'

/**
 * Evaluates fraud risk for a payment request.
 * Returns a FraudCheck with risk score, level, and recommendation.
 */
export function evaluateFraudRisk(
  paymentId: string,
  request: ProcessPaymentRequest,
  recentPaymentCount: number
): FraudCheck {
  const flags: string[] = []
  let riskScore = 0

  // Flag 1: High-value transactions
  if (request.amount > 500) {
    riskScore += FRAUD_SCORE_WEIGHTS.HIGH_AMOUNT
    flags.push('high_value_transaction')
  }

  // Flag 2: Velocity check — too many recent payments from this customer
  if (recentPaymentCount > 3) {
    riskScore += FRAUD_SCORE_WEIGHTS.VELOCITY_CHECK
    flags.push('high_velocity')
  }

  // Flag 3: Digital wallet payments over $200 flagged as higher risk
  if (request.method === 'digital_wallet' && request.amount > 200) {
    riskScore += FRAUD_SCORE_WEIGHTS.INTERNATIONAL
    flags.push('digital_wallet_high_value')
  }

  // Flag 4: Odd-hours check (simulated — in prod this would use real timestamps)
  const hour = new Date().getHours()
  if (hour < 6 || hour > 23) {
    riskScore += FRAUD_SCORE_WEIGHTS.ODD_HOURS
    flags.push('odd_hours_transaction')
  }

  // Determine risk level based on score thresholds
  let riskLevel: FraudRiskLevel
  if (riskScore >= FRAUD_THRESHOLDS.LOW_RISK_MAX) {
    riskLevel = 'high'
  } else if (riskScore >= FRAUD_THRESHOLDS.MEDIUM_RISK_MAX) {
    riskLevel = 'critical'
  } else if (riskScore >= FRAUD_THRESHOLDS.HIGH_RISK_MAX) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'low'
  }

  let recommendation: 'approve' | 'review' | 'block'
  if (riskLevel === 'critical') {
    recommendation = 'block'
  } else if (riskLevel === 'high') {
    recommendation = 'review'
  } else {
    recommendation = 'approve'
  }

  return {
    id: uuidv4(),
    paymentId,
    riskScore,
    riskLevel,
    flags,
    recommendation,
    checkedAt: new Date().toISOString(),
  }
}
