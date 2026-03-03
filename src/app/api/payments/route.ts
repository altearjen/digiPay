import { NextRequest, NextResponse } from 'next/server'
import { processPayment } from '@/lib/paymentService'
import { ProcessPaymentRequest } from '@/types'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body: ProcessPaymentRequest = await request.json()

    if (!body.idempotencyKey) {
      return NextResponse.json(
        { success: false, error: 'idempotencyKey is required' },
        { status: 400 }
      )
    }

    const result = await processPayment(body)

    if (!result.success) {
      return NextResponse.json(result, { status: 422 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const payments = db.payments.findAll()
  return NextResponse.json({ payments })
}
