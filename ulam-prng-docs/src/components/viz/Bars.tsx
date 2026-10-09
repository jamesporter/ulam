import { linear, plotSize } from './scale'

/** Frequencies as bars, with the frequency each should have marked across them. */
export function Bars({
  values,
  expected,
  labels,
  label,
  height = 220,
  width = plotSize.width,
}: {
  values: number[]
  expected: number[]
  labels: string[]
  label: string
  height?: number
  width?: number
}) {
  const { left, right, top } = plotSize
  const bottom = 26
  const n = values.length
  const yMax = Math.max(...values, ...expected) * 1.12 || 1
  const y = linear([0, yMax], [height - bottom, top])
  const slot = (width - left - right) / n
  const bw = Math.min(slot * 0.7, 60)
  const every = Math.ceil(n / 24)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={label}>
      {values.map((v, i) => {
        const cx = left + slot * (i + 0.5)
        return (
          <g key={i}>
            <rect x={cx - bw / 2} width={bw} y={y(v)} height={height - bottom - y(v)} className="fill-brand/65" rx={2} />
            <line x1={cx - bw / 2 - 3} x2={cx + bw / 2 + 3} y1={y(expected[i])} y2={y(expected[i])} className="stroke-brand-2" strokeWidth={2.5} strokeLinecap="round" />
            {i % every === 0 && (
              <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                {labels[i]}
              </text>
            )}
          </g>
        )
      })}
      <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} className="stroke-foreground/30" />
    </svg>
  )
}
