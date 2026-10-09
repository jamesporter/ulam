import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { strokesFor } from './heroSketch'
import { prepareCanvas, rampAt, useColours } from './useColours'

export function HeroArt({ seed, className }: { seed: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const colours = useColours()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const size = canvas.clientWidth
    const ctx = prepareCanvas(canvas, size, size)
    const strokes = strokesFor(seed || ' ')
    const steps = strokes[0]?.path.length ?? 0
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = reduced ? steps - 1 : 1
    let raf = 0

    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const s of strokes) {
        ctx.strokeStyle = rampAt(colours.ramp, s.t)
        ctx.lineWidth = s.width * size * 0.0042
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        for (let i = 0; i <= frame; i++) {
          const [x, y] = s.path[i]
          if (i === 0) ctx.moveTo(x * size, y * size)
          else ctx.lineTo(x * size, y * size)
        }
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.fillStyle = rampAt(colours.ramp, s.t)
        ctx.beginPath()
        ctx.arc(s.path[0][0] * size, s.path[0][1] * size, s.width * size * 0.004, 0, Math.PI * 2)
        ctx.fill()
      }
      if (frame < steps - 1) {
        frame++
        raf = requestAnimationFrame(draw)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [seed, colours])

  return <canvas ref={ref} className={cn('aspect-square w-full', className)} aria-label={`Generative art drawn from the seed ${seed}`} role="img" />
}
