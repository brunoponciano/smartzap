import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// =============================================================================
// GET - Listar todas as automações
// =============================================================================

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Banco não configurado' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('auto_replies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Automations] Erro ao buscar:', error)
      return NextResponse.json({ error: 'Erro ao buscar automações' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Automations] Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// =============================================================================
// POST - Criar nova automação
// =============================================================================

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Banco não configurado' }, { status: 500 })
    }

    const body = await request.json()
    const trigger_text = body.trigger_text?.trim()
    const response_message = body.response_message?.trim()

    if (!trigger_text) {
      return NextResponse.json({ error: 'Texto do gatilho é obrigatório' }, { status: 400 })
    }
    if (!response_message) {
      return NextResponse.json({ error: 'Mensagem de resposta é obrigatória' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('auto_replies')
      .insert({ trigger_text, response_message })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma automação com esse gatilho' }, { status: 409 })
      }
      console.error('[Automations] Erro ao criar:', error)
      return NextResponse.json({ error: 'Erro ao criar automação' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[Automations] Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
