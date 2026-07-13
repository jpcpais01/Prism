import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { get, del } from '@vercel/blob'

export const maxDuration = 300

const FILE_POLL_INTERVAL_MS = 3000
const FILE_POLL_MAX_ATTEMPTS = 40 // ~2 minutes

type InteractionContentPart = {
  type: string
  data?: string
  uri?: string
  mime_type?: string
  text?: string
}
type InteractionStep = {
  type: string
  content?: InteractionContentPart[]
  error?: { message?: string }
}

export async function POST(req: NextRequest) {
  try {
    const { videoPathname, prompt } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured. Add it to your Vercel environment variables.' },
        { status: 401 }
      )
    }

    if (typeof videoPathname !== 'string' || !videoPathname.startsWith('videos/') || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'A video and an edit prompt are required.' }, { status: 400 })
    }

    // Video bytes arrive via Vercel Blob (client-uploaded) to stay under the
    // platform's 4.5MB request-body limit for the request that hits this route.
    // This is a private store, so reads need the SDK's auth (OIDC), not a plain fetch().
    const stored = await get(videoPathname, { access: 'private' })
    if (!stored || stored.statusCode !== 200) {
      return NextResponse.json({ error: 'Could not read the uploaded video.' }, { status: 400 })
    }
    const inputMimeType = stored.blob.contentType || 'video/mp4'
    const videoBlob = new Blob([await new Response(stored.stream).arrayBuffer()], { type: inputMimeType })

    const ai = new GoogleGenAI({ apiKey })
    const model = process.env.GEMINI_VIDEO_MODEL ?? 'gemini-omni-flash-preview'

    // 1. Upload the source video to the Files API
    let uploaded = await ai.files.upload({
      file: videoBlob,
      config: { mimeType: inputMimeType },
    })

    // Best-effort cleanup of the Blob copy now that Gemini has its own copy
    del(videoPathname).catch(() => {})

    // 2. Poll until the file finishes processing
    let attempts = 0
    while (uploaded.state === 'PROCESSING') {
      if (attempts++ >= FILE_POLL_MAX_ATTEMPTS) {
        return NextResponse.json({ error: 'Video processing timed out. Try a shorter clip.' }, { status: 504 })
      }
      await new Promise(r => setTimeout(r, FILE_POLL_INTERVAL_MS))
      uploaded = await ai.files.get({ name: uploaded.name! })
    }

    if (uploaded.state === 'FAILED' || !uploaded.uri) {
      return NextResponse.json({ error: 'Video upload failed to process.' }, { status: 500 })
    }

    // 3. Gemini rejects both `duration` and `aspect_ratio` in response_format for
    // edit tasks (confirmed via live 400s: "... cannot be set in response format
    // for edit task") — an edited clip keeps the source's length and shape, and
    // neither is configurable, so response_format only carries type/delivery.
    const responseFormat = { type: 'video' as const, delivery: 'inline' as const }

    // 4. Run the edit interaction
    const interaction = await ai.interactions.create({
      model,
      input: [
        { type: 'video', uri: uploaded.uri, mime_type: uploaded.mimeType ?? 'video/mp4' },
        { type: 'text', text: prompt },
      ],
      generation_config: {
        video_config: { task: 'edit' },
      },
      response_modalities: ['video'],
      response_format: responseFormat,
    })

    // Best-effort cleanup of the uploaded source file
    ai.files.delete({ name: uploaded.name! }).catch(() => {})

    if (interaction.status === 'failed') {
      return NextResponse.json({ error: 'The model could not complete this edit.' }, { status: 500 })
    }

    const steps = (interaction.steps ?? []) as InteractionStep[]
    let videoPart: InteractionContentPart | undefined
    let textFallback: string | undefined
    for (const step of steps) {
      if (step.type !== 'model_output') continue
      if (step.error?.message) textFallback = step.error.message
      for (const part of step.content ?? []) {
        if (part.type === 'video') videoPart = part
        if (part.type === 'text' && part.text) textFallback = part.text
      }
    }

    if (!videoPart) {
      return NextResponse.json(
        { error: textFallback ?? 'The model did not return a video. Try a different prompt or clip.' },
        { status: 500 }
      )
    }

    const mimeType = videoPart.mime_type ?? 'video/mp4'

    if (videoPart.data) {
      return NextResponse.json({ video: videoPart.data, mimeType })
    }

    if (videoPart.uri) {
      const dl = await fetch(videoPart.uri, { headers: { 'x-goog-api-key': apiKey } })
      if (!dl.ok) {
        return NextResponse.json({ error: 'Failed to download the generated video.' }, { status: 502 })
      }
      const buf = Buffer.from(await dl.arrayBuffer())
      return NextResponse.json({ video: buf.toString('base64'), mimeType })
    }

    return NextResponse.json({ error: 'The model did not return a usable video.' }, { status: 500 })
  } catch (e) {
    console.error('Edit-video route error:', e)
    const msg = e instanceof Error ? e.message : 'Internal server error.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
