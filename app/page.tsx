'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Types ─────────────────────────────────────────────── */
type AR  = 'auto' | '1:1' | '2:3' | '3:2' | '9:16' | '16:9'
type Res = '1k' | '2k' | '4k'
interface CustomStyle { id: string; name: string; prompt: string }

/* ─── Data ──────────────────────────────────────────────── */
const PRESETS = [
  {
    id: 'high-quality',
    name: 'High Quality',
    desc: 'Professional DSLR remaster',
    prompt: "Remaster as a professional DSLR photograph. Enhance dynamic range, color grading, contrast, and sharpness. Improve lighting consistency and reduce noise. Preserve all original subjects, composition, and scene details exactly, don't add anything. Photorealistic, editorial quality.",
    from: '#f6d365',
    to:   '#fda085',
    glyph: '✦',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    desc: 'Movie-quality film look',
    prompt: "Transform into a cinematic movie still with professional color grading. Apply anamorphic lens quality, rich shadows, subtle film grain, and dramatic highlights. Preserve all subjects and composition exactly. Epic, atmospheric, Hollywood quality.",
    from: '#667eea',
    to:   '#764ba2',
    glyph: '◈',
  },
  {
    id: 'vivid',
    name: 'Vivid',
    desc: 'Vibrant, punchy colors',
    prompt: "Enhance with vivid, vibrant color grading. Dramatically boost saturation and contrast while keeping the image natural. Make every color pop. Preserve all subjects and composition exactly. Eye-catching, vibrant, magazine-quality.",
    from: '#f093fb',
    to:   '#f5576c',
    glyph: '◉',
  },
] as const

const RATIOS: { value: AR; label: string; px: number; py: number }[] = [
  { value: 'auto', label: 'Auto',  px: 20, py: 20 },
  { value: '1:1',  label: '1:1',   px: 20, py: 20 },
  { value: '2:3',  label: '2:3',   px: 15, py: 22 },
  { value: '3:2',  label: '3:2',   px: 22, py: 15 },
  { value: '9:16', label: '9:16',  px: 12, py: 22 },
  { value: '16:9', label: '16:9',  px: 22, py: 12 },
]

/* ─── Framer variants ───────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial:  { opacity: 0, y: 22 },
  animate:  { opacity: 1, y: 0  },
  transition: { delay, duration: 0.55, ease: [0.23, 1, 0.32, 1] },
})

/* ─── Inline SVG icons ──────────────────────────────────── */
const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const WandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/>
    <path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/>
    <path d="M17.8 6.2 19 5"/><path d="M3 21l9-9"/>
    <path d="M12.2 6.2 11 5"/>
  </svg>
)
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const CloseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const SpinnerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 11-6.219-8.56"/>
  </svg>
)

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function PrismApp() {
  const [src,       setSrc]       = useState<string | null>(null)
  const [srcMime,   setSrcMime]   = useState('image/jpeg')
  const [style,     setStyle]     = useState<string>('high-quality')
  const [customSel, setCustomSel] = useState<string | null>(null)
  const [ar,        setAr]        = useState<AR>('auto')
  const [res,       setRes]       = useState<Res>('2k')
  const [dragging,  setDragging]  = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [result,    setResult]    = useState<{ img: string; mime: string } | null>(null)
  const [err,       setErr]       = useState<string | null>(null)
  const [customs,   setCustoms]   = useState<CustomStyle[]>([])
  const [showAdd,   setShowAdd]   = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [showOrig,  setShowOrig]  = useState(false)
  const [progress,  setProgress]  = useState(0)

  const fileRef   = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const c = localStorage.getItem('prism-customs')
      if (c) setCustoms(JSON.parse(c))
    } catch {}
  }, [])

  /* progress bar mock while processing */
  useEffect(() => {
    if (!busy) { setProgress(0); return }
    setProgress(8)
    const t1 = setTimeout(() => setProgress(35), 600)
    const t2 = setTimeout(() => setProgress(62), 1800)
    const t3 = setTimeout(() => setProgress(88), 3500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [busy])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setErr('Please upload an image file.'); return }
    if (file.size > 20 * 1024 * 1024)   { setErr('Image must be under 20 MB.');   return }
    const reader = new FileReader()
    reader.onload = e => {
      setSrc(e.target?.result as string)
      setSrcMime(file.type)
      setResult(null)
      setErr(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const activePrompt = () => {
    if (customSel) return customs.find(c => c.id === customSel)?.prompt ?? ''
    return PRESETS.find(p => p.id === style)?.prompt ?? ''
  }

  const compressImage = (dataUrl: string, mime: string): Promise<{ base64: string; mime: string }> =>
    new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const MAX = 2048
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX }
          else                { width  = Math.round((width  / height) * MAX); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const outMime = 'image/jpeg'
        const out = canvas.toDataURL(outMime, 0.88)
        resolve({ base64: out.split(',')[1], mime: outMime })
      }
      img.src = dataUrl
    })

  const transform = async () => {
    if (!src || busy) return
    setBusy(true); setErr(null)
    try {
      const { base64, mime: compMime } = await compressImage(src, srcMime)
      const r = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: compMime, prompt: activePrompt(), aspectRatio: ar, resolution: res }),
      })
      let d: { error?: string; image?: string; mimeType?: string }
      try { d = await r.json() }
      catch { throw new Error('Image may be too large. Try a smaller photo.') }
      if (!r.ok) throw new Error(d.error ?? 'Processing failed.')
      if (!d.image || !d.mimeType) throw new Error('No image returned.')
      setResult({ img: `data:${d.mimeType};base64,${d.image}`, mime: d.mimeType })
      setShowOrig(false)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
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
    setCustomSel(ns.id)
    setStyle('')
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

  /* ── Ambient orbs ─────────────────────────── */
  const Orbs = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div className="absolute -top-[25%] -left-[15%] w-[75vw] h-[75vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(155,77,255,.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute top-[55%] -right-[20%] w-[65vw] h-[65vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(77,155,255,.14) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute top-[30%] left-[25%] w-[50vw] h-[50vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,77,155,.07) 0%, transparent 70%)', filter: 'blur(80px)' }} />
    </div>
  )

  /* ── Prism logo SVG ───────────────────────── */
  const PrismLogo = () => (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#c084fc"/>
          <stop offset="35%"  stopColor="#818cf8"/>
          <stop offset="65%"  stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#f472b6"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <polygon points="18,3 33,31 3,31" stroke="url(#lg)" strokeWidth="2" fill="none" strokeLinejoin="round" filter="url(#glow)"/>
      <line x1="18" y1="3" x2="33" y2="31" stroke="#38bdf8" strokeWidth="0.8" opacity="0.45"/>
      <line x1="18" y1="3" x2="3"  y2="31" stroke="#c084fc" strokeWidth="0.8" opacity="0.45"/>
      <line x1="3"  y1="31" x2="33" y2="31" stroke="#f472b6" strokeWidth="0.8" opacity="0.3"/>
      <circle cx="18" cy="3" r="1.5" fill="#c084fc" opacity="0.9"/>
    </svg>
  )

  /* ──────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────── */
  return (
    <main className="min-h-svh bg-[#050508] text-white overflow-x-hidden selection:bg-purple-500/30">
      <Orbs />

      <div className="relative z-10 max-w-[480px] mx-auto px-4 pt-14 pb-20">

        {/* ═══════ HEADER ═══════ */}
        <motion.header {...fadeUp(0)} className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="animate-float">
              <PrismLogo />
            </div>
            <h1 className="text-[2.6rem] font-black tracking-tight leading-none prism-text">
              PRISM
            </h1>
          </div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 font-medium">
            AI · Photo · Enhancement
          </p>
        </motion.header>

        {/* ═══════ UPLOAD ZONE ═══════ */}
        <motion.section {...fadeUp(0.08)} className="mb-5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <AnimatePresence mode="wait">
            {!src ? (
              <motion.div key="empty"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35 }}
                onClick={() => fileRef.current?.click()}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                className="cursor-pointer rounded-[28px] relative overflow-hidden"
                style={{
                  background: dragging ? 'rgba(155,77,255,0.08)' : 'rgba(255,255,255,0.025)',
                  border: dragging ? '2px solid rgba(155,77,255,0.55)' : '2px dashed rgba(255,255,255,0.1)',
                  boxShadow: dragging ? '0 0 48px rgba(155,77,255,0.18)' : 'none',
                  transition: 'all .25s',
                }}
              >
                <div className="py-20 flex flex-col items-center gap-5">
                  <div className="relative">
                    <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-purple-400"
                      style={{ background: 'rgba(155,77,255,0.1)' }}>
                      <UploadIcon />
                    </div>
                    <div className="absolute inset-0 rounded-2xl animate-pulse-ring" />
                  </div>
                  <div className="text-center">
                    <p className="text-white/75 font-semibold text-[15px] mb-1">
                      {dragging ? 'Release to upload' : 'Drop your photo here'}
                    </p>
                    <p className="text-white/30 text-sm">or tap to browse</p>
                  </div>
                  <div className="flex gap-2 items-center text-[10px] text-white/18 tracking-wider uppercase">
                    <span>JPEG</span><span className="text-white/10">·</span>
                    <span>PNG</span><span className="text-white/10">·</span>
                    <span>WEBP</span><span className="text-white/10">·</span>
                    <span>up to 20 MB</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="preview"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-[28px] overflow-hidden"
                style={{ aspectRatio: '4/3' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />

                {/* Prism badge top-left */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span className="prism-text">PRISM</span>
                </div>

                <button onClick={() => { setSrc(null); setResult(null); setErr(null) }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/80 transition-opacity hover:text-white"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
                  <CloseIcon />
                </button>

                <button onClick={() => fileRef.current?.click()}
                  className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl text-xs font-medium text-white/70"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Change photo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ═══════ STYLE SELECTOR ═══════ */}
        <motion.section {...fadeUp(0.16)} className="mb-5">
          <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/30 mb-3 px-1">Style</p>

          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            {/* Built-in presets */}
            {PRESETS.map(p => {
              const active = style === p.id && !customSel
              return (
                <motion.button key={p.id}
                  onClick={() => { setStyle(p.id); setCustomSel(null) }}
                  whileTap={{ scale: 0.94 }}
                  className="flex-shrink-0 w-[122px] rounded-[20px] p-3.5 text-left relative overflow-hidden transition-all"
                  style={{
                    background: active
                      ? `linear-gradient(145deg, ${p.from}22, ${p.to}22, rgba(255,255,255,0.03))`
                      : 'rgba(255,255,255,0.04)',
                    border: active ? `1.5px solid ${p.from}70` : '1.5px solid rgba(255,255,255,0.07)',
                    boxShadow: active ? `0 0 28px ${p.from}22` : 'none',
                  }}>
                  {/* Color swatch */}
                  <div className="w-9 h-9 rounded-[10px] mb-3 flex items-center justify-center text-lg font-black"
                    style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                    <span style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))' }}>{p.glyph}</span>
                  </div>
                  <p className="text-[13px] font-bold text-white/90 leading-tight mb-0.5">{p.name}</p>
                  <p className="text-[10px] text-white/38 leading-snug">{p.desc}</p>

                  {active && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </motion.button>
              )
            })}

            {/* Custom style cards */}
            {customs.map(c => {
              const active = customSel === c.id
              return (
                <motion.button key={c.id}
                  onClick={() => { setCustomSel(c.id); setStyle('') }}
                  whileTap={{ scale: 0.94 }}
                  className="flex-shrink-0 w-[122px] rounded-[20px] p-3.5 text-left relative overflow-hidden group transition-all"
                  style={{
                    background: active ? 'rgba(155,77,255,0.14)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1.5px solid rgba(155,77,255,0.55)' : '1.5px solid rgba(255,255,255,0.07)',
                    boxShadow: active ? '0 0 28px rgba(155,77,255,0.18)' : 'none',
                  }}>
                  <div className="w-9 h-9 rounded-[10px] mb-3 flex items-center justify-center text-purple-400"
                    style={{ background: 'rgba(155,77,255,0.18)' }}>
                    <PenIcon />
                  </div>
                  <p className="text-[13px] font-bold text-white/90 leading-tight mb-0.5 pr-4 truncate">{c.name}</p>
                  <p className="text-[10px] text-white/38">Custom</p>

                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteCustom(c.id) }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-white/60"
                    style={{ background: 'rgba(255,60,60,0.25)' }}>
                    <CloseIcon size={8} />
                  </button>
                </motion.button>
              )
            })}

            {/* Add custom */}
            <motion.button
              onClick={() => setShowAdd(true)}
              whileTap={{ scale: 0.94 }}
              className="flex-shrink-0 w-[90px] rounded-[20px] p-3 flex flex-col items-center justify-center gap-2 transition-all"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1.5px dashed rgba(255,255,255,0.1)',
              }}>
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white/35"
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
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              className="mb-5 rounded-[22px] p-5"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-white/85">Create Custom Style</p>
                <button onClick={() => setShowAdd(false)} className="text-white/35 hover:text-white/60 transition-colors">
                  <CloseIcon size={16} />
                </button>
              </div>
              <input
                type="text" placeholder="Style name…" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/28 outline-none mb-3 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(155,77,255,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <textarea
                placeholder="Describe the style you want applied to your photos… be specific about colors, mood, lighting, and artistic direction."
                value={newPrompt} onChange={e => setNewPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/28 outline-none mb-4 resize-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(155,77,255,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button
                onClick={saveCustom}
                disabled={!newName.trim() || !newPrompt.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-bold tracking-wide disabled:opacity-40 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #9b4dff, #4d9bff)' }}>
                Save Style
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ SETTINGS CARD ═══════ */}
        <motion.section {...fadeUp(0.24)}
          className="mb-5 rounded-[22px] p-5"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Aspect Ratio */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/28 mb-3">Aspect Ratio</p>
            <div className="flex gap-2 flex-wrap">
              {RATIOS.map(r => {
                const active = ar === r.value
                return (
                  <button key={r.value}
                    onClick={() => setAr(r.value)}
                    className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[14px] transition-all"
                    style={{
                      background: active ? 'rgba(155,77,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1.5px solid rgba(155,77,255,0.55)' : '1.5px solid rgba(255,255,255,0.07)',
                    }}>
                    {/* Ratio shape */}
                    <div className="rounded-[3px]"
                      style={{
                        width: `${r.px}px`, height: `${r.py}px`,
                        minWidth: 10, minHeight: 10,
                        background: active ? 'rgba(155,77,255,0.7)' : 'rgba(255,255,255,0.2)',
                        transition: 'background .2s',
                      }} />
                    <span className="text-[9px] font-bold tracking-wide"
                      style={{ color: active ? 'rgba(195,145,255,1)' : 'rgba(255,255,255,0.4)' }}>
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
                  <button key={r}
                    onClick={() => setRes(r)}
                    className="flex-1 py-3 rounded-[14px] text-sm font-black tracking-widest uppercase transition-all"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(155,77,255,0.25), rgba(77,155,255,0.25))'
                        : 'rgba(255,255,255,0.04)',
                      border: active ? '1.5px solid rgba(155,77,255,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
                      color: active ? 'rgba(200,160,255,1)' : 'rgba(255,255,255,0.35)',
                    }}>
                    {r}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.section>

        {/* ═══════ ERROR BANNER ═══════ */}
        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 px-4 py-3 rounded-[16px] flex items-start gap-3 text-red-300/85"
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
        <motion.div {...fadeUp(0.36)} className="mb-8">
          <button
            onClick={transform}
            disabled={!src || busy}
            className="w-full py-4 rounded-[20px] text-base font-black tracking-wide relative overflow-hidden transition-all disabled:cursor-not-allowed"
            style={{
              background: src
                ? 'linear-gradient(135deg, #9b4dff 0%, #4d9bff 45%, #4dffcf 100%)'
                : 'rgba(255,255,255,0.07)',
              backgroundSize: '200% 200%',
              boxShadow: src && !busy ? '0 4px 40px rgba(155,77,255,0.35), 0 0 0 1px rgba(155,77,255,0.2)' : 'none',
              opacity: !src ? 0.45 : 1,
              animation: src && !busy ? 'gradient-border 4s ease infinite' : 'none',
            }}>

            {/* Progress bar */}
            {busy && (
              <div className="absolute inset-x-0 bottom-0 h-[3px] rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: 'rgba(255,255,255,0.7)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }} />
              </div>
            )}

            <span className="relative flex items-center justify-center gap-2.5 text-white">
              {busy ? (
                <>
                  <span className="animate-spin-slow"><SpinnerIcon /></span>
                  <span>Transforming…</span>
                </>
              ) : (
                <>
                  <WandIcon />
                  <span>Transform</span>
                </>
              )}
            </span>
          </button>
        </motion.div>

        {/* ═══════ RESULT ═══════ */}
        <AnimatePresence>
          {result && (
            <motion.div ref={resultRef}
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}>

              {/* Header row */}
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/30">Result</p>
                <div className="flex gap-2">
                  {src && (
                    <button
                      onClick={() => setShowOrig(v => !v)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: showOrig ? 'rgba(155,77,255,0.18)' : 'rgba(255,255,255,0.07)',
                        border: showOrig ? '1px solid rgba(155,77,255,0.45)' : '1px solid rgba(255,255,255,0.1)',
                        color: showOrig ? 'rgba(195,145,255,1)' : 'rgba(255,255,255,0.55)',
                      }}>
                      {showOrig ? 'Enhanced' : 'Original'}
                    </button>
                  )}
                  <button onClick={download}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    style={{ background: 'rgba(77,255,200,0.1)', border: '1px solid rgba(77,255,200,0.28)', color: 'rgba(100,255,210,0.95)' }}>
                    <DownloadIcon />Save
                  </button>
                </div>
              </div>

              {/* Image */}
              <div className="relative rounded-[28px] overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(155,77,255,0.15), 0 20px 60px rgba(0,0,0,0.5)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={showOrig ? src! : result.img}
                  alt={showOrig ? 'Original' : 'Enhanced'}
                  className="w-full block"
                  style={{ display: 'block' }}
                />
                {/* Bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(5,5,8,0.4), transparent)' }} />

                {/* Prism watermark */}
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg text-[9px] font-black tracking-widest"
                  style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
                  <span className="prism-text">PRISM</span>
                </div>
              </div>

              {/* Transform again */}
              <button
                onClick={() => { setResult(null) }}
                className="w-full mt-3 py-3 rounded-[16px] text-sm font-semibold text-white/35 transition-colors hover:text-white/55"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                ↺ &nbsp;Transform again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  )
}
