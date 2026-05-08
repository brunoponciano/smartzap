import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function GET(req: NextRequest) {
  const authError = await requireSessionOrApiKey(req)
  if (authError) return authError

  const url = process.env.LEADBOX_SUPABASE_URL
  const key = process.env.LEADBOX_SUPABASE_KEY

  console.log('[leadbox/segments] env vars:', {
    LEADBOX_SUPABASE_URL: !!url,
    LEADBOX_SUPABASE_KEY: !!key,
  })

  if (!url || !key) {
    return NextResponse.json({ error: 'LeadBox não configurado' }, { status: 503 })
  }

  const targetUrl = `${url}/rest/v1/leadbox_segments?select=id,name,contact_count,created_at&order=created_at.desc`
  console.log('[leadbox/segments] fetching:', targetUrl)

  const res = await fetch(targetUrl, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })

  const responseText = await res.text()
  console.log('[leadbox/segments] supabase status:', res.status)
  console.log('[leadbox/segments] supabase response:', responseText.slice(0, 500))

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Erro ao buscar segmentos do LeadBox', status: res.status, detail: responseText.slice(0, 200) },
      { status: res.status }
    )
  }

  return NextResponse.json(JSON.parse(responseText))
}
