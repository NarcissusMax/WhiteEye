'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { EyeOfHorus } from './eye-of-horus'
import { ParticleField } from './particle-field'
import { AmbientSound } from './ambient-sound'
import { WHITEEYE_QUOTES } from '@/lib/types'
import { getCurrentSessionId } from '@/lib/session-store'

export function Landing() {
  const router = useRouter()
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    setHasSession(Boolean(getCurrentSessionId()))
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % (WHITEEYE_QUOTES?.length ?? 1))
    }, 5200)
    return () => clearInterval(id)
  }, [])

  const quote = WHITEEYE_QUOTES?.[quoteIndex] ?? WHITEEYE_QUOTES?.[0] ?? ''

  return (
    <main className="room-vignette relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6">
      <ParticleField density={55} />

      <div className="absolute right-5 top-5 z-20">
        <AmbientSound />
      </div>

      {/* the eye */}
      <motion.div
        initial={{ opacity: 0, scale: 0.86, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-2"
      >
        <div className="animate-slowfloat">
          <EyeOfHorus className="h-28 w-44 text-white sm:h-32 sm:w-52" animate />
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8, duration: 1.4 }}
        className="z-10 mb-10 text-[0.7rem] uppercase tracking-[0.55em] text-muted-foreground"
      >
        the whiteeye
      </motion.p>

      {/* rotating canon quote */}
      <div className="z-10 flex min-h-[6rem] max-w-2xl items-center justify-center px-2 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={quoteIndex}
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="font-mono text-xl leading-relaxed text-foreground/90 sm:text-2xl"
          >
            &ldquo;{quote}&rdquo;
          </motion.p>
        </AnimatePresence>
      </div>

      {/* enter mechanism */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 1.2 }}
        className="z-10 mt-12 flex flex-col items-center gap-5"
      >
        <button
          onClick={() => router.push('/intake')}
          className="group relative inline-flex items-center gap-3 rounded-md border border-[hsl(214_90%_58%_/_0.35)] bg-[hsl(214_90%_58%_/_0.06)] px-8 py-3.5 font-mono text-sm lowercase tracking-widest text-foreground transition-all duration-300 hover:border-[hsl(214_90%_58%_/_0.8)] hover:bg-[hsl(214_90%_58%_/_0.14)] hover:shadow-[0_0_30px_-6px_hsl(214_90%_58%_/_0.5)]"
        >
          enter the room
          <ArrowRight className="h-4 w-4 text-blue transition-transform duration-300 group-hover:translate-x-1" />
        </button>

        {hasSession && (
          <button
            onClick={() => router.push('/chat')}
            className="font-mono text-xs lowercase tracking-wide text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            or return to where you left off
          </button>
        )}

        <p className="max-w-xs text-center font-mono text-[0.7rem] leading-relaxed text-muted-foreground/70">
          this is not a clinic. there is no fixing here. only seeing.
        </p>
      </motion.div>
    </main>
  )
}
