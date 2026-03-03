'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { PaymentMethod } from '@/types'
import { MERCHANTS } from '@/lib/constants'

interface PaymentFormProps {
  onSuccess?: () => void
}

export default function PaymentForm({ onSuccess }: PaymentFormProps) {
  const [amount, setAmount] = useState('')
  const [merchantId, setMerchantId] = useState('merch_001')
  const [method, setMethod] = useState<PaymentMethod>('credit_card')
  const [email, setEmail] = useState('customer@example.com')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)

    // BUG: idempotency key is generated once and captured in the closure, but
    // setLoading(true) doesn't take effect until after the await, so rapid
    // clicks each enter this function before `loading` flips to true.
    // Each click generates its own unique idempotency key, so the server
    // treats every request as a distinct payment — causing duplicate charges.
    const key = uuidv4()

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: key,
          amount: parseFloat(amount),
          currency: 'USD',
          method,
          merchantId,
          customerId: 'cust_001',
          customerEmail: email,
          description: `Payment to ${MERCHANTS[merchantId]}`,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResult({ success: true, message: `Payment of $${amount} processed successfully` })
        onSuccess?.()
      } else {
        setResult({ success: false, message: data.error || 'Payment failed' })
        onSuccess?.()
      }
    } catch {
      setResult({ success: false, message: 'Network error — please try again' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">New Payment</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (USD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Merchant
          </label>
          <select
            value={merchantId}
            onChange={e => setMerchantId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {Object.entries(MERCHANTS).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            value={method}
            onChange={e => setMethod(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="digital_wallet">Digital Wallet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-brand-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Process Payment
        </button>
      </form>

      {result && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            result.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {result.message}
        </div>
      )}

    </div>
  )
}
