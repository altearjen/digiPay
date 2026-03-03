'use client'

import { Payment, Transaction } from '@/types'

interface TransactionListProps {
  payments: Payment[]
  transactions: Transaction[]
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  flagged: 'bg-amber-100 text-amber-800',
}

export default function TransactionList({ payments, transactions }: TransactionListProps) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        No transactions yet. Process a payment to get started.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Merchant</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map(payment => {
              const paymentTxs = transactions.filter(t => t.paymentId === payment.id)
              return (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500">
                      {payment.id.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-4 py-3">{payment.merchantName}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${payment.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {payment.method.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[payment.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(payment.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
