/**
 * Migração única: LeadBox → SmartZap
 *
 * Uso:
 *   npx tsx scripts/migrate-leads.ts --confirm
 *
 * Sem --confirm, roda em dry-run e apenas exibe o total de leads encontrados.
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

  const { data: leads, error } = await leadbox
    .from('crm_leads')
    .select('email, name, phone, tags')

  if (error) {
    console.error('❌  Erro ao buscar leads do LeadBox:', error.message)
    process.exit(1)
  }

  console.log(`📋  Total de leads encontrados: ${leads?.length ?? 0}`)

  if (!confirmed) {
    console.log('⚠️   Dry-run: passe --confirm para executar a migração.')
    return
  }

  let success = 0
  let failed = 0

  for (const lead of leads ?? []) {
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
          tags: lead.tags ?? [],
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

  console.log(`\n✅  Migração concluída`)
  console.log(`   Sucesso : ${success}`)
  console.log(`   Falhas  : ${failed}`)
  console.log(`   Total   : ${(leads?.length ?? 0)}`)
}

main()
