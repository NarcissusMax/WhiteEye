'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

// a low ambient hum generated in-browser with the web audio api — no external files.
// starts only on a user click (respects autoplay policy).
export function AmbientSound({ className }: { className?: string }) {
  const [on, setOn] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{ gain: GainNode; oscs: OscillatorNode[] } | null>(null)

  const stop = () => {
    const nodes = nodesRef.current
    const ctx = ctxRef.current
    if (nodes && ctx) {
      try {
        nodes.gain.gain.cancelScheduledValues(ctx.currentTime)
        nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, ctx.currentTime)
        nodes.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
        nodes.oscs.forEach((o) => o.stop(ctx.currentTime + 0.7))
      } catch {
        // ignore
      }
    }
    nodesRef.current = null
  }

  const start = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!ctxRef.current) ctxRef.current = new AudioCtx()
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.5)

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(320, ctx.currentTime)

      const o1 = ctx.createOscillator()
      o1.type = 'sine'
      o1.frequency.setValueAtTime(52, ctx.currentTime)
      const o2 = ctx.createOscillator()
      o2.type = 'sine'
      o2.frequency.setValueAtTime(52.4, ctx.currentTime)
      const o3 = ctx.createOscillator()
      o3.type = 'triangle'
      o3.frequency.setValueAtTime(78, ctx.currentTime)

      // slow drifting lfo on the filter for a breathing quality
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.setValueAtTime(0.08, ctx.currentTime)
      const lfoGain = ctx.createGain()
      lfoGain.gain.setValueAtTime(80, ctx.currentTime)
      lfo.connect(lfoGain)
      lfoGain.connect(filter.frequency)

      o1.connect(filter)
      o2.connect(filter)
      o3.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      o1.start()
      o2.start()
      o3.start()
      lfo.start()

      nodesRef.current = { gain, oscs: [o1, o2, o3, lfo] }
    } catch {
      // audio unavailable — fail silently
    }
  }

  const toggle = () => {
    if (on) {
      stop()
      setOn(false)
    } else {
      start()
      setOn(true)
    }
  }

  useEffect(() => {
    return () => {
      stop()
      ctxRef.current?.close?.().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'silence the hum' : 'let the hum in'}
      title={on ? 'silence' : 'ambient hum'}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs lowercase tracking-wide text-muted-foreground transition-colors hover:border-[hsl(214_90%_58%_/_0.5)] hover:text-foreground',
        className,
      )}
    >
      {on ? (
        <Volume2 className="h-3.5 w-3.5 text-blue" />
      ) : (
        <VolumeX className="h-3.5 w-3.5" />
      )}
      <span>{on ? 'hum' : 'silence'}</span>
    </button>
  )
}
