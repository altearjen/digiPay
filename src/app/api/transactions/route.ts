import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const transactions = db.transactions.findAll()
  return NextResponse.json({ transactions })
}
