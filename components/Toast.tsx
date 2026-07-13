'use client'

import { motion, AnimatePresence } from 'framer-motion'

export default function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full text-sm font-semibold text-white pointer-events-none"
          style={{
            background: 'rgba(20,20,20,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
          }}>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
