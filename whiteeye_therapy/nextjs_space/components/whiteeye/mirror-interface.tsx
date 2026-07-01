'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { WhiteeyeNav } from './whiteeye-nav'
import { EyeOfHorus } from './eye-of-horus'
import { EyeIndicator } from './eye-indicator'
import { ParticleField } from './particle-field'
import { getCurrentSessionId, getSessionIndex } from '@/lib/session-store'

export function MirrorInterface() {
  const router = useRouter()
  const [hasSessions, setHasSessions] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [reflection, setReflection] = useState('')
  const [thinking, setThinking] = useState(false)
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHasSessions(getSessionIndex().length > 0)
  }, [])

  const look = async () => {
    if (streaming) return
    const current = getCurrentSessionId()
    const all = getSessionIndex().map((s) => s?.id).filter(Boolean) as string[]
    if (!current && all.length === 0) {
      toast('you have given the mirror nothing yet.', { icon: '🕳' })
      router.push('/intake')
      return
    }

    setReflection('')
    setThinking(true)
    setStreaming(true)

    try {
      const res = await fetch('/api/mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: current, sessionIds: all }),
      })

      if (!res.ok || !res.body) {
        let msg = 'the mirror clouded over.'
        try {
          const j = await res.json()
          if (j?.error) msg = j.error
        } catch {
          // ignore
        }
        throw new Error(msg)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let started = false
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue
        acc += chunk
        if (!started) {
          started = true
          setThinking(false)
        }
        setReflection(acc)
      }
      if (!started) setThinking(false)
    } catch (err: any) {
      setThinking(false)
      toast.error(err?.message ?? 'the mirror shattered')
    } finally {
      setStreaming(false)
    }
  }

  const paras = (reflection ?? '')
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="room-vignette relative flex min-h-[100dvh] flex-col overflow-hidden">
      <ParticleField density={35} />
      <WhiteeyeNav />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="animate-slowfloat">
            <EyeOfHorus className="h-16 w-28 text-white/90" animate />
          </div>
          <h1 className="mt-6 font-mono text-2xl lowercase tracking-tight text-foreground">
            the mirror
          </h1>
          <p className="mt-3 max-w-md font-mono text-sm lowercase leading-relaxed text-muted-foreground">
            you have been talking. now you listen. i will take your own words and
            show you the pattern underneath them &mdash; the thing you keep circling.
          </p>

          {mounted && !hasSessions ? (
            <button
              onClick={() => router.push('/intake')}
              className="mt-8 rounded-md border border-[hsl(214_90%_58%_/_0.4)] bg-[hsl(214_90%_58%_/_0.08)] px-6 py-2.5 font-mono text-xs lowercase tracking-widest text-foreground transition-all hover:border-[hsl(214_90%_58%_/_0.8)] hover:bg-[hsl(214_90%_58%_/_0.16)]"
            >
              enter the room first
            </button>
          ) : (
            <button
              onClick={look}
              disabled={streaming}
              className="mt-8 rounded-md border border-[hsl(214_90%_58%_/_0.4)] bg-[hsl(214_90%_58%_/_0.08)] px-7 py-3 font-mono text-xs lowercase tracking-widest text-foreground transition-all hover:border-[hsl(214_90%_58%_/_0.8)] hover:bg-[hsl(214_90%_58%_/_0.16)] disabled:opacity-40"
            >
              {streaming ? 'looking...' : reflection ? 'look again' : 'look into it'}
            </button>
          )}
        </div>

        <div className="mt-12 w-full">
          {thinking && (
            <div className="flex justify-center">
              <EyeIndicator label="he is reading everything you said" />
            </div>
          )}

          {paras.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1 }}
              className="mx-auto max-w-xl border-l-2 border-[hsl(0_74%_52%_/_0.5)] pl-5"
            >
              {paras.map((p, i) => (
                <p
                  key={i}
                  className="mb-3 whitespace-pre-wrap font-mono text-[0.98rem] leading-relaxed text-foreground/90 last:mb-0"
                >
                  {p}
                </p>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
