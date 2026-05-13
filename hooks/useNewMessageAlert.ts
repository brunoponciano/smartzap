'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const titleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const originalTitleRef = useRef<string>('')

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

  const dismiss = useCallback(() => {
    stopAlert()
  }, [stopAlert])

  // Stop alert when user navigates to the conversation
  useEffect(() => {
    if (!alert.active) return

    const conversationParam = searchParams?.get('conversation')
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

    // Immediate sound + loop every 4s
    playComplete()
    soundIntervalRef.current = setInterval(() => {
      playComplete()
    }, 4000)

    // Tab blinking every 1s
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
            body?: string
            contact_name?: string
          }

          const conversationId = msg.conversation_id
          const preview = msg.body ?? 'Nova mensagem'

          // Try to get contact name from message, fallback to conversation
          let contactName = msg.contact_name ?? ''
          if (!contactName) {
            try {
              const supabaseClient = getSupabaseBrowser()
              if (supabaseClient) {
                const { data } = await supabaseClient
                  .from('inbox_conversations')
                  .select('contact_name')
                  .eq('id', conversationId)
                  .single()
                contactName = data?.contact_name ?? 'Contato'
              }
            } catch {
              contactName = 'Contato'
            }
          }

          // Check if user is already viewing this conversation
          const currentConversationParam = new URLSearchParams(window.location.search).get('conversation')
          const isViewingNow =
            (window.location.pathname.includes('/atendimento') && currentConversationParam === conversationId) ||
            window.location.pathname.includes(`/inbox/${conversationId}`)

          if (isViewingNow) return

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
