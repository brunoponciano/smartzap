import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { contactDb } from '@/lib/supabase-db'
import { validateBody, formatZodErrors } from '@/lib/api-validation'
import { ContactStatus } from '@/types'
import { normalizePhoneNumber } from '@/lib/phone-formatter'
import { getSupabaseAdmin } from '@/lib/supabase'
import { executeWorkflowDirect } from '@/lib/builder/workflow-executor-direct'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TagWebhookSchema = z.object({
  lead_name: z.string().min(1),
  lead_phone: z.string().min(1),
  lead_email: z.string().email().optional().nullable(),
  tag_name: z.string().min(1),
})

/**
 * POST /api/crm-sync/tag
 * Recebe webhook do LeadBox (trigger Postgres) com dados do lead e tag já resolvidos.
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

    const validation = validateBody(TagWebhookSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const { lead_name, lead_phone, lead_email, tag_name } = validation.data

    const normalized = normalizePhoneNumber(lead_phone)
    if (!normalized) {
      return NextResponse.json({ error: 'Número de telefone inválido', phone: lead_phone }, { status: 422 })
    }

    const contact = await contactDb.upsertMergeTagsByPhone(
      {
        name: lead_name,
        phone: normalized,
        email: lead_email ?? undefined,
        status: ContactStatus.OPT_IN,
        tags: [],
      },
      [tag_name]
    )

    const admin = getSupabaseAdmin()
    if (admin) {
      const { data: versions } = await admin
        .from('workflow_versions')
        .select('id, workflow_id, nodes, edges')
        .eq('status', 'published')

      for (const version of versions || []) {
        const triggerNode = (version.nodes || []).find(
          (n: any) =>
            n.data?.type === 'trigger' &&
            n.data?.config?.triggerType === 'Tag' &&
            n.data?.config?.tagName?.trim().toLowerCase() === tag_name.trim().toLowerCase()
        )
        if (!triggerNode) continue

        const executionId = nanoid()
        await admin.from('workflow_runs').insert({
          id: executionId,
          workflow_id: version.workflow_id,
          version_id: version.id,
          status: 'running',
          trigger_type: 'Tag',
          input: { contact, tag: tag_name },
          started_at: new Date().toISOString(),
        })

        try {
          await executeWorkflowDirect({
            workflowId: version.workflow_id,
            phone: String(contact.phone || ''),
            triggerInput: { contact, tag: tag_name, source: 'crm-sync-tag' },
          })
          await admin.from('workflow_runs')
            .update({ status: 'success', completed_at: new Date().toISOString() })
            .eq('id', executionId)
        } catch (err) {
          console.error(`[crm-sync/tag] Falha ao executar workflow ${version.workflow_id}:`, err)
          await admin.from('workflow_runs')
            .update({ status: 'failed', completed_at: new Date().toISOString() })
            .eq('id', executionId)
        }
      }
    }

    return NextResponse.json({ ok: true, contact }, { status: 200 })
  } catch (error) {
    console.error('[crm-sync/tag] Erro ao processar webhook:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
