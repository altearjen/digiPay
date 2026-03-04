import { NextRequest, NextResponse } from 'next/server'
import { processPayment, getCachedPaymentResult } from '@/lib/paymentService'
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

    // Check if this idempotency key has already been processed
    const cachedResult = getCachedPaymentResult(body.idempotencyKey)
    if (cachedResult) {
      console.log(`Idempotency cache hit for key ${body.idempotencyKey}`)
      const status = cachedResult.success ? 200 : 422
      return NextResponse.json(cachedResult, { status })
    }

    // Process the payment (skip the redundant idempotency lookup in the service layer)
    const result = await processPayment(body, { skipIdempotencyCheck: true })

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
