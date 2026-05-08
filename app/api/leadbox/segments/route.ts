import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyApiKey, unauthorizedResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req)
  if (!auth.valid) return unauthorizedResponse(auth.error)

  const url = process.env.LEADBOX_SUPABASE_URL
  const key = process.env.LEADBOX_SUPABASE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'LeadBox não configurado' }, { status: 503 })
  }

  const res = await fetch(
    `${url}/rest/v1/leadbox_segments?select=id,name,contact_count,created_at&order=created_at.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Erro ao buscar segmentos do LeadBox' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
