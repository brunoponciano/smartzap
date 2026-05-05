import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { contactDb } from '@/lib/supabase-db'
import { validateBody, formatZodErrors } from '@/lib/api-validation'
import { ContactStatus } from '@/types'
import { normalizePhoneNumber } from '@/lib/phone-formatter'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SupabaseWebhookSchema = z.object({
  type: z.string(),
  table: z.string(),
  record: z.object({
    lead_id: z.string().uuid(),
    tag_id: z.string().uuid(),
  }),
})

/**
 * POST /api/crm-sync/tag
 * Recebe webhook do Supabase (INSERT em crm_lead_tags) e sincroniza a tag no SmartZap.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-sync-secret')
    if (!process.env.SYNC_SECRET || secret !== process.env.SYNC_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (request.headers.get('x-sync-origin') === 'smartzap') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const body = await request.json()

    const validation = validateBody(SupabaseWebhookSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const { lead_id, tag_id } = validation.data.record

    const leadboxUrl = process.env.LEADBOX_SUPABASE_URL
    const leadboxKey = process.env.LEADBOX_SUPABASE_KEY

    if (!leadboxUrl || !leadboxKey) {
      console.error('[crm-sync/tag] LEADBOX_SUPABASE_URL ou LEADBOX_SUPABASE_KEY não configurados')
      return NextResponse.json({ error: 'Integração LeadBox não configurada' }, { status: 503 })
    }

    const leadbox = createClient(leadboxUrl, leadboxKey)

    const [{ data: lead, error: leadError }, { data: tag, error: tagError }] = await Promise.all([
      leadbox.from('crm_leads').select('name, email, phone').eq('id', lead_id).single(),
      leadbox.from('crm_tags').select('name').eq('id', tag_id).single(),
    ])

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado no LeadBox', lead_id }, { status: 404 })
    }

    if (tagError || !tag) {
      return NextResponse.json({ error: 'Tag não encontrada no LeadBox', tag_id }, { status: 404 })
    }

    const normalized = normalizePhoneNumber(lead.phone)
    if (!normalized) {
      return NextResponse.json({ error: 'Número de telefone inválido', phone: lead.phone }, { status: 422 })
    }

    const contact = await contactDb.upsertMergeTagsByPhone(
      {
        name: lead.name,
        phone: normalized,
        email: lead.email ?? undefined,
        status: ContactStatus.OPT_IN,
        tags: [],
      },
      [tag.name]
    )

    return NextResponse.json({ ok: true, contact }, { status: 200 })
  } catch (error) {
    console.error('[crm-sync/tag] Erro ao processar webhook:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
