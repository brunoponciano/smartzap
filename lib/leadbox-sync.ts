type LeadBoxAction = 'add_tag' | 'remove_tag' | 'delete_contact'

interface SyncParams {
  action: LeadBoxAction
  phone: string
  tag?: string
}

/**
 * Notifica o LeadBox sobre mudanças de tag ou deleção de contato.
 * Best-effort: nunca lança exceção.
 */
export async function syncToLeadBox({ action, phone, tag }: SyncParams): Promise<void> {
  const webhookUrl = process.env.LEADBOX_WEBHOOK_URL
  const secret = process.env.LEADBOX_SYNC_SECRET

  if (!webhookUrl || !secret) return

  // LeadBox não aceita o "+" no telefone
  const normalizedPhone = phone.startsWith('+') ? phone.slice(1) : phone

  const payload: Record<string, string> = { action, phone: normalizedPhone }
  if (tag) payload.tag = tag

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-smartzap-secret': secret,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      console.warn(`[leadbox-sync] LeadBox retornou status não-ok: ${res.status} (action=${action}, phone=${normalizedPhone})`)
    }
  } catch (err) {
    console.error('[leadbox-sync] Erro de rede ao notificar LeadBox:', err)
  }
}
