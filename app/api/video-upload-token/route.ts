import { NextRequest, NextResponse } from 'next/server'
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client'
import { issueSignedToken } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadPresignedBody

  try {
    const json = await handleUploadPresigned({
      body,
      request: req,
      getSignedToken: async pathname => {
        const token = await issueSignedToken({
          pathname,
          operations: ['put'],
          allowedContentTypes: [
            'video/mp4', 'video/quicktime', 'video/webm',
            'video/x-msvideo', 'video/3gpp', 'video/x-flv',
          ],
          maximumSizeInBytes: 60 * 1024 * 1024,
        })
        return { token }
      },
    })
    return NextResponse.json(json)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload token generation failed.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
