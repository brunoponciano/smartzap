/**
 * Sincronização de tags: LeadBox → SmartZap
 *
 * Busca apenas leads que têm tags no LeadBox e atualiza o SmartZap via /api/crm-sync.
 *
 * Uso:
 *   npx tsx scripts/sync-tags.ts           # dry-run
 *   npx tsx scripts/sync-tags.ts --confirm  # executa
 */

import { createClient } from '@supabase/supabase-js'

const SMARTZAP_API_URL = process.env.SMARTZAP_URL || 'http://localhost:3000'
const SYNC_SECRET = process.env.SYNC_SECRET
const LEADBOX_SUPABASE_URL = process.env.LEADBOX_SUPABASE_URL
const LEADBOX_SUPABASE_KEY = process.env.LEADBOX_SUPABASE_KEY

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
const confirmed = process.argv.includes('--confirm')

async function main() {
  if (!SYNC_SECRET) {
    console.error('❌  SYNC_SECRET não definido')
    process.exit(1)
  }
  if (!LEADBOX_SUPABASE_URL || !LEADBOX_SUPABASE_KEY) {
    console.error('❌  LEADBOX_SUPABASE_URL e LEADBOX_SUPABASE_KEY são obrigatórios')
    process.exit(1)
  }

  if (isProduction && !confirmed) {
    console.error('❌  Ambiente de produção detectado. Passe --confirm para executar.')
    process.exit(1)
  }

  const leadbox = createClient(LEADBOX_SUPABASE_URL, LEADBOX_SUPABASE_KEY)

  // Batch: todas as tags e o mapeamento lead→tags de uma vez (sem N+1)
  const { data: allTags, error: tagsError } = await leadbox
    .from('crm_tags')
    .select('id, name')

  if (tagsError) {
    console.error('❌  Erro ao buscar crm_tags:', tagsError.message)
    process.exit(1)
  }

  const tagNameById = new Map<string, string>((allTags ?? []).map(t => [t.id, t.name]))

  const { data: allLeadTags, error: leadTagsError } = await leadbox
    .from('crm_lead_tags')
    .select('lead_id, tag_id')

  if (leadTagsError) {
    console.error('❌  Erro ao buscar crm_lead_tags:', leadTagsError.message)
    process.exit(1)
  }

  // Monta mapa lead_id → [tag names] e o set de lead_ids que têm tags
  const tagsByLeadId = new Map<string, string[]>()
  for (const lt of allLeadTags ?? []) {
    const tagName = tagNameById.get(lt.tag_id)
    if (!tagName) continue
    const existing = tagsByLeadId.get(lt.lead_id) ?? []
    existing.push(tagName)
    tagsByLeadId.set(lt.lead_id, existing)
  }

  const leadIdsWithTags = new Set(tagsByLeadId.keys())
  console.log(`🏷️   Lead IDs com tags no LeadBox: ${leadIdsWithTags.size}`)

  // Busca todos os leads paginando e filtra no cliente os que têm tags
  const PAGE_SIZE = 1000
  const leadsWithTags: { id: string; email: string; name: string; phone: string; tags: string[] }[] = []
  let offset = 0

  while (true) {
    const { data, error } = await leadbox
      .from('crm_leads')
      .select('id, email, name, phone')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('❌  Erro ao buscar leads:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) break

    for (const lead of data) {
      const tags = tagsByLeadId.get(lead.id)
      if (tags && tags.length > 0) leadsWithTags.push({ ...lead, tags })
    }

    console.log(`   Buscando... offset ${offset + data.length} (${leadsWithTags.length} com tags até agora)`)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  console.log(`📋  Total de leads com tags a sincronizar: ${leadsWithTags.length}`)

  if (!confirmed) {
    console.log('⚠️   Dry-run: passe --confirm para executar a sincronização.')
    return
  }

  let success = 0
  let failed = 0

  for (const lead of leadsWithTags) {
    try {
      const res = await fetch(`${SMARTZAP_API_URL}/api/crm-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': SYNC_SECRET,
          'x-sync-origin': 'leadbox',
        },
        body: JSON.stringify({
          email: lead.email,
          name: lead.name,
          phone: lead.phone,
          tags: lead.tags,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.warn(`⚠️   Falhou (${lead.email}):`, body)
        failed++
      } else {
        success++
      }
    } catch (err) {
      console.error(`❌  Erro de rede (${lead.email}):`, err)
      failed++
    }
  }

  console.log(`\n✅  Sincronização de tags concluída`)
  console.log(`   Sucesso : ${success}`)
  console.log(`   Falhas  : ${failed}`)
  console.log(`   Total   : ${leadsWithTags.length}`)
}

main()
