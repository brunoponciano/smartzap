import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateBody, formatZodErrors } from '@/lib/api-validation'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PushTagsSchema = z.object({
  email: z.string().email('Email inválido'),
  tags: z.array(z.string().max(50)).max(20),
})

/**
 * POST /api/crm-sync/push
 * Notifica o LeadBox quando tags de um contato mudam no SmartZap.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(request)
    if (auth) return auth

    const body = await request.json()

    const validation = validateBody(PushTagsSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const { email, tags } = validation.data

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, email')
      .eq('email', email)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
    }

    const webhookUrl = process.env.LEADBOX_WEBHOOK_URL
    const syncSecret = process.env.SYNC_SECRET

    if (!webhookUrl || !syncSecret) {
      console.error('[crm-sync/push] LEADBOX_WEBHOOK_URL ou SYNC_SECRET não configurados')
      return NextResponse.json({ error: 'Integração LeadBox não configurada' }, { status: 503 })
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': syncSecret,
          'x-sync-origin': 'smartzap',
        },
        body: JSON.stringify({ email, tags }),
      })

      if (!res.ok) {
        console.warn('[crm-sync/push] LeadBox retornou status não-ok:', res.status)
      }
    } catch (networkError) {
      // Não derruba a aplicação — a sincronização é best-effort
      console.error('[crm-sync/push] Erro de rede ao notificar LeadBox:', networkError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[crm-sync/push] Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
