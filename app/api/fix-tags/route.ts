import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizePhoneNumber } from '@/lib/phone-formatter'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase admin not configured' })
    }

    // Buscar mensagens com "Quero Participar"
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('direction', 'inbound')
      .ilike('content', '%Quero Participar%')

    if (error) throw error
    if (!messages || messages.length === 0) {
      return NextResponse.json({ message: 'Nenhuma mensagem encontrada.' })
    }

    const conversationIds = [...new Set(messages.map(m => m.conversation_id))]

    const { data: conversations, error: convError } = await supabase
      .from('inbox_conversations')
      .select('id, phone')
      .in('id', conversationIds)

    if (convError) throw convError

    let contactsToUpdate: string[] = []

    for (const conv of conversations || []) {
      const from = conv.phone
      const normalizedForTag = normalizePhoneNumber(from)
      const variants = new Set<string>([from, `+${from}`, normalizedForTag])

      const clean = from.replace(/\D/g, '')
      if (clean.startsWith('55') && clean.length >= 12 && clean.length <= 13) {
        const ddd = clean.substring(2, 4)
        const num = clean.substring(4)
        if (num.length === 8) {
          variants.add(`55${ddd}9${num}`)
          variants.add(`+55${ddd}9${num}`)
        } else if (num.length === 9 && num.startsWith('9')) {
          const without9 = num.substring(1)
          variants.add(`55${ddd}${without9}`)
          variants.add(`+55${ddd}${without9}`)
        }
      }

      const orCondition = Array.from(variants).map(p => `phone.eq.${p}`).join(',')

      const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('id, tags')
        .or(orCondition)

      if (contactError) throw contactError

      if (contacts && contacts.length > 0) {
        for (const c of contacts) {
          const currentTags = Array.isArray(c.tags) ? c.tags.map(t => String(t)) : []
          if (!currentTags.includes('quero_participar')) {
            contactsToUpdate.push(c.id)
          }
        }
      }
    }

    contactsToUpdate = [...new Set(contactsToUpdate)]

    if (contactsToUpdate.length > 0) {
      const { error: rpcError } = await supabase.rpc('bulk_update_contact_tags', {
        p_ids: contactsToUpdate,
        p_tags_to_add: ['quero_participar'],
        p_tags_to_remove: [],
      })
      if (rpcError) throw rpcError

      return NextResponse.json({ 
        success: true, 
        message: `Corrigido! Adicionamos a tag 'quero_participar' retroativamente a ${contactsToUpdate.length} contatos.`
      })
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'Todos os contatos que mandaram a mensagem já possuem a tag.' 
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
