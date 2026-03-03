'use client'

import { useState, useEffect, useCallback } from 'react'
import { Payment, Transaction, FraudCheck } from '@/types'
import PaymentForm from '@/components/PaymentForm'
import TransactionList from '@/components/TransactionList'
import FraudAlerts from '@/components/FraudAlerts'
import StatsBar from '@/components/StatsBar'

export default function Dashboard() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fraudChecks, setFraudChecks] = useState<FraudCheck[]>([])
  const [activeTab, setActiveTab] = useState<'payments' | 'fraud'>('payments')

  const fetchData = useCallback(async () => {
    const [paymentsRes, txRes, fraudRes] = await Promise.all([
      fetch('/api/payments'),
      fetch('/api/transactions'),
      fetch('/api/fraud'),
    ])
    const paymentsData = await paymentsRes.json()
    const txData = await txRes.json()
    const fraudData = await fraudRes.json()

    setPayments(paymentsData.payments || [])
    setTransactions(txData.transactions || [])
    setFraudChecks(fraudData.fraudChecks || [])
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">DigiPay</h1>
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                Dashboard
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Payment Processing Platform
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <StatsBar
          payments={payments}
          transactions={transactions}
          fraudChecks={fraudChecks}
        />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-1">
            <PaymentForm onSuccess={fetchData} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'payments'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Transactions ({transactions.length})
              </button>
              <button
                onClick={() => setActiveTab('fraud')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'fraud'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Fraud Alerts ({fraudChecks.filter(fc => fc.riskLevel !== 'low').length})
              </button>
            </div>

            {activeTab === 'payments' ? (
              <TransactionList payments={payments} transactions={transactions} />
            ) : (
              <FraudAlerts fraudChecks={fraudChecks} payments={payments} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
