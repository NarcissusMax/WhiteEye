'use client'

// the typing indicator — not dots. a pulsing eye opening and closing in the dark.
export function EyeIndicator({ label = 'whiteeye is here' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <span className="relative inline-flex h-6 w-6 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[hsl(214_90%_58%_/_0.18)] animate-eye-pulse" />
        <svg viewBox="0 0 40 24" className="h-5 w-5 eye-glow">
          <path
            d="M2 12 Q20 1 38 12 Q20 23 2 12 Z"
            fill="none"
            stroke="hsl(214 90% 58%)"
            strokeWidth={2}
            className="animate-blink"
            style={{ transformOrigin: 'center' }}
          />
          <circle cx={20} cy={12} r={4.5} fill="hsl(214 90% 58%)" className="animate-eye-pulse" style={{ transformOrigin: '20px 12px' }} />
          <circle cx={20} cy={12} r={1.8} fill="#050505" />
        </svg>
      </span>
      <span className="text-xs tracking-widest lowercase animate-flicker">{label}</span>
    </div>
  )
}
