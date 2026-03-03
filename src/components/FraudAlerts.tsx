'use client'

import { FraudCheck, Payment } from '@/types'

interface FraudAlertsProps {
  fraudChecks: FraudCheck[]
  payments: Payment[]
}

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export default function FraudAlerts({ fraudChecks, payments }: FraudAlertsProps) {
  const alerts = fraudChecks.filter(fc => fc.riskLevel !== 'low')

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        No fraud alerts. All transactions look clean.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map(check => {
        const payment = payments.find(p => p.id === check.paymentId)
        return (
          <div
            key={check.id}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      riskColors[check.riskLevel]
                    }`}
                  >
                    {check.riskLevel.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    Score: {check.riskScore}/100
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      check.recommendation === 'block'
                        ? 'text-red-600'
                        : check.recommendation === 'review'
                        ? 'text-amber-600'
                        : 'text-green-600'
                    }`}
                  >
                    {check.recommendation.toUpperCase()}
                  </span>
                </div>
                {payment && (
                  <p className="text-sm text-gray-700">
                    ${payment.amount.toFixed(2)} to {payment.merchantName} via{' '}
                    {payment.method.replace('_', ' ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {check.flags.map(flag => (
                    <span
                      key={flag}
                      className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs"
                    >
                      {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(check.checkedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
