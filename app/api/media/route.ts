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

    // Fetch the underlying protected file from Meta Graph
    const metaResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    })

    if (!metaResponse.ok) {
      console.error('[Media Proxy] Meta Graph Error:', await metaResponse.text())
      return new NextResponse('Failed to fetch media from Meta', { status: metaResponse.status })
    }

    // Pull MIME type
    const contentType = metaResponse.headers.get('content-type') || 'application/octet-stream'
    // Pull buffer directly to stream
    const buffer = await metaResponse.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // Optional: you can add aggressive caching headers here since WhatsApp media URLs 
        // are generally immutable by hash ID
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[Media Proxy] Internal Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
