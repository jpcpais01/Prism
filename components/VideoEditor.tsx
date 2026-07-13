'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadPresigned } from '@vercel/blob/client'
import Toast from '@/components/Toast'

const B = {
  full:    'rgba(59,130,246,1)',
  mid:     'rgba(59,130,246,0.5)',
  dim:     'rgba(59,130,246,0.18)',
  dimmer:  'rgba(59,130,246,0.1)',
  glow:    '0 0 28px rgba(59,130,246,0.22)',
  text:    'rgba(147,197,253,1)',
  border:  'rgba(59,130,246,0.45)',
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
})

const MAX_BYTES = 60 * 1024 * 1024
const MAX_DURATION_S = 10.5

const UploadIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const FilmIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2"/>
    <path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5"/>
  </svg>
)
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const CloseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

export default function VideoEditor() {
  const [srcUrl,   setSrcUrl]   = useState<string | null>(null)
  const [srcFile,  setSrcFile]  = useState<File | null>(null)
  const [prompt,   setPrompt]   = useState('')
  const [dragging, setDragging] = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [result,   setResult]   = useState<{ url: string; mime: string } | null>(null)
  const [err,      setErr]      = useState<string | null>(null)
  const [toast,    setToast]    = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) { setErr('Please upload a video file.'); return }
    if (file.size > MAX_BYTES) { setErr('Video must be under 60 MB.'); return }

    const url = URL.createObjectURL(file)
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => {
      if (probe.duration > MAX_DURATION_S) {
        setErr(`Video is ${probe.duration.toFixed(1)}s — clips must be 10 seconds or shorter for editing.`)
        URL.revokeObjectURL(url)
        return
      }
      setSrcUrl(url)
      setSrcFile(file)
      setResult(null)
      setErr(null)
    }
    probe.src = url
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const clear = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl)
    setSrcUrl(null); setSrcFile(null); setResult(null); setErr(null)
  }

  const submit = async () => {
    if (!srcFile || !prompt.trim() || busy) return
    setBusy(true); setErr(null)
    try {
      // Upload direct to Blob storage first — Vercel serverless functions cap
      // request bodies at 4.5MB, which most real video clips exceed.
      const { pathname: videoPathname } = await uploadPresigned(`videos/${Date.now()}-${srcFile.name}`, srcFile, {
        access: 'private',
        handleUploadUrl: '/api/video-upload-token',
        contentType: srcFile.type || 'video/mp4',
        multipart: true,
      })

      const r = await fetch('/api/edit-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPathname, prompt: prompt.trim() }),
      })
      let d: { error?: string; video?: string; mimeType?: string }
      try { d = await r.json() }
      catch { throw new Error('Something went wrong processing the video.') }
      if (!r.ok) throw new Error(d.error ?? 'Processing failed.')
      if (!d.video || !d.mimeType) throw new Error('No video returned.')

      const blob = await (await fetch(`data:${d.mimeType};base64,${d.video}`)).blob()
      setResult({ url: URL.createObjectURL(blob), mime: d.mimeType })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    if (!result) return
    try {
      const a = document.createElement('a')
      a.href = result.url
      a.download = `prism-video-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setToast('Video saved')
    } catch {
      setToast('Could not save video')
    }
  }

  const displayUrl = result?.url ?? srcUrl

  return (
    <div>
      <Toast message={toast} />
      <motion.section {...fadeUp(0.06)} className="mb-5">
        <input ref={fileRef} type="file" accept="video/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {!displayUrl ? (
          <div className="relative rounded-[24px] overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 cursor-pointer transition-all"
              style={{
                background: dragging ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.025)',
                border: dragging ? `2px solid ${B.border}` : '2px dashed rgba(255,255,255,0.1)',
                boxShadow: dragging ? B.glow : 'none',
                borderRadius: 24,
              }}>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: B.dimmer, color: B.full }}>
                  <UploadIcon />
                </div>
                <div className="absolute inset-0 rounded-2xl animate-pulse-ring" />
              </div>
              <div className="text-center px-6">
                <p className="text-white/70 font-semibold text-[15px] mb-1">
                  {dragging ? 'Release to upload' : 'Drop your video here'}
                </p>
                <p className="text-white/30 text-sm">or tap to browse</p>
              </div>
              <p className="text-[10px] text-white/18 tracking-wider uppercase">
                MP4 · MOV · WEBM · up to 10s · 60 MB
              </p>
            </div>
          </div>
        ) : (
          <div className="relative rounded-[24px] overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
            {/* object-contain (not cover) + no forced aspect ratio — a forced crop box was
                what made differently-shaped results (e.g. 16:9 into a portrait box) look wrong */}
            <video
              key={displayUrl}
              src={displayUrl}
              className="block w-full max-h-[65vh] mx-auto"
              style={{ objectFit: 'contain' }}
              controls
              playsInline
              loop
            />

            <button onClick={() => fileRef.current?.click()}
              className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/75 transition-colors hover:text-white z-10"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              Change
            </button>

            <div className="absolute top-3 right-3 z-10">
              <button onClick={clear}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)' }}>
                <CloseIcon />
              </button>
            </div>

            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden z-20"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
                <div className="relative flex items-center justify-center mb-5">
                  <div className="absolute w-16 h-16 rounded-full animate-ring-pulse"
                    style={{ border: '1px solid rgba(147,197,253,0.4)' }} />
                  <div className="absolute w-16 h-16 rounded-full animate-ring-pulse"
                    style={{ border: '1px solid rgba(147,197,253,0.3)', animationDelay: '1.3s' }} />
                  <div className="absolute w-16 h-16 rounded-full"
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }} />
                  <div className="w-7 h-7 rounded-full animate-spin-elegant"
                    style={{
                      border: '1.5px solid transparent',
                      borderTopColor: 'rgba(147,197,253,0.8)',
                      borderRightColor: 'rgba(147,197,253,0.2)',
                    }} />
                </div>
                <span className="text-[10px] font-semibold tracking-[0.35em] uppercase"
                  style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Editing
                </span>
              </div>
            )}
          </div>
        )}

        {/* Save lives outside the video entirely — the native <video controls> scrubber
            bar swallows clicks in its own region regardless of z-index, so an overlay
            button there is never reliably clickable. */}
        {result && (
          <button onClick={download}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-[16px] text-sm font-bold transition-colors"
            style={{ background: B.dim, border: `1.5px solid ${B.border}`, color: B.text }}>
            <DownloadIcon />Save Edited Video
          </button>
        )}
      </motion.section>

      <motion.section {...fadeUp(0.12)} className="mb-4">
        <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/30 mb-2.5 px-0.5">Describe the Edit</p>
        <textarea
          placeholder="e.g. turn this into a golden hour sunset, add gentle falling snow, make the mirror ripple like liquid…"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          className="w-full rounded-[16px] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none resize-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          onFocus={e => (e.target.style.borderColor = B.border)}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
      </motion.section>

      <AnimatePresence>
        {err && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 px-4 py-3 rounded-[14px] flex items-start gap-3 text-red-300/85"
            style={{ background: 'rgba(255,60,60,0.09)', border: '1px solid rgba(255,60,60,0.2)' }}>
            <span className="flex-shrink-0 mt-0.5 text-red-400"><AlertIcon /></span>
            <p className="text-sm leading-snug">{err}</p>
            <button onClick={() => setErr(null)} className="flex-shrink-0 ml-auto text-red-400/60 hover:text-red-400 transition-colors">
              <CloseIcon size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div {...fadeUp(0.16)} className="mb-5">
        <button
          onClick={submit}
          disabled={!srcFile || !prompt.trim() || busy}
          className="w-full py-4 rounded-[18px] text-base font-black tracking-wide relative overflow-hidden transition-all disabled:cursor-not-allowed"
          style={{
            background: srcFile && prompt.trim() && !busy
              ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%)'
              : 'rgba(255,255,255,0.07)',
            backgroundSize: '200% 200%',
            boxShadow: srcFile && prompt.trim() && !busy ? '0 4px 32px rgba(59,130,246,0.35)' : 'none',
            opacity: !srcFile || !prompt.trim() ? 0.45 : 1,
            animation: srcFile && prompt.trim() && !busy ? 'gradient-move 4s ease infinite' : 'none',
          }}>
          <span className="relative flex items-center justify-center gap-2.5 text-white">
            {busy ? <span>Editing…</span> : (<><FilmIcon /><span>Edit Video</span></>)}
          </span>
        </button>
      </motion.div>
    </div>
  )
}
