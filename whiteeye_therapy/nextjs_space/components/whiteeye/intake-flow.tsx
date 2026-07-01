'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { EyeOfHorus } from './eye-of-horus'
import { ParticleField } from './particle-field'
import { INTAKE_QUESTIONS } from '@/lib/types'
import { upsertSessionMeta, setCurrentSessionId } from '@/lib/session-store'

type Answer = { question: string; answer: string; order: number }

function useTypewriter(text: string, speed = 34) {
  const [out, setOut] = useState('')
  useEffect(() => {
    setOut('')
    let i = 0
    const safe = text ?? ''
    const id = setInterval(() => {
      i += 1
      setOut(safe.slice(0, i))
      if (i >= safe.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return out
}

export function IntakeFlow() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [value, setValue] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const total = INTAKE_QUESTIONS?.length ?? 0
  const current = INTAKE_QUESTIONS?.[step]
  const typed = useTypewriter(current?.prompt ?? '')

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus?.(), 300)
    return () => clearTimeout(t)
  }, [step])

  const submitAll = async (finalAnswers: Answer[]) => {
    setSubmitting(true)
    setDone(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const id = data?.id
      if (!id) throw new Error('no id')
      upsertSessionMeta({
        id,
        title: data?.title ?? 'untitled',
        toneSeed: data?.toneSeed ?? null,
        createdAt: data?.createdAt ?? new Date().toISOString(),
        preview: finalAnswers?.[0]?.answer ?? '',
      })
      setCurrentSessionId(id)
      // let the closing line breathe before entering
      setTimeout(() => router.push('/chat'), 2200)
    } catch {
      toast.error('the door stuck. try once more.')
      setSubmitting(false)
      setDone(false)
    }
  }

  const advance = () => {
    const answer = value.trim()
    if (!answer) {
      toast('say something. even one word.', { icon: '👁' })
      return
    }
    const entry: Answer = {
      question: current?.prompt ?? '',
      answer,
      order: step,
    }
    const next = [...answers, entry]
    setAnswers(next)
    setValue('')
    if (step + 1 >= total) {
      submitAll(next)
    } else {
      setStep((s) => s + 1)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      advance()
    }
  }

  return (
    <main className="room-vignette relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6">
      <ParticleField density={40} />

      <div className="z-10 mb-10 flex flex-col items-center">
        <div className="animate-slowfloat">
          <EyeOfHorus className="h-14 w-24 text-white/90" animate />
        </div>
        <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.5em] text-muted-foreground">
          before you sit
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="z-10 flex w-full max-w-xl flex-col items-center"
          >
            <h1 className="caret-blink min-h-[2.5rem] text-center font-mono text-2xl lowercase tracking-tight text-foreground sm:text-3xl">
              {typed}
            </h1>

            <div className="mt-8 w-full">
              <textarea
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                placeholder={current?.placeholder ?? ''}
                className="w-full resize-none rounded-md border border-border bg-[hsl(0_0%_7%_/_0.7)] px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground/50 focus:border-[hsl(214_90%_58%_/_0.6)] focus:outline-none focus:ring-1 focus:ring-[hsl(214_90%_58%_/_0.4)]"
              />
              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-2">
                  {Array.from({ length: total }).map((_, i) => (
                    <span
                      key={i}
                      className={
                        'h-1.5 w-1.5 rounded-full transition-colors ' +
                        (i === step
                          ? 'bg-blue'
                          : i < step
                            ? 'bg-foreground/40'
                            : 'bg-border')
                      }
                    />
                  ))}
                </div>
                <button
                  onClick={advance}
                  disabled={submitting}
                  className="rounded-md border border-[hsl(214_90%_58%_/_0.35)] bg-[hsl(214_90%_58%_/_0.06)] px-5 py-2 font-mono text-xs lowercase tracking-widest text-foreground transition-all hover:border-[hsl(214_90%_58%_/_0.8)] hover:bg-[hsl(214_90%_58%_/_0.14)] disabled:opacity-40"
                >
                  {step + 1 >= total ? 'enter' : 'continue'}
                </button>
              </div>
              <p className="mt-3 font-mono text-[0.65rem] text-muted-foreground/50">
                enter to continue &middot; shift+enter for a new line
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="closing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="z-10 flex max-w-md flex-col items-center text-center"
          >
            <p className="font-mono text-lg lowercase leading-relaxed text-foreground/90 animate-flicker">
              i heard you.
            </p>
            <p className="mt-3 font-mono text-sm lowercase leading-relaxed text-muted-foreground">
              sit down. the room is dark, but your eyes will adjust.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
