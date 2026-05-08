import { NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyApiKey(req)
  if (authError) return authError

  const { id } = await params
  const url = process.env.LEADBOX_SUPABASE_URL
  const key = process.env.LEADBOX_SUPABASE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'LeadBox não configurado' }, { status: 503 })
  }

  const res = await fetch(
    `${url}/rest/v1/leadbox_segments?id=eq.${encodeURIComponent(id)}&select=phones`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Erro ao buscar phones do LeadBox' }, { status: res.status })
  }

  const rows: Array<{ phones: string[] }> = await res.json()
  const phones: string[] = rows.flatMap((r) => r.phones ?? [])
  return NextResponse.json({ phones })
}
