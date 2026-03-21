import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// =============================================================================
// PATCH - Atualizar automação
// =============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Banco não configurado' }, { status: 500 })
    }

    const { id } = await params
    const body = await request.json()
    const update: Record<string, unknown> = {}

    if (body.trigger_text !== undefined) update.trigger_text = body.trigger_text.trim()
    if (body.response_message !== undefined) update.response_message = body.response_message.trim()
    if (body.is_active !== undefined) update.is_active = body.is_active

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('auto_replies')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma automação com esse gatilho' }, { status: 409 })
      }
      console.error('[Automations] Erro ao atualizar:', error)
      return NextResponse.json({ error: 'Erro ao atualizar automação' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Automations] Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Remover automação
// =============================================================================

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Banco não configurado' }, { status: 500 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('auto_replies')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Automations] Erro ao deletar:', error)
      return NextResponse.json({ error: 'Erro ao remover automação' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[Automations] Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
