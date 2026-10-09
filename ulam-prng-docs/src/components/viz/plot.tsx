import type { ReactNode } from 'react'
import { fmt } from '@/lib/stats'
import { niceTicks, plotSize, type Scale } from './scale'

/** An SVG plot area with an x axis; children draw inside it. */
export function PlotFrame({
  x,
  domain,
  ticks,
  tickLabel = (t) => fmt(t, 2),
  children,
  height = plotSize.height,
  label,
}: {
  x: Scale
  domain: [number, number]
  ticks?: number[]
  tickLabel?: (t: number) => string
  children: ReactNode
  height?: number
  label: string
}) {
  const { width, bottom } = plotSize
  const baseline = height - bottom
  const tks = ticks ?? niceTicks(domain[0], domain[1], 7)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={label}>
      {children}
      <line x1={x(domain[0])} x2={x(domain[1])} y1={baseline} y2={baseline} className="stroke-foreground/30" />
      {tks.map((t) => (
        <g key={t} transform={`translate(${x(t)},${baseline})`}>
          <line y2={5} className="stroke-foreground/30" />
          <text y={18} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
            {tickLabel(t)}
          </text>
        </g>
      ))}
    </svg>
  )
}
