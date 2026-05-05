import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { contactDb } from '@/lib/supabase-db'
import { validateBody, formatZodErrors } from '@/lib/api-validation'
import { ContactStatus } from '@/types'
import { normalizePhoneNumber } from '@/lib/phone-formatter'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const LeadBoxWebhookSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  origin: z.string().optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
})

/**
 * POST /api/crm-sync
 * Recebe webhook do LeadBox e faz upsert do contato no SmartZap.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-sync-secret')
    if (!process.env.SYNC_SECRET || secret !== process.env.SYNC_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Anti-loop: ignora eventos originados pelo próprio SmartZap
    if (request.headers.get('x-sync-origin') === 'smartzap') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const body = await request.json()

    // Supabase Database Webhooks encapsulam o payload em { record: { ... } }
    const payload = body?.record ?? body

    const validation = validateBody(LeadBoxWebhookSchema, payload)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const { email, name, phone, tags } = validation.data

    const normalized = normalizePhoneNumber(phone)
    if (!normalized) {
      return NextResponse.json(
        { error: 'Número de telefone inválido', phone },
        { status: 422 }
      )
    }

    const contact = await contactDb.upsertMergeTagsByPhone(
      {
        name,
        phone: normalized,
        email: email ?? undefined,
        status: ContactStatus.OPT_IN,
        tags: [],
      },
      tags
    )

    return NextResponse.json({ ok: true, contact }, { status: 200 })
  } catch (error) {
    console.error('[crm-sync] Erro ao processar webhook:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
