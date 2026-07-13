import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'video/mp4', 'video/quicktime', 'video/webm',
          'video/x-msvideo', 'video/3gpp', 'video/x-flv',
        ],
        maximumSizeInBytes: 60 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    })
    return NextResponse.json(json)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload token generation failed.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
