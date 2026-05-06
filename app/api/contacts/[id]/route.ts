import { NextRequest, NextResponse } from 'next/server'
import { contactDb } from '@/lib/supabase-db'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { syncToLeadBox } from '@/lib/leadbox-sync'
import { waitUntil } from '@vercel/functions'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/contacts/[id]
 * Get a single contact
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const { id } = await params
    const contact = await contactDb.getById(id)

    if (!contact) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(contact, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0'
      }
    })
  } catch (error) {
    console.error('Failed to fetch contact:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar contato', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/contacts/[id]
 * Update a contact
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const { id } = await params
    const body = await request.json()
    console.log('[patch-contact] body=', JSON.stringify(body))
    const contact = await contactDb.update(id, body)

    if (!contact) {
      return NextResponse.json(
        { error: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    const phone = contact.phone || body.phone
    if (phone && Array.isArray(body.tags)) {
      waitUntil(
        Promise.all(body.tags.map((tag: string) =>
          syncToLeadBox({ action: 'add_tag', phone, tag })
        ))
      )
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Failed to update contact:', error)
    return NextResponse.json(
      { error: 'Falha ao atualizar contato', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/contacts/[id]
 * Delete a contact
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const { id } = await params
    const contact = await contactDb.getById(id)
    await contactDb.delete(id)
    if (contact?.phone) {
      syncToLeadBox({ action: 'delete_contact', phone: contact.phone }).catch(() => {})
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete contact:', error)
    return NextResponse.json(
      { error: 'Falha ao deletar contato', details: (error as Error).message },
      { status: 500 }
    )
  }
}
