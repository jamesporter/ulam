import { useMemo } from 'react'
import { useTheme } from '@/lib/theme'

export type Colours = {
  brand: string
  brand2: string
  fg: string
  muted: string
  bg: string
  card: string
  /** Steps from brand to brand-2, for colouring by a number */
  ramp: string[]
}

/** Resolves any CSS colour expression to one a canvas understands. */
function resolve(expr: string): string {
  const el = document.createElement('span')
  el.style.color = expr
  el.style.display = 'none'
  document.body.appendChild(el)
  const out = getComputedStyle(el).color
  el.remove()
  return out
}

/** The theme's colours, resolved for canvas drawing and refreshed when the theme flips. */
export function useColours(): Colours {
  const { theme } = useTheme()
  return useMemo(() => {
    void theme
    const ramp = Array.from({ length: 9 }, (_, i) =>
      resolve(`color-mix(in oklch, var(--brand) ${100 - i * 12.5}%, var(--brand-2))`),
    )
    return {
      brand: resolve('var(--brand)'),
      brand2: resolve('var(--brand-2)'),
      fg: resolve('var(--foreground)'),
      muted: resolve('var(--muted-foreground)'),
      bg: resolve('var(--background)'),
      card: resolve('var(--card)'),
      ramp,
    }
  }, [theme])
}

/** A colour from the ramp for t in [0, 1]. */
export function rampAt(ramp: string[], t: number): string {
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))))]
}

/** A canvas sized for the device's pixel ratio, ready to draw on in CSS pixels. */
export function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  return ctx
}
