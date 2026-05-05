import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { contactDb } from '@/lib/supabase-db'
import { validateBody, formatZodErrors } from '@/lib/api-validation'
import { normalizePhoneNumber } from '@/lib/phone-formatter'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ContactDeleteSchema = z.object({
  lead_phone: z.string().min(1),
})

/**
 * POST /api/crm-sync/contact-delete
 * Recebe webhook do LeadBox e deleta o contato no SmartZap pelo telefone.
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

    const validation = validateBody(ContactDeleteSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const { lead_phone } = validation.data

    const normalized = normalizePhoneNumber(lead_phone)
    if (!normalized) {
      return NextResponse.json({ error: 'Número de telefone inválido', phone: lead_phone }, { status: 422 })
    }

    const contact = await contactDb.getByPhone(normalized)
    if (!contact) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'contato não encontrado' })
    }

    await contactDb.delete(contact.id)

    return NextResponse.json({ ok: true, contact_id: contact.id }, { status: 200 })
  } catch (error) {
    console.error('[crm-sync/contact-delete] Erro ao processar webhook:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
