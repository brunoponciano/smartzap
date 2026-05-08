'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { leadboxService, LeadBoxSegment } from '@/services/leadboxService'
import { LeadBoxSheetProps } from './types'

export function LeadBoxSheet({ recipientSource, onClose, onApplyPhones }: LeadBoxSheetProps) {
  const isDisabled = recipientSource === 'test'
  const [selectedSegment, setSelectedSegment] = useState<LeadBoxSegment | null>(null)
  const [isLoadingPhones, setIsLoadingPhones] = useState(false)

  const segmentsQuery = useQuery({
    queryKey: ['leadboxSegments'],
    queryFn: leadboxService.listSegments,
    staleTime: 2 * 60 * 1000,
  })

  const handleApply = async () => {
    if (!selectedSegment) return
    setIsLoadingPhones(true)
    try {
      const phones = await leadboxService.getPhones(selectedSegment.id)
      onApplyPhones(phones)
    } finally {
      setIsLoadingPhones(false)
    }
  }

  return (
    <div className="bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] rounded-2xl p-5 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--ds-text-primary)]">Segmentos do LeadBox</p>
          <p className="text-xs text-[var(--ds-text-muted)]">
            Selecione um segmento para importar os destinatários.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {segmentsQuery.isLoading && (
          <div className="flex items-center gap-2 text-xs text-[var(--ds-text-muted)] py-4 justify-center">
            <Loader2 size={14} className="animate-spin" />
            Carregando segmentos…
          </div>
        )}

        {segmentsQuery.isError && (
          <p className="text-xs text-red-400 py-4 text-center">
            Não foi possível carregar os segmentos do LeadBox.
          </p>
        )}

        {segmentsQuery.data?.map((segment) => (
          <button
            key={segment.id}
            type="button"
            disabled={isDisabled}
            onClick={() => setSelectedSegment(segment)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${
              selectedSegment?.id === segment.id
                ? 'border-primary-500 bg-primary-600/10 text-[var(--ds-text-primary)]'
                : 'border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-bg-hover)]'
            } disabled:opacity-50`}
          >
            <span className="font-medium truncate pr-3">{segment.name}</span>
            {segment.contact_count != null && (
              <span className="text-xs text-[var(--ds-text-muted)] shrink-0">
                {segment.contact_count.toLocaleString('pt-BR')} contatos
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]"
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="bg-primary-600 text-white hover:bg-primary-500"
          disabled={isDisabled || !selectedSegment || isLoadingPhones}
          onClick={handleApply}
        >
          {isLoadingPhones ? (
            <><Loader2 size={14} className="animate-spin mr-2" />Importando…</>
          ) : (
            'Aplicar segmento'
          )}
        </Button>
      </div>
    </div>
  )
}
