'use client'

import { useEffect, useRef } from 'react'

// slow drifting dust — the room is not empty. lightweight canvas, cleaned up on unmount.
export function ParticleField({ density = 60 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    const particles: {
      x: number
      y: number
      r: number
      vx: number
      vy: number
      a: number
      tw: number
    }[] = []

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const seed = () => {
      particles.length = 0
      const count = Math.max(20, Math.min(density, 90))
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.6 + 0.3,
          vx: (Math.random() - 0.5) * 0.12,
          vy: -(Math.random() * 0.25 + 0.05),
          a: Math.random() * 0.5 + 0.1,
          tw: Math.random() * Math.PI * 2,
        })
      }
    }

    resize()
    seed()

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.tw += 0.02
        if (p.y < -5) {
          p.y = height + 5
          p.x = Math.random() * width
        }
        if (p.x < -5) p.x = width + 5
        if (p.x > width + 5) p.x = -5
        const flicker = 0.6 + Math.sin(p.tw) * 0.4
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(150, 190, 255, ${p.a * flicker})`
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(render)
    }

    render()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      aria-hidden="true"
    />
  )
}
