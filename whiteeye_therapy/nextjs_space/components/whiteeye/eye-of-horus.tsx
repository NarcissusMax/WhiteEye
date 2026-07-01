import { cn } from '@/lib/utils'

// the wadjet / eye of horus motif — whiteeye's recurring symbol.
// pure svg, no hooks, safe in server or client trees.
export function EyeOfHorus({
  className,
  animate = false,
  glow = true,
}: {
  className?: string
  animate?: boolean
  glow?: boolean
}) {
  return (
    <svg
      viewBox="0 0 100 62"
      fill="none"
      aria-hidden="true"
      className={cn(glow && 'eye-glow', className)}
    >
      {/* brow */}
      <path
        d="M9 17 Q42 3 80 13"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* upper lid */}
      <path
        d="M7 31 Q42 11 84 25"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* lower lid */}
      <path
        d="M8 31 Q40 44 72 35"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* the descending line (the tear) */}
      <path
        d="M30 36 L23 57"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* the curl / spiral */}
      <path
        d="M60 35 Q66 49 53 51 Q46 51 49 45"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* iris */}
      <circle
        cx={41}
        cy={28}
        r={8}
        fill="hsl(214 90% 58%)"
        className={animate ? 'animate-eye-pulse' : ''}
        style={{ transformOrigin: '41px 28px' }}
      />
      <circle cx={41} cy={28} r={3.4} fill="#0a0a0a" />
      <circle cx={38.5} cy={25.5} r={1.4} fill="#dbeafe" opacity={0.9} />
    </svg>
  )
}
