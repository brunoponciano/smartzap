'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Zap,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Page, PageDescription, PageHeader, PageTitle } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// =============================================================================
// Types
// =============================================================================

interface AutoReply {
  id: string
  trigger_text: string
  response_message: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// API helpers
// =============================================================================

async function fetchAutoReplies(): Promise<AutoReply[]> {
  const res = await fetch('/api/automations')
  if (!res.ok) throw new Error('Erro ao buscar automações')
  return res.json()
}

async function createAutoReply(data: { trigger_text: string; response_message: string }): Promise<AutoReply> {
  const res = await fetch('/api/automations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Erro ao criar')
  return result
}

async function updateAutoReply(id: string, data: Partial<AutoReply>): Promise<AutoReply> {
  const res = await fetch(`/api/automations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Erro ao atualizar')
  return result
}

async function deleteAutoReply(id: string): Promise<void> {
  const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao remover')
}

// =============================================================================
// AutoReplyCard
// =============================================================================

function AutoReplyCard({
  autoReply,
  onToggle,
  onDelete,
  onUpdate,
  isDeleting,
}: {
  autoReply: AutoReply
  onToggle: (active: boolean) => void
  onDelete: () => void
  onUpdate: (data: { trigger_text: string; response_message: string }) => void
  isDeleting: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTrigger, setEditTrigger] = useState(autoReply.trigger_text)
  const [editMessage, setEditMessage] = useState(autoReply.response_message)

  const handleSave = () => {
    if (!editTrigger.trim()) { toast.error('Gatilho é obrigatório'); return }
    if (!editMessage.trim()) { toast.error('Mensagem é obrigatória'); return }
    onUpdate({ trigger_text: editTrigger.trim(), response_message: editMessage.trim() })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTrigger(autoReply.trigger_text)
    setEditMessage(autoReply.response_message)
    setIsEditing(false)
  }

  return (
    <div className={`bg-zinc-900 border rounded-xl p-5 ${autoReply.is_active ? 'border-zinc-800' : 'border-zinc-700/50 opacity-60'}`}>
      {isEditing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Gatilho (texto do botão)</Label>
            <Input
              value={editTrigger}
              onChange={(e) => setEditTrigger(e.target.value)}
              placeholder="Ex: Assistir Aula"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Mensagem de resposta</Label>
            <Textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              placeholder="Mensagem que será enviada automaticamente..."
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Check size={14} className="mr-1.5" />
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X size={14} className="mr-1.5" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium">
                <Zap size={12} />
                {autoReply.trigger_text}
              </span>
              {!autoReply.is_active && (
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Inativo</span>
              )}
            </div>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
              {autoReply.response_message}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggle(!autoReply.is_active)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title={autoReply.is_active ? 'Desativar' : 'Ativar'}
            >
              {autoReply.is_active
                ? <ToggleRight size={18} className="text-primary-400" />
                : <ToggleLeft size={18} />
              }
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
              title="Remover"
            >
              {isDeleting
                ? <Loader2 size={15} className="animate-spin" />
                : <Trash2 size={15} />
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// CreateForm
// =============================================================================

function CreateForm({ onSuccess }: { onSuccess: () => void }) {
  const [trigger, setTrigger] = useState('')
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createAutoReply,
    onSuccess: () => {
      toast.success('Automação criada!')
      setTrigger('')
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['auto-replies'] })
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trigger.trim()) { toast.error('Gatilho é obrigatório'); return }
    if (!message.trim()) { toast.error('Mensagem de resposta é obrigatória'); return }
    mutation.mutate({ trigger_text: trigger.trim(), response_message: message.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="text-base font-medium flex items-center gap-2">
        <Plus size={16} className="text-primary-400" />
        Nova Automação
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor="trigger">Gatilho</Label>
        <Input
          id="trigger"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="Ex: Assistir Aula"
          className="max-w-sm"
        />
        <p className="text-xs text-zinc-500">
          Texto exato do botão que o lead vai clicar no template
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Mensagem de resposta</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Mensagem que será enviada automaticamente quando o lead clicar no botão..."
          rows={4}
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={mutation.isPending || !trigger.trim() || !message.trim()}>
        {mutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Criando...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Criar Automação
          </>
        )}
      </Button>
    </form>
  )
}

// =============================================================================
// Main Page
// =============================================================================

export default function AutomationsPage() {
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: autoReplies = [], isLoading } = useQuery({
    queryKey: ['auto-replies'],
    queryFn: fetchAutoReplies,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AutoReply> }) => updateAutoReply(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-replies'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAutoReply,
    onSuccess: () => {
      toast.success('Automação removida')
      queryClient.invalidateQueries({ queryKey: ['auto-replies'] })
      setDeletingId(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setDeletingId(null)
    },
  })

  const handleDelete = (id: string, trigger: string) => {
    if (confirm(`Remover automação para "${trigger}"?`)) {
      setDeletingId(id)
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <PageTitle>Automação</PageTitle>
              <PageDescription>
                Envie respostas automáticas quando o lead clicar em um botão de template
              </PageDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus size={14} className="mr-1.5" />
            Nova Automação
          </Button>
        </div>
      </PageHeader>

      <div className="max-w-3xl space-y-6">
        {/* Info */}
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-zinc-200 mb-1">Como funciona</h4>
              <p className="text-sm text-zinc-400">
                Quando um lead clica em um botão de template (ex: <span className="text-zinc-200">"Assistir Aula"</span>),
                o SmartZap recebe esse texto como resposta e envia automaticamente a mensagem configurada aqui.
                O texto do gatilho deve ser idêntico ao texto do botão no template.
              </p>
            </div>
          </div>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <CreateForm onSuccess={() => setShowCreateForm(false)} />
        )}

        {/* List */}
        {autoReplies.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
            <Zap size={40} className="mx-auto text-zinc-600 mb-3" />
            <h3 className="text-base font-medium mb-1">Nenhuma automação</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Crie uma automação para responder automaticamente quando o lead clicar em um botão
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus size={14} className="mr-1.5" />
              Criar Primeira Automação
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 font-medium px-1">
              {autoReplies.length} automação{autoReplies.length !== 1 ? 'ões' : ''}
            </p>
            {autoReplies.map((autoReply) => (
              <AutoReplyCard
                key={autoReply.id}
                autoReply={autoReply}
                onToggle={(active) => updateMutation.mutate({ id: autoReply.id, data: { is_active: active } })}
                onDelete={() => handleDelete(autoReply.id, autoReply.trigger_text)}
                onUpdate={(data) => updateMutation.mutate({ id: autoReply.id, data })}
                isDeleting={deletingId === autoReply.id}
              />
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
