import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, mimeType, prompt, aspectRatio, resolution, apiKey: clientKey } = body

    const apiKey = clientKey || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key found. Add your Google AI Studio key in the settings or set GEMINI_API_KEY in Vercel environment variables.' },
        { status: 401 }
      )
    }

    if (!image || !prompt) {
      return NextResponse.json({ error: 'Image and prompt are required.' }, { status: 400 })
    }

    const aspectNote =
      aspectRatio === 'auto'
        ? 'Preserve the original aspect ratio of the image exactly.'
        : `Output the image with ${aspectRatio} aspect ratio.`

    const resMap: Record<string, string> = { '1k': '1024', '2k': '2048', '4k': '4096' }
    const resNote = `Target output resolution: ~${resMap[resolution] ?? '2048'}px on the longest side.`

    const fullPrompt = `${prompt}\n\n${aspectNote} ${resNote}`

    const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-image-preview'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: fullPrompt },
              { inline_data: { mime_type: mimeType ?? 'image/jpeg', data: image } },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      const msg = (err as { error?: { message?: string } }).error?.message ?? `Gemini API error ${geminiRes.status}`
      return NextResponse.json({ error: msg }, { status: geminiRes.status })
    }

    const data = await geminiRes.json()
    const parts = (data.candidates?.[0]?.content?.parts ?? []) as Array<{
      text?: string
      inline_data?: { mime_type: string; data: string }
    }>

    const imgPart = parts.find(p => p.inline_data?.mime_type?.startsWith('image/'))
    if (!imgPart?.inline_data) {
      const textFallback = parts.find(p => p.text)?.text
      return NextResponse.json(
        { error: textFallback ?? 'The model did not return an image. Try a different style or image.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      image: imgPart.inline_data.data,
      mimeType: imgPart.inline_data.mime_type,
    })
  } catch (e) {
    console.error('Edit route error:', e)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
