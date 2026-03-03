'use client'

import { Payment, Transaction, FraudCheck } from '@/types'

interface StatsBarProps {
  payments: Payment[]
  transactions: Transaction[]
  fraudChecks: FraudCheck[]
}

export default function StatsBar({ payments, transactions, fraudChecks }: StatsBarProps) {
  const totalVolume = transactions
    .filter(t => t.status === 'settled')
    .reduce((sum, t) => sum + t.amount, 0)

  const flaggedCount = payments.filter(p => p.status === 'flagged').length
  const completedCount = payments.filter(p => p.status === 'completed').length
  const highRiskCount = fraudChecks.filter(
    fc => fc.riskLevel === 'high' || fc.riskLevel === 'critical'
  ).length

  const stats = [
    {
      label: 'Total Volume',
      value: `$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      color: 'text-gray-900',
    },
    {
      label: 'Completed',
      value: completedCount.toString(),
      color: 'text-green-600',
    },
    {
      label: 'Flagged',
      value: flaggedCount.toString(),
      color: flaggedCount > 0 ? 'text-amber-600' : 'text-gray-900',
    },
    {
      label: 'High Risk Alerts',
      value: highRiskCount.toString(),
      color: highRiskCount > 0 ? 'text-red-600' : 'text-gray-900',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{stat.label}</p>
          <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
