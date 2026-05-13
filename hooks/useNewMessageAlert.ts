'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'
import { playComplete } from './useSoundFX'

export interface AlertState {
  active: boolean
  contactName: string
  preview: string
  conversationId: string
}

const INITIAL_STATE: AlertState = {
  active: false,
  contactName: '',
  preview: '',
  conversationId: '',
}

export function useNewMessageAlert() {
  const [alert, setAlert] = useState<AlertState>(INITIAL_STATE)
  const pathname = usePathname()
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const titleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const originalTitleRef = useRef<string>('')
  const stopAlertRef = useRef<() => void>(() => {})

  const stopAlert = useCallback(() => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current)
      soundIntervalRef.current = null
    }
    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current)
      titleIntervalRef.current = null
      document.title = originalTitleRef.current
    }
    setAlert(INITIAL_STATE)
  }, [])

  // Keep stopAlertRef in sync so Realtime callback can always call latest stopAlert
  useEffect(() => { stopAlertRef.current = stopAlert }, [stopAlert])

  const dismiss = useCallback(() => {
    stopAlert()
  }, [stopAlert])

  // Stop alert when user navigates to the conversation
  useEffect(() => {
    if (!alert.active) return

    const conversationParam = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('conversation')
      : null
    const isViewingConversation =
      (pathname?.includes('/atendimento') && conversationParam === alert.conversationId) ||
      pathname?.includes(`/inbox/${alert.conversationId}`)

    if (isViewingConversation) {
      stopAlert()
    }
  }, [pathname, searchParams, alert.active, alert.conversationId, stopAlert])

  // Start sound and tab blinking when alert becomes active
  useEffect(() => {
    if (!alert.active) return

    // Save original title
    originalTitleRef.current = document.title

    // Immediate sound + loop every 4s (wrapped to handle autoplay block)
    const safePlay = () => { try { playComplete() } catch { /* suspended ctx */ } }
    safePlay()
    soundIntervalRef.current = setInterval(safePlay, 4000)

    // Tab blinking every 1s (start toggled=false so first tick shows alert title immediately)
    let toggled = false
    titleIntervalRef.current = setInterval(() => {
      document.title = toggled ? originalTitleRef.current : '⚡ Nova mensagem!'
      toggled = !toggled
    }, 1000)

    return () => {
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current)
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current)
        document.title = originalTitleRef.current
      }
    }
  }, [alert.active])

  // Subscribe to Supabase Realtime
  useEffect(() => {
    const supabase = getSupabaseBrowser()
    if (!supabase) return

    const channel = supabase
      .channel('new-inbound-messages-alert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_messages',
          filter: 'direction=eq.inbound',
        },
        async (payload) => {
          const msg = payload.new as {
            conversation_id: string
            content?: string
          }

          const conversationId = msg.conversation_id
          const preview = msg.content ?? 'Nova mensagem'

          // Buscar nome do contato via join contacts
          let contactName = 'Contato'
          try {
            if (supabase) {
              const { data } = await supabase
                .from('inbox_conversations')
                .select('contacts(name)')
                .eq('id', conversationId)
                .single()
              const raw = data?.contacts
              const contactsData = Array.isArray(raw) ? raw[0] : raw
              contactName = (contactsData as { name?: string } | null)?.name ?? 'Contato'
            }
          } catch {
            contactName = 'Contato'
          }

          // Check if user is already viewing this conversation
          const currentConversationParam = new URLSearchParams(window.location.search).get('conversation')
          const isViewingNow =
            (window.location.pathname.includes('/atendimento') && currentConversationParam === conversationId) ||
            window.location.pathname.includes(`/inbox/${conversationId}`)

          if (isViewingNow) return

          // Stop any existing alert before starting new one (handles rapid successive messages)
          stopAlertRef.current()
          setAlert({
            active: true,
            contactName,
            preview,
            conversationId,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { alert, dismiss }
}
