'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { SendHorizonal, X } from 'lucide-react'
import { toast } from 'sonner'
import { WhiteeyeNav } from './whiteeye-nav'
import { SessionSidebar } from './session-sidebar'
import { MessageView } from './message-view'
import { EyeIndicator } from './eye-indicator'
import { EyeOfHorus } from './eye-of-horus'
import { ParticleField } from './particle-field'
import type { ChatMessage } from '@/lib/types'
import {
  getCurrentSessionId,
  setCurrentSessionId,
  cacheMessages,
  getCachedMessages,
  upsertSessionMeta,
} from '@/lib/session-store'

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function ChatInterface({ initialSessionId }: { initialSessionId?: string }) {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [toneSeed, setToneSeed] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const loadSession = useCallback(async (id: string) => {
    setLoading(true)
    // instant paint from cache
    const cached = getCachedMessages(id)
    if (cached.length) setMessages(cached)
    try {
      const res = await fetch(`/api/sessions/${id}`)
      if (res.ok) {
        const data = await res.json()
        const msgs: ChatMessage[] = Array.isArray(data?.messages) ? data.messages : []
        setMessages(msgs)
        setToneSeed(data?.toneSeed ?? null)
        cacheMessages(id, msgs)
        upsertSessionMeta({
          id,
          title: data?.title ?? 'untitled',
          toneSeed: data?.toneSeed ?? null,
          createdAt: data?.createdAt ?? new Date().toISOString(),
          updatedAt: data?.updatedAt ?? new Date().toISOString(),
          preview:
            [...msgs].reverse().find((m) => m?.role === 'user')?.content?.slice(0, 80) ?? '',
        })
        setRefreshKey((k) => k + 1)
      }
    } catch {
      // keep cached view
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = initialSessionId || getCurrentSessionId()
    if (id) {
      setSessionId(id)
      setCurrentSessionId(id)
      loadSession(id)
    } else {
      setLoading(false)
    }
  }, [initialSessionId, loadSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, thinking])

  const selectSession = (id: string) => {
    if (!id || id === sessionId) {
      setSidebarOpen(false)
      return
    }
    setSessionId(id)
    setCurrentSessionId(id)
    setSidebarOpen(false)
    setMessages([])
    loadSession(id)
  }

  const newSession = () => {
    router.push('/intake')
  }

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return
    if (!sessionId) {
      router.push('/intake')
      return
    }

    const now = new Date().toISOString()
    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: text,
      createdAt: now,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setThinking(true)
    setStreaming(true)

    // update sidebar ordering / preview immediately
    upsertSessionMeta({
      id: sessionId,
      title: '',
      toneSeed,
      createdAt: now,
      updatedAt: now,
      preview: text.slice(0, 80),
    })

    // deliberate presence — he reads before he speaks
    await delay(850 + Math.floor(Math.random() * 900))

    const weId = 'we-' + Date.now()
    let acc = ''
    let started = false

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      })

      if (!res.ok || !res.body) {
        let msg = 'whiteeye went quiet. try again.'
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue
        acc += chunk
        if (!started) {
          started = true
          setThinking(false)
          setMessages((prev) => [
            ...prev,
            { id: weId, role: 'whiteeye', content: acc, createdAt: new Date().toISOString() },
          ])
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === weId ? { ...m, content: acc } : m)),
          )
        }
      }

      if (!started) {
        setThinking(false)
        setMessages((prev) => [
          ...prev,
          { id: weId, role: 'whiteeye', content: '...', createdAt: new Date().toISOString() },
        ])
      }

      // persist to local cache with final state
      setMessages((prev) => {
        cacheMessages(sessionId, prev)
        return prev
      })
      setRefreshKey((k) => k + 1)
    } catch (err: any) {
      setThinking(false)
      toast.error(err?.message ?? 'something broke in the dark')
    } finally {
      setStreaming(false)
      setTimeout(() => inputRef.current?.focus?.(), 100)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const hasSession = Boolean(sessionId)
  const isEmptyRoom = hasSession && !loading && messages.length === 0 && !thinking

  return (
    <div className="room-vignette relative flex h-[100dvh] flex-col overflow-hidden">
      <ParticleField density={30} />
      <WhiteeyeNav onToggleLogs={() => setSidebarOpen((o) => !o)} />

      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 overflow-hidden">
        {/* desktop sidebar */}
        <div className="hidden w-64 shrink-0 border-r border-border/60 md:block">
          <SessionSidebar
            currentId={sessionId}
            onSelect={selectSession}
            onNew={newSession}
            refreshKey={refreshKey}
          />
        </div>

        {/* mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative z-10 h-full w-72 border-r border-border/60 shadow-2xl">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute right-3 top-4 z-20 text-muted-foreground hover:text-foreground"
                aria-label="close logs"
              >
                <X className="h-4 w-4" />
              </button>
              <SessionSidebar
                currentId={sessionId}
                onSelect={selectSession}
                onNew={newSession}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        )}

        {/* chat column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!hasSession && !loading ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <EyeOfHorus className="mb-6 h-16 w-28 text-white/80" animate />
              <p className="font-mono text-lg lowercase text-foreground">
                you haven&rsquo;t entered yet.
              </p>
              <p className="mt-2 max-w-sm font-mono text-sm lowercase leading-relaxed text-muted-foreground">
                the room asks a few things of you before you sit down.
              </p>
              <button
                onClick={() => router.push('/intake')}
                className="mt-6 rounded-md border border-[hsl(214_90%_58%_/_0.4)] bg-[hsl(214_90%_58%_/_0.08)] px-6 py-2.5 font-mono text-xs lowercase tracking-widest text-foreground transition-all hover:border-[hsl(214_90%_58%_/_0.8)] hover:bg-[hsl(214_90%_58%_/_0.16)]"
              >
                enter the room
              </button>
            </div>
          ) : (
            <>
              <div className="scrollbar-none flex-1 overflow-y-auto">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
                  {/* opening line */}
                  {(messages.length > 0 || isEmptyRoom) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.2 }}
                      className="flex w-full justify-start"
                    >
                      <div className="max-w-[86%] border-l-2 border-[hsl(0_0%_25%)] pl-4 sm:max-w-[75%]">
                        <p className="font-mono text-[0.95rem] leading-relaxed text-muted-foreground">
                          you&rsquo;re here. sit. say what you came to say &mdash; or don&rsquo;t. i&rsquo;m
                          watching either way.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {messages.map((m) => (
                    <MessageView key={m?.id} message={m} />
                  ))}

                  {thinking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="pl-4"
                    >
                      <EyeIndicator label="he is reading you" />
                    </motion.div>
                  )}

                  <div ref={bottomRef} />
                </div>
              </div>

              {/* input */}
              <div className="border-t border-border/60 bg-[hsl(0_0%_4%_/_0.6)] backdrop-blur-sm">
                <div className="mx-auto w-full max-w-2xl px-4 py-4">
                  <div className="flex items-end gap-2 rounded-lg border border-border bg-[hsl(0_0%_7%)] px-3 py-2 focus-within:border-[hsl(214_90%_58%_/_0.5)]">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      placeholder="say it plainly..."
                      className="scrollbar-none max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-1 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                    <button
                      onClick={send}
                      disabled={streaming || !input.trim()}
                      aria-label="send"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue transition-colors hover:bg-[hsl(214_90%_58%_/_0.14)] disabled:opacity-30"
                    >
                      <SendHorizonal className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 px-1 font-mono text-[0.62rem] text-muted-foreground/50">
                    he does not coddle. he will not answer what you already know.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
