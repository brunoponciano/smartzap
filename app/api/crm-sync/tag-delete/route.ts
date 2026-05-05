import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { contactDb } from '@/lib/supabase-db'
import { validateBody, formatZodErrors } from '@/lib/api-validation'
import { normalizePhoneNumber } from '@/lib/phone-formatter'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TagDeleteSchema = z.object({
  lead_phone: z.string().min(1),
  tag_name: z.string().min(1),
})

/**
 * POST /api/crm-sync/tag-delete
 * Recebe webhook do LeadBox e remove uma tag do contato no SmartZap.
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

    const validation = validateBody(TagDeleteSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const { lead_phone, tag_name } = validation.data

    const normalized = normalizePhoneNumber(lead_phone)
    if (!normalized) {
      return NextResponse.json({ error: 'Número de telefone inválido', phone: lead_phone }, { status: 422 })
    }

    const contact = await contactDb.getByPhone(normalized)
    if (!contact) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'contato não encontrado' })
    }

    await contactDb.bulkUpdateTags([contact.id], [], [tag_name])

    return NextResponse.json({ ok: true, contact_id: contact.id }, { status: 200 })
  } catch (error) {
    console.error('[crm-sync/tag-delete] Erro ao processar webhook:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
