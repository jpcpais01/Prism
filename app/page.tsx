'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Types ─────────────────────────────────────────────── */
type AR  = 'auto' | '1:1' | '3:4' | '4:3' | '2:3' | '3:2' | '9:16' | '16:9'
type Res = '1k' | '2k' | '4k'
interface CustomStyle { id: string; name: string; prompt: string }
interface HistoryItem  { id: string; img: string; mime: string; ts: number }

/* ─── Blue accent token ─────────────────────────────────── */
const B = {
  full:    'rgba(59,130,246,1)',
  mid:     'rgba(59,130,246,0.5)',
  dim:     'rgba(59,130,246,0.18)',
  dimmer:  'rgba(59,130,246,0.1)',
  glow:    '0 0 28px rgba(59,130,246,0.22)',
  glowLg:  '0 0 50px rgba(59,130,246,0.25), 0 20px 60px rgba(0,0,0,0.7)',
  text:    'rgba(147,197,253,1)',   // blue-300
  border:  'rgba(59,130,246,0.45)',
}

/* ─── Presets ───────────────────────────────────────────── */
const PRESETS = [
  {
    id: 'high-quality',
    name: 'High Quality',
    desc: 'Professional DSLR remaster',
    prompt: "Remaster as a professional DSLR photograph. Enhance dynamic range, color grading, contrast, and sharpness. Improve lighting consistency and reduce noise. Preserve all original subjects, composition, and scene details exactly, don't add anything. Photorealistic, editorial quality.",
    img: '/HighQuality_Style.jpg',
    from: '#f6d365', to: '#fda085',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    desc: 'Movie-quality film look',
    prompt: "Transform into a cinematic movie still with professional color grading. Apply anamorphic lens quality, rich shadows, subtle film grain, and dramatic highlights. Preserve all subjects and composition exactly. Epic, atmospheric, Hollywood quality.",
    img: '/Cinematic_Style.jpg',
    from: '#667eea', to: '#764ba2',
  },
  {
    id: 'vivid',
    name: 'Vivid',
    desc: 'Vibrant, punchy colors',
    prompt: "Enhance with vivid, vibrant color grading. Dramatically boost saturation and contrast while keeping the image natural. Make every color pop. Preserve all subjects and composition exactly. Eye-catching, vibrant, magazine-quality.",
    img: '/Vivid_Style.jpg',
    from: '#f093fb', to: '#f5576c',
  },
  {
    id: 'macro',
    name: 'Macro',
    desc: 'Ultra-sharp close-up detail',
    prompt: "Remaster as a professional macro photograph. Dramatically enhance fine surface textures, micro-details, and sharpness. Apply a shallow depth-of-field with a smooth, creamy bokeh background that isolates the subject. Boost clarity and micro-contrast so every minute detail pops. Preserve the original subject and composition exactly. Studio-quality macro, nature or product photography aesthetic.",
    img: '/Macro_Style.jpg',
    from: '#43e97b', to: '#38f9d7',
  },
] as const

const RATIOS: { value: AR; label: string; px: number; py: number }[] = [
  { value: 'auto', label: 'Auto', px: 14, py: 14 },
  { value: '1:1',  label: '1:1',  px: 14, py: 14 },
  { value: '3:4',  label: '3:4',  px: 11, py: 14 },
  { value: '4:3',  label: '4:3',  px: 14, py: 11 },
  { value: '2:3',  label: '2:3',  px:  9, py: 14 },
  { value: '3:2',  label: '3:2',  px: 14, py:  9 },
  { value: '9:16', label: '9:16', px:  8, py: 14 },
  { value: '16:9', label: '16:9', px: 14, py:  8 },
]

/* ─── Animation helper ──────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0  },
  transition: { delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
})

/* ─── Icons ─────────────────────────────────────────────── */
const UploadIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const WandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/>
    <path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/>
    <path d="M3 21l9-9"/><path d="M12.2 6.2 11 5"/>
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
const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const PenIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
)

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function PrismApp() {
  const [src,        setSrc]        = useState<string | null>(null)
  const [srcMime,    setSrcMime]    = useState('image/jpeg')
  const [style,      setStyle]      = useState<string>('high-quality')
  const [customSel,  setCustomSel]  = useState<string | null>(null)
  const [ar,         setAr]         = useState<AR>('auto')
  const [res,        setRes]        = useState<Res>('2k')
  const [dragging,   setDragging]   = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [result,     setResult]     = useState<{ img: string; mime: string } | null>(null)
  const [err,        setErr]        = useState<string | null>(null)
  const [customs,    setCustoms]    = useState<CustomStyle[]>([])
  const [showAdd,    setShowAdd]    = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newPrompt,  setNewPrompt]  = useState('')
  const [extraEdits, setExtraEdits] = useState('')
  const [viewIdx,    setViewIdx]    = useState(0)   // 0=original 1=result
  const [lightbox,   setLightbox]   = useState(false)
  const [history,    setHistory]    = useState<HistoryItem[]>([])
  const [historyView,setHistoryView]= useState<HistoryItem | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const c = localStorage.getItem('prism-customs')
      if (c) setCustoms(JSON.parse(c))
    } catch {}
  }, [])

/* lock body scroll when any lightbox is open */
  useEffect(() => {
    document.body.style.overflow = (lightbox || !!historyView) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox, historyView])

  /* close lightbox on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightbox(false); setHistoryView(null) }
      if (e.key === 'ArrowLeft'  && result) setViewIdx(0)
      if (e.key === 'ArrowRight' && result) setViewIdx(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setErr('Please upload an image file.'); return }
    if (file.size > 20 * 1024 * 1024)   { setErr('Image must be under 20 MB.');   return }
    const reader = new FileReader()
    reader.onload = e => {
      setSrc(e.target?.result as string)
      setSrcMime(file.type)
      setResult(null)
      setViewIdx(0)
      setErr(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const activePrompt = () => {
    const base = customSel
      ? customs.find(c => c.id === customSel)?.prompt ?? ''
      : PRESETS.find(p => p.id === style)?.prompt ?? ''
    return extraEdits.trim() ? `${base}\n\n${extraEdits.trim()}` : base
  }

  const compressImage = (dataUrl: string, maxPx = 2048): Promise<{ base64: string; mime: string }> =>
    new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const MAX = maxPx
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX }
          else                { width  = Math.round((width  / height) * MAX); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const out = canvas.toDataURL('image/jpeg', 0.88)
        resolve({ base64: out.split(',')[1], mime: 'image/jpeg' })
      }
      img.src = dataUrl
    })

  const transform = async () => {
    if (!src || busy) return
    setBusy(true); setErr(null)
    try {
      const maxPx = res === '1k' ? 1024 : res === '4k' ? 4096 : 2048
      const { base64, mime } = await compressImage(src, maxPx)
      const r = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: mime, prompt: activePrompt(), aspectRatio: ar, resolution: res }),
      })
      let d: { error?: string; image?: string; mimeType?: string }
      try { d = await r.json() }
      catch { throw new Error('Image may be too large. Try a smaller photo.') }
      if (!r.ok) throw new Error(d.error ?? 'Processing failed.')
      if (!d.image || !d.mimeType) throw new Error('No image returned.')
      const fullImg = `data:${d.mimeType};base64,${d.image}`
      setResult({ img: fullImg, mime: d.mimeType })
      setViewIdx(1)
      setHistory(prev => [{ id: `h${Date.now()}`, img: fullImg, mime: d.mimeType, ts: Date.now() }, ...prev])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const saveCustom = () => {
    if (!newName.trim() || !newPrompt.trim()) return
    const ns: CustomStyle = { id: `c${Date.now()}`, name: newName.trim(), prompt: newPrompt.trim() }
    const next = [...customs, ns]
    setCustoms(next)
    localStorage.setItem('prism-customs', JSON.stringify(next))
    setCustomSel(ns.id); setStyle('')
    setShowAdd(false); setNewName(''); setNewPrompt('')
  }

  const deleteCustom = (id: string) => {
    const next = customs.filter(c => c.id !== id)
    setCustoms(next)
    localStorage.setItem('prism-customs', JSON.stringify(next))
    if (customSel === id) { setCustomSel(null); setStyle('high-quality') }
  }

  const download = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.img; a.download = `prism-${Date.now()}.png`; a.click()
  }

  const currentImg = viewIdx === 1 && result ? result.img : src

  /* ── Ambient orbs ────────────────────────────────────── */
  const Orbs = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div className="absolute -top-[30%] -left-[20%] w-[80vw] h-[80vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,.12) 0%, transparent 70%)', filter: 'blur(70px)' }} />
      <div className="absolute top-[60%] -right-[20%] w-[70vw] h-[70vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,.1) 0%, transparent 70%)', filter: 'blur(70px)' }} />
    </div>
  )

  /* ──────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────── */
  return (
    <main className="min-h-svh bg-black text-white overflow-x-hidden selection:bg-blue-500/30">
      <Orbs />

      {/* ═══════ HISTORY LIGHTBOX ═══════ */}
      {historyView && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setHistoryView(null)}>
          <div className="flex items-center justify-between px-5 pt-12 pb-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-sm font-semibold text-white/50">Enhanced</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const a = document.createElement('a'); a.href = historyView.img; a.download = `prism-${historyView.ts}.jpg`; a.click() }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <DownloadIcon />
              </button>
              <button onClick={() => setHistoryView(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <CloseIcon size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center px-4" onClick={e => e.stopPropagation()}>
            <img
              src={historyView.img}
              alt="Enhanced"
              className="max-h-full max-w-full object-contain rounded-xl"
              style={{ maxHeight: 'calc(100svh - 140px)' }}
            />
          </div>
        </div>
      )}

      {/* ═══════ LIGHTBOX ═══════ */}
      <AnimatePresence>
        {lightbox && src && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            onClick={() => setLightbox(false)}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-12 pb-3 flex-shrink-0"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                {result && (
                  <>
                    <button
                      onClick={() => setViewIdx(0)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: viewIdx === 0 ? B.dim : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${viewIdx === 0 ? B.border : 'rgba(255,255,255,0.1)'}`,
                        color: viewIdx === 0 ? B.text : 'rgba(255,255,255,0.5)',
                      }}>
                      Original
                    </button>
                    <button
                      onClick={() => setViewIdx(1)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: viewIdx === 1 ? B.dim : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${viewIdx === 1 ? B.border : 'rgba(255,255,255,0.1)'}`,
                        color: viewIdx === 1 ? B.text : 'rgba(255,255,255,0.5)',
                      }}>
                      Enhanced
                    </button>
                  </>
                )}
                {!result && <span className="text-sm text-white/50">Original</span>}
              </div>
              <div className="flex items-center gap-2">
                {viewIdx === 1 && result && (
                  <button onClick={e => { e.stopPropagation(); download() }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <DownloadIcon />
                  </button>
                )}
                <button onClick={() => setLightbox(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center px-4 relative"
              onClick={e => e.stopPropagation()}>
              {result && (
                <button
                  onClick={() => setViewIdx(0)}
                  disabled={viewIdx === 0}
                  className="absolute left-2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <ArrowLeftIcon />
                </button>
              )}
              <img
                src={currentImg!}
                alt={viewIdx === 1 ? 'Enhanced' : 'Original'}
                className="max-h-full max-w-full object-contain rounded-xl"
                style={{ maxHeight: 'calc(100svh - 140px)' }}
              />
              {result && (
                <button
                  onClick={() => setViewIdx(1)}
                  disabled={viewIdx === 1}
                  className="absolute right-2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <ArrowRightIcon />
                </button>
              )}
            </div>

            {/* Dot indicator */}
            {result && (
              <div className="flex justify-center gap-2 py-5 flex-shrink-0">
                {[0, 1].map(i => (
                  <button key={i} onClick={e => { e.stopPropagation(); setViewIdx(i) }}
                    className="rounded-full"
                    style={{
                      width: viewIdx === i ? 20 : 6,
                      height: 6,
                      background: viewIdx === i ? B.full : 'rgba(255,255,255,0.25)',
                    }} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-[480px] mx-auto px-4 pt-3 pb-20">

        {/* ═══════ HEADER ═══════ */}
        <motion.header {...fadeUp(0)} className="text-center mb-2">
          <h1 className="text-[28px] font-black tracking-tight text-white">Prism</h1>
        </motion.header>

        {/* ═══════ IMAGE REGION (2:3) ═══════ */}
        <motion.section {...fadeUp(0.06)} className="mb-5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {/* 3:4 wrapper */}
          <div className="relative rounded-[24px] overflow-hidden" style={{ aspectRatio: '3/4' }}>

            {!src ? (
              /* ── Empty upload zone ── */
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
                    {dragging ? 'Release to upload' : 'Drop your photo here'}
                  </p>
                  <p className="text-white/30 text-sm">or tap to browse</p>
                </div>
                <p className="text-[10px] text-white/18 tracking-wider uppercase">
                  JPEG · PNG · WEBP · up to 20 MB
                </p>
              </div>
            ) : (
              /* ── Image display ── */
              <>
                <img
                  src={currentImg!}
                  alt={viewIdx === 1 ? 'Enhanced' : 'Original'}
                  className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(true)}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.55) 100%)' }} />

                {/* Top-left: change photo */}
                <button onClick={() => fileRef.current?.click()}
                  className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/75 transition-colors hover:text-white"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Change
                </button>

                {/* Top-right: clear */}
                <div className="absolute top-3 right-3">
                  <button onClick={() => { setSrc(null); setResult(null); setErr(null); setViewIdx(0) }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)' }}>
                    <CloseIcon />
                  </button>
                </div>

                {/* Left arrow */}
                {result && (
                  <button
                    onClick={() => setViewIdx(0)}
                    disabled={viewIdx === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <ArrowLeftIcon />
                  </button>
                )}

                {/* Right arrow */}
                {result && (
                  <button
                    onClick={() => setViewIdx(1)}
                    disabled={viewIdx === 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <ArrowRightIcon />
                  </button>
                )}

                {/* Bottom bar */}
                <div className="absolute bottom-0 inset-x-0 px-3 pb-3 flex items-center justify-between">
                  {/* Dot nav + label */}
                  <div className="flex items-center gap-2">
                    {result ? (
                      <>
                        {[0, 1].map(i => (
                          <button key={i} onClick={() => setViewIdx(i)}
                            className="rounded-full"
                            style={{
                              width: viewIdx === i ? 18 : 5,
                              height: 5,
                              background: viewIdx === i ? B.full : 'rgba(255,255,255,0.35)',
                            }} />
                        ))}
                        <span className="text-[10px] text-white/60 ml-1 font-medium">
                          {viewIdx === 0 ? 'Original' : 'Enhanced'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-white/45 font-medium">Original</span>
                    )}
                  </div>

                  {/* Download (when viewing result) */}
                  {viewIdx === 1 && result && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={download}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                      style={{ background: 'rgba(59,130,246,0.25)', border: `1px solid ${B.border}`, color: B.text }}>
                      <DownloadIcon />Save
                    </motion.button>
                  )}
                </div>

                {/* Processing overlay */}
                {busy && (
                  <div className="absolute inset-0 overflow-hidden" style={{ background: 'rgba(0,0,0,0.38)' }}>
                    {/* Aurora — blue */}
                    <div className="absolute animate-aurora"
                      style={{
                        inset: '-30%',
                        background: 'radial-gradient(ellipse at 45% 55%, rgba(59,130,246,0.55) 0%, transparent 58%)',
                        filter: 'blur(30px)',
                      }} />
                    {/* Aurora — indigo */}
                    <div className="absolute animate-aurora-alt"
                      style={{
                        inset: '-30%',
                        background: 'radial-gradient(ellipse at 65% 38%, rgba(99,102,241,0.45) 0%, transparent 52%)',
                        filter: 'blur(36px)',
                      }} />
                    {/* Scan line */}
                    <div className="absolute inset-x-0 h-[2px] animate-scan-down"
                      style={{
                        background: 'linear-gradient(to right, transparent 0%, rgba(147,197,253,0.8) 25%, rgba(255,255,255,0.95) 50%, rgba(147,197,253,0.8) 75%, transparent 100%)',
                        boxShadow: '0 0 10px 4px rgba(147,197,253,0.55), 0 0 28px 8px rgba(59,130,246,0.3)',
                      }} />
                    {/* Label */}
                    <div className="absolute bottom-5 inset-x-0 flex justify-center">
                      <span className="text-[11px] font-semibold tracking-[0.28em] uppercase text-white/55">Enhancing</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.section>

        {/* ═══════ STYLE SELECTOR ═══════ */}
        <motion.section {...fadeUp(0.12)} className="mb-4">
          <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/30 mb-3 px-0.5">Style</p>
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            {PRESETS.map(p => {
              const active = style === p.id && !customSel
              return (
                <motion.button key={p.id}
                  onClick={() => { setStyle(p.id); setCustomSel(null) }}
                  whileTap={{ scale: 0.94 }}
                  className="flex-shrink-0 w-[118px] h-[112px] rounded-[18px] text-left relative overflow-hidden"
                  style={{
                    backgroundImage: `url(${p.img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: active ? `0 0 20px ${p.from}55` : 'none',
                  }}>
                  {/* Dark gradient overlay — half opacity */}
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.27) 55%, rgba(0,0,0,0.41) 100%)' }} />
                  {/* Border ring drawn above overlay so it covers all edges */}
                  <div className="absolute inset-0 rounded-[18px] pointer-events-none z-20"
                    style={{ border: active ? `2px solid ${p.from}` : '1.5px solid rgba(255,255,255,0.1)' }} />
                  {/* Active check */}
                  {active && (
                    <div className="absolute top-2 right-2 w-[16px] h-[16px] rounded-full flex items-center justify-center z-30"
                      style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                  {/* Text */}
                  <div className="absolute bottom-0 inset-x-0 p-2.5 z-10">
                    <p className="text-[12px] font-bold text-white leading-tight mb-0.5">{p.name}</p>
                    <p className="text-[9px] text-white/60 leading-snug">{p.desc}</p>
                  </div>
                </motion.button>
              )
            })}

            {customs.map(c => {
              const active = customSel === c.id
              return (
                <motion.button key={c.id}
                  onClick={() => { setCustomSel(c.id); setStyle('') }}
                  whileTap={{ scale: 0.94 }}
                  className="flex-shrink-0 w-[118px] rounded-[18px] p-3.5 text-left relative overflow-hidden group transition-all"
                  style={{
                    background: active ? B.dimmer : 'rgba(255,255,255,0.04)',
                    border: active ? `1.5px solid ${B.border}` : '1.5px solid rgba(255,255,255,0.07)',
                    boxShadow: active ? B.glow : 'none',
                  }}>
                  <div className="w-8 h-8 rounded-[9px] mb-2.5 flex items-center justify-center"
                    style={{ background: B.dimmer, color: B.full }}>
                    <PenIcon />
                  </div>
                  <p className="text-[12px] font-bold text-white/90 leading-tight mb-0.5 pr-3 truncate">{c.name}</p>
                  <p className="text-[10px] text-white/38">Custom</p>
                  <button onClick={e => { e.stopPropagation(); deleteCustom(c.id) }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-white/60"
                    style={{ background: 'rgba(255,60,60,0.25)' }}>
                    <CloseIcon size={8} />
                  </button>
                </motion.button>
              )
            })}

            <motion.button
              onClick={() => setShowAdd(true)}
              whileTap={{ scale: 0.94 }}
              className="flex-shrink-0 w-[80px] rounded-[18px] p-3 flex flex-col items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.1)' }}>
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white/35"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <PlusIcon />
              </div>
              <p className="text-[10px] text-white/28 font-medium">Custom</p>
            </motion.button>
          </div>
        </motion.section>

        {/* ═══════ ADD CUSTOM MODAL ═══════ */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="mb-4 rounded-[20px] p-5"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-white/85 text-sm">Create Custom Style</p>
                <button onClick={() => setShowAdd(false)} className="text-white/35 hover:text-white/60 transition-colors">
                  <CloseIcon size={16} />
                </button>
              </div>
              <input
                type="text" placeholder="Style name…" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/28 outline-none mb-3 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => (e.target.style.borderColor = B.border)}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <textarea
                placeholder="Describe the style… be specific about colors, mood, lighting, and artistic direction."
                value={newPrompt} onChange={e => setNewPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/28 outline-none mb-4 resize-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => (e.target.style.borderColor = B.border)}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button onClick={saveCustom} disabled={!newName.trim() || !newPrompt.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-opacity"
                style={{ background: `linear-gradient(135deg, #1d4ed8, #3b82f6)` }}>
                Save Style
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ ERROR BANNER ═══════ */}
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

        {/* ═══════ TRANSFORM BUTTON ═══════ */}
        <motion.div {...fadeUp(0.18)} className="mb-5">
          <button
            onClick={transform}
            disabled={!src || busy}
            className="w-full py-4 rounded-[18px] text-base font-black tracking-wide relative overflow-hidden transition-all disabled:cursor-not-allowed"
            style={{
              background: src && !busy
                ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%)'
                : 'rgba(255,255,255,0.07)',
              backgroundSize: '200% 200%',
              boxShadow: src && !busy ? '0 4px 32px rgba(59,130,246,0.35)' : 'none',
              opacity: !src ? 0.45 : 1,
              animation: src && !busy ? 'gradient-move 4s ease infinite' : 'none',
            }}>
            <span className="relative flex items-center justify-center gap-2.5 text-white">
              {busy ? (
                <span>Transforming…</span>
              ) : (
                <><WandIcon /><span>Transform</span></>
              )}
            </span>
          </button>
        </motion.div>

        {/* ═══════ EXTRA EDITS ═══════ */}
        <motion.section {...fadeUp(0.22)} className="mb-4">
          <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/30 mb-2.5 px-0.5">Extra Instructions</p>
          <textarea
            placeholder="e.g. make the sky more dramatic, add warm sunset tones, sharpen the foreground…"
            value={extraEdits}
            onChange={e => setExtraEdits(e.target.value)}
            rows={2}
            className="w-full rounded-[16px] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none resize-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => (e.target.style.borderColor = B.border)}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </motion.section>

        {/* ═══════ SETTINGS CARD ═══════ */}
        <motion.section {...fadeUp(0.22)} className="mb-4 rounded-[20px] p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Aspect Ratio */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/28 mb-3">Aspect Ratio</p>
            <div className="grid grid-cols-6 gap-1.5">
              {RATIOS.map(r => {
                const active = ar === r.value
                return (
                  <button key={r.value} onClick={() => setAr(r.value)}
                    className="flex flex-col items-center justify-center gap-1.5 h-[54px] rounded-[10px]"
                    style={{
                      background: active ? B.dimmer : 'rgba(255,255,255,0.04)',
                      border: active ? `1.5px solid ${B.border}` : '1.5px solid rgba(255,255,255,0.07)',
                    }}>
                    <div className="rounded-[2px]"
                      style={{
                        width: r.px, height: r.py,
                        background: active ? B.full : 'rgba(255,255,255,0.2)',
                      }} />
                    <span className="text-[8px] font-bold tracking-wide"
                      style={{ color: active ? B.text : 'rgba(255,255,255,0.4)' }}>
                      {r.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/28 mb-3">Resolution</p>
            <div className="flex gap-2">
              {(['1k', '2k', '4k'] as Res[]).map(r => {
                const active = res === r
                return (
                  <button key={r} onClick={() => setRes(r)}
                    className="flex-1 py-2.5 rounded-[12px] text-sm font-black tracking-widest uppercase transition-all"
                    style={{
                      background: active ? B.dimmer : 'rgba(255,255,255,0.04)',
                      border: active ? `1.5px solid ${B.border}` : '1.5px solid rgba(255,255,255,0.07)',
                      color: active ? B.text : 'rgba(255,255,255,0.35)',
                    }}>
                    {r}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.section>

        {/* ═══════ HISTORY ═══════ */}
        {history.length > 0 && (
          <motion.section {...fadeUp(0.1)} className="mt-2 mb-4">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/30">History</p>
              <button
                onClick={() => setHistory([])}
                className="text-[10px] font-semibold tracking-wider uppercase text-red-400/50 hover:text-red-400 transition-colors">
                Delete All
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {history.map(item => (
                <div key={item.id} className="relative rounded-[14px] overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <img
                    src={item.img}
                    alt="Enhanced"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setHistoryView(item)}
                  />
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 45%)' }} />
                  <button
                    onClick={e => { e.stopPropagation(); setHistory(prev => prev.filter(h => h.id !== item.id)) }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center z-10 text-white/80 hover:text-white transition-colors"
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
                    <CloseIcon size={9} />
                  </button>
                </div>
              ))}
            </div>
          </motion.section>
        )}

      </div>
    </main>
  )
}
