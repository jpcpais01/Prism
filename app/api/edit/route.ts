import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// Gemini can return either snake_case (REST) or camelCase (SDK) field names
type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }
  | { inlineData:  { mimeType:  string; data: string } }

function extractImage(parts: GeminiPart[]): { data: string; mime: string } | null {
  for (const p of parts) {
    if ('inline_data' in p && p.inline_data.mime_type.startsWith('image/')) {
      return { data: p.inline_data.data, mime: p.inline_data.mime_type }
    }
    if ('inlineData' in p && p.inlineData.mimeType.startsWith('image/')) {
      return { data: p.inlineData.data, mime: p.inlineData.mimeType }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, mimeType, prompt, aspectRatio, resolution } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured. Add it to your Vercel environment variables.' },
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

    const fullPrompt = aspectNote ? `${prompt}\n\n${aspectNote}` : prompt

    const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-preview-image-generation'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
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
    const parts: GeminiPart[] = data.candidates?.[0]?.content?.parts ?? []

    // Log structure to Vercel logs for debugging
    console.log('Gemini parts:', JSON.stringify(parts.map(p => {
      if ('inline_data' in p) return { type: 'inline_data', mime: p.inline_data.mime_type, bytes: p.inline_data.data.length }
      if ('inlineData'  in p) return { type: 'inlineData',  mime: p.inlineData.mimeType,   bytes: p.inlineData.data.length  }
      return { type: 'text', preview: ('text' in p ? p.text.slice(0, 80) : '') }
    })))

    const img = extractImage(parts)
    if (!img) {
      const textPart = parts.find((p): p is { text: string } => 'text' in p)
      return NextResponse.json(
        { error: textPart?.text ?? 'The model did not return an image. Try a different style or image.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ image: img.data, mimeType: img.mime })
  } catch (e) {
    console.error('Edit route error:', e)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
