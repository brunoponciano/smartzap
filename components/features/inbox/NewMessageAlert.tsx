'use client'

import { useRouter } from 'next/navigation'
import { X, MessageCircle } from 'lucide-react'
import { useNewMessageAlert } from '@/hooks/useNewMessageAlert'

export function NewMessageAlert() {
  const { alert, dismiss } = useNewMessageAlert()
  const router = useRouter()

  if (!alert.active) return null

  function handleOpen() {
    router.push(`/atendimento?conversation=${alert.conversationId}`)
    dismiss()
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border border-emerald-500/40 bg-zinc-900/95 backdrop-blur animate-pulse-subtle max-w-sm w-full"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <MessageCircle size={18} className="text-emerald-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{alert.contactName}</p>
        <p className="text-xs text-zinc-400 truncate">{alert.preview}</p>
      </div>

      <button
        onClick={handleOpen}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-zinc-900 transition-colors"
      >
        Abrir
      </button>

      <button
        onClick={dismiss}
        aria-label="Dispensar alerta"
        className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}
