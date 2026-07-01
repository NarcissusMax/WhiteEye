'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ScrollText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getSessionIndex,
  removeSessionMeta,
} from '@/lib/session-store'
import type { SessionMeta } from '@/lib/types'

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  return `${w}w ago`
}

export function SessionSidebar({
  currentId,
  onSelect,
  onNew,
  className,
  refreshKey = 0,
}: {
  currentId?: string | null
  onSelect: (id: string) => void
  onNew: () => void
  className?: string
  refreshKey?: number
}) {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSessions(getSessionIndex())
  }, [refreshKey])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeSessionMeta(id)
    setSessions(getSessionIndex())
    fetch(`/api/sessions/${id}`, { method: 'DELETE' }).catch(() => {})
    toast('the log is gone.', { icon: '🗑' })
  }

  return (
    <aside
      className={cn(
        'flex h-full w-full flex-col bg-[hsl(0_0%_4.5%)]',
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ScrollText className="h-3.5 w-3.5" />
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.35em]">
            session logs
          </span>
        </div>
      </div>

      <button
        onClick={onNew}
        className="mx-3 mb-3 inline-flex items-center justify-center gap-2 rounded-md border border-[hsl(214_90%_58%_/_0.3)] bg-[hsl(214_90%_58%_/_0.06)] px-3 py-2 font-mono text-xs lowercase tracking-wide text-foreground transition-all hover:border-[hsl(214_90%_58%_/_0.7)] hover:bg-[hsl(214_90%_58%_/_0.12)]"
      >
        <Plus className="h-3.5 w-3.5 text-blue" />
        new session
      </button>

      <div className="scrollbar-none flex-1 overflow-y-auto px-3 pb-4">
        {!mounted ? null : sessions.length === 0 ? (
          <p className="px-2 py-6 text-center font-mono text-[0.7rem] leading-relaxed text-muted-foreground/60">
            no logs yet. everything you say here stays only in your own room.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sessions.map((s) => {
              const active = s?.id === currentId
              return (
                <li key={s?.id}>
                  <button
                    onClick={() => onSelect(s?.id)}
                    className={cn(
                      'group flex w-full flex-col items-start gap-1 rounded-md px-3 py-2.5 text-left transition-colors',
                      active
                        ? 'bg-[hsl(214_90%_58%_/_0.1)] shadow-[inset_2px_0_0_0_hsl(214_90%_58%)]'
                        : 'hover:bg-secondary',
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs lowercase text-foreground">
                        {s?.title || 'untitled'}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDelete(e, s?.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleDelete(e as unknown as React.MouseEvent, s?.id)
                        }}
                        aria-label="delete session"
                        className="shrink-0 rounded p-1 text-muted-foreground/50 opacity-0 transition-all hover:text-red group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    </div>
                    {s?.preview && (
                      <span className="line-clamp-1 w-full truncate font-mono text-[0.65rem] text-muted-foreground/70">
                        {s.preview}
                      </span>
                    )}
                    <span className="font-mono text-[0.6rem] uppercase tracking-wide text-muted-foreground/50">
                      {relativeTime(s?.updatedAt || s?.createdAt)}
                      {s?.toneSeed ? ` · ${s.toneSeed}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
