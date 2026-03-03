export const CURRENCY_USD = 'USD'

export const FRAUD_THRESHOLDS = {
  LOW_RISK_MAX: 30,
  MEDIUM_RISK_MAX: 60,
  HIGH_RISK_MAX: 85,
}

export const FRAUD_SCORE_WEIGHTS = {
  HIGH_AMOUNT: 15,
  NEW_CUSTOMER: 10,
  INTERNATIONAL: 20,
  VELOCITY_CHECK: 25,
  MISMATCHED_BILLING: 15,
  ODD_HOURS: 10,
}

export const MERCHANTS: Record<string, string> = {
  'merch_001': 'TechGadgets Pro',
  'merch_002': 'CloudSoft Solutions',
  'merch_003': 'GreenLeaf Market',
  'merch_004': 'QuickBite Delivery',
  'merch_005': 'StyleHub Fashion',
}
