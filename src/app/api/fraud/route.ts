import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const fraudChecks = db.fraudChecks.findAll()
  return NextResponse.json({ fraudChecks })
}
