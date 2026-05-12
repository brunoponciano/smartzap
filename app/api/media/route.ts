import { NextRequest, NextResponse } from 'next/server'
import { getWhatsAppCredentials } from '@/lib/whatsapp-credentials'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url')
    if (!url) {
      return new NextResponse('URL is required', { status: 400 })
    }

    const credentials = await getWhatsAppCredentials()
    if (!credentials?.accessToken) {
      return new NextResponse('Unauthorized: Missing WhatsApp Token', { status: 401 })
    }

    let mediaUrl = url

    // Se não começa com http, é um Media ID do WhatsApp — resolve para URL real
    if (!url.startsWith('http')) {
      const resolveRes = await fetch(`https://graph.facebook.com/v24.0/${url}`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      })
      if (!resolveRes.ok) {
        console.error('[Media Proxy] Falha ao resolver Media ID:', await resolveRes.text())
        return new NextResponse('Failed to resolve media ID', { status: resolveRes.status })
      }
      const resolved = await resolveRes.json() as { url?: string }
      if (!resolved.url) {
        return new NextResponse('Media ID did not return a URL', { status: 502 })
      }
      mediaUrl = resolved.url
    }

    // Fetch the underlying protected file from Meta Graph
    const metaResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    })

    if (!metaResponse.ok) {
      console.error('[Media Proxy] Meta Graph Error:', await metaResponse.text())
      return new NextResponse('Failed to fetch media from Meta', { status: metaResponse.status })
    }

    const contentType = metaResponse.headers.get('content-type') || 'application/octet-stream'
    const buffer = await metaResponse.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[Media Proxy] Internal Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
