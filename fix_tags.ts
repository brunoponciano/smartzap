import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  // Find inbound messages with "Quero Participar"
  const { data: messages, error } = await supabase
    .from('inbox_messages')
    .select('conversation_id')
    .eq('direction', 'inbound')
    .ilike('content', '%Quero Participar%')

  if (error) {
    console.error('Error fetching messages:', error)
    return
  }

  console.log(`Found ${messages.length} messages.`)
  
  if (messages.length === 0) return

  const conversationIds = [...new Set(messages.map(m => m.conversation_id))]
  
  const { data: conversations, error: convError } = await supabase
    .from('inbox_conversations')
    .select('id, phone')
    .in('id', conversationIds)

  if (convError) {
    console.error('Error fetching conversations:', convError)
    return
  }
  
  console.log(`Found ${conversations.length} unique conversations.`)

  let contactsToUpdate = []

  for (const conv of conversations) {
    const from = conv.phone
    // Logic from webhook fix
    const clean = from.replace(/\D/g, '')
    const variants = new Set<string>([from, `+${from}`])
    
    // basic normalizer for tests
    let normalized = clean
    if (normalized.startsWith('55') || normalized.startsWith('0055')) {
       normalized = '+' + normalized.replace(/^00/, '')
    } else {
       normalized = '+55' + normalized
    }
    variants.add(normalized)

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
      
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        contactsToUpdate.push(c.id)
      }
    }
  }

  // Remove duplicates
  contactsToUpdate = [...new Set(contactsToUpdate)]
  console.log(`Found ${contactsToUpdate.length} contacts to update.`)
}

run()
