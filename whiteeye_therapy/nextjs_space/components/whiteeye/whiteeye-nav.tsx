'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeft, MessageSquareText } from 'lucide-react'
import { EyeOfHorus } from './eye-of-horus'
import { AmbientSound } from './ambient-sound'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/chat', label: 'the room' },
  { href: '/mirror', label: 'the mirror' },
]

export function WhiteeyeNav({
  onToggleLogs,
}: {
  onToggleLogs?: () => void
}) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-[hsl(0_0%_4%_/_0.72)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          {onToggleLogs && (
            <button
              onClick={onToggleLogs}
              aria-label="toggle session logs"
              className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <Link href="/" className="flex items-center gap-2.5 group">
            <EyeOfHorus className="h-6 w-10 text-white transition-transform group-hover:scale-105" glow />
            <span className="font-mono text-sm lowercase tracking-widest text-foreground">
              whiteeye
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-md px-3 py-1.5 font-mono text-xs lowercase tracking-wide transition-colors',
                  active
                    ? 'bg-[hsl(214_90%_58%_/_0.12)] text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {l.label}
              </Link>
            )
          })}
          <div className="ml-1 hidden sm:block">
            <AmbientSound />
          </div>
        </nav>
      </div>
    </header>
  )
}

export { MessageSquareText }
