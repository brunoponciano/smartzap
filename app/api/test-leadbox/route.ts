import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    webhookUrl: process.env.LEADBOX_WEBHOOK_URL ?? 'não configurada',
    secret: process.env.LEADBOX_SYNC_SECRET ? 'presente' : 'não configurado',
  })
}
