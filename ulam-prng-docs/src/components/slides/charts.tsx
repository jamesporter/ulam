import type { ReactNode } from 'react'
import { fmt } from '@/lib/stats'
import { linear, niceTicks, type Scale } from '@/components/viz/scale'
import { Key, Measure } from './kit'

export type Domain = [number, number]

function logScale([d0, d1]: Domain, [r0, r1]: Domain): Scale {
  const l0 = Math.log10(d0)
  const k = (r1 - r0) / (Math.log10(d1) - l0)
  return (v) => r0 + (Math.log10(v) - l0) * k
}

function logTicks([lo, hi]: Domain): number[] {
  const out: number[] = []
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    const t = 10 ** e
    if (t >= lo * 0.999 && t <= hi * 1.001) out.push(t)
  }
  return out
}

const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** 10³ rather than 1000, for log axes. */
export function powerOfTen(t: number): string {
  const e = Math.round(Math.log10(t))
  if (e >= 0 && e <= 3) return String(10 ** e)
  return `10${String(e)
    .split('')
    .map((c) => (c === '-' ? '⁻' : superscripts[Number(c)]))
    .join('')}`
}

export type Plot = {
  x: Scale
  y: Scale
  width: number
  height: number
  /** The edges of the plotting area */
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * Axes that fill the panel they are in, with the plot drawn by a function of
 * the scales. Log scales are for counts and sizes that span decades.
 */
export function Chart({
  x: xDomain,
  y: yDomain,
  xLog,
  yLog,
  xTicks,
  yTicks,
  xFormat,
  yFormat,
  hideY,
  xLabel,
  yLabel,
  keyItems,
  label,
  square,
  children,
}: {
  /** Keep the plotting area square, for pictures of points in a plane */
  square?: boolean
  x: Domain
  y: Domain
  xLog?: boolean
  yLog?: boolean
  xTicks?: number[]
  yTicks?: number[]
  xFormat?: (t: number) => string
  yFormat?: (t: number) => string
  hideY?: boolean
  xLabel?: string
  yLabel?: string
  keyItems?: { label: string; className: string; line?: boolean }[]
  label: string
  children: (plot: Plot) => ReactNode
}) {
  return (
    <>
      {keyItems && <Key items={keyItems} />}
      <Measure>
        {({ width, height }) => {
          let left = hideY ? 16 : 50
          let right = width - 18
          let top = keyItems ? 38 : 18
          let bottom = height - (xLabel ? 44 : 30)
          if (square) {
            const side = Math.min(right - left, bottom - top)
            left += (right - left - side) / 2
            right = left + side
            top += (bottom - top - side) / 2
            bottom = top + side
          }
          const x = (xLog ? logScale : linear)(xDomain, [left, right])
          const y = (yLog ? logScale : linear)(yDomain, [bottom, top])
          const xt = xTicks ?? (xLog ? logTicks(xDomain) : niceTicks(xDomain[0], xDomain[1], Math.max(3, Math.round(width / 90))))
          const yt = yTicks ?? (yLog ? logTicks(yDomain) : niceTicks(yDomain[0], yDomain[1], Math.max(3, Math.round(height / 70))))
          const xf = xFormat ?? (xLog ? powerOfTen : (t: number) => fmt(t, 2))
          const yf = yFormat ?? (yLog ? powerOfTen : (t: number) => fmt(t, 2))
          return (
            <svg width={width} height={height} className="block" role="img" aria-label={label}>
              {!hideY &&
                yt.map((t) => (
                  <g key={t} transform={`translate(0,${y(t)})`}>
                    <line x1={left} x2={right} className="stroke-foreground/8" />
                    <text x={left - 8} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
                      {yf(t)}
                    </text>
                  </g>
                ))}
              {children({ x, y, width, height, left, right, top, bottom })}
              <line x1={left} x2={right} y1={bottom} y2={bottom} className="stroke-foreground/30" />
              {xt.map((t) => (
                <g key={t} transform={`translate(${x(t)},${bottom})`}>
                  <line y2={5} className="stroke-foreground/30" />
                  <text y={18} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                    {xf(t)}
                  </text>
                </g>
              ))}
              {xLabel && (
                <text x={(left + right) / 2} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                  {xLabel}
                </text>
              )}
              {yLabel && !hideY && (
                <text x={left + 4} y={top - 6} className="fill-muted-foreground text-[11px]">
                  {yLabel}
                </text>
              )}
            </svg>
          )
        }}
      </Measure>
    </>
  )
}

/** An SVG path through points, skipping anything that is not finite. */
export function linePath(points: [number, number][], x: Scale, y: Scale, clampY?: Domain): string {
  let d = ''
  let pen = false
  for (const [a, b] of points) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      pen = false
      continue
    }
    const yy = clampY ? Math.max(clampY[1], Math.min(clampY[0], y(b))) : y(b)
    d += `${pen ? 'L' : 'M'}${x(a).toFixed(1)},${yy.toFixed(1)}`
    pen = true
  }
  return d
}

/** Draws binned into densities over `domain`. */
export function binDensities(draws: ArrayLike<number>, [lo, hi]: Domain, bins: number) {
  const width = (hi - lo) / bins
  const counts = new Array<number>(bins).fill(0)
  let outside = 0
  for (let i = 0; i < draws.length; i++) {
    const v = draws[i]
    const b = Math.floor((v - lo) / width)
    if (b >= 0 && b < bins) counts[b]++
    else if (v === hi) counts[bins - 1]++
    else outside++
  }
  return { density: counts.map((c) => c / (draws.length * width || 1)), outside, width }
}

/**
 * A histogram of continuous draws, with the density they should follow drawn
 * over the top: the picture of a sampler doing its job.
 */
export function DensityChart({
  draws,
  domain,
  pdf,
  reference,
  referenceLabel,
  bins = 64,
  label,
  xFormat,
  xLabel,
}: {
  draws: ArrayLike<number>
  domain: Domain
  pdf?: (x: number) => number
  /** A second curve to compare against, dashed */
  reference?: (x: number) => number
  referenceLabel?: string
  bins?: number
  label: string
  xFormat?: (t: number) => string
  xLabel?: string
}) {
  const [lo, hi] = domain
  const { density, width } = binDensities(draws, domain, bins)
  const curve: [number, number][] = []
  if (pdf) for (let i = 0; i <= 300; i++) {
    const xv = lo + ((hi - lo) * i) / 300
    curve.push([xv, pdf(xv)])
  }
  const maxBar = Math.max(...density)
  const finite = curve.map(([, v]) => v).filter(Number.isFinite)
  const maxCurve = finite.length ? Math.max(...finite) : 0
  const yMax = Math.max(maxBar, Math.min(maxCurve, maxBar * 1.6 || maxCurve)) * 1.08 || 1
  const keyItems = [
    { label: 'sampled', className: 'bg-brand/70' },
    ...(pdf ? [{ label: 'exact density', className: 'bg-brand-2', line: true }] : []),
    ...(reference ? [{ label: referenceLabel ?? 'reference', className: 'bg-foreground/40', line: true }] : []),
  ]

  return (
    <Chart x={domain} y={[0, yMax]} hideY keyItems={keyItems} label={label} xFormat={xFormat} xLabel={xLabel}>
      {({ x, y, bottom, top }) => (
        <>
          {density.map((d, i) => {
            const x0 = x(lo + i * width)
            const x1 = x(lo + (i + 1) * width)
            const yy = y(Math.min(d, yMax))
            return <rect key={i} x={x0 + 0.5} width={Math.max(0.5, x1 - x0 - 1)} y={yy} height={bottom - yy} className="fill-brand/60" rx={1} />
          })}
          {reference && (
            <path
              d={linePath(
                curve.map(([xv]) => [xv, reference(xv)]),
                x,
                y,
                [bottom, top - 10],
              )}
              className="fill-none stroke-foreground/45"
              strokeDasharray="5 5"
              strokeWidth={1.75}
            />
          )}
          {pdf && <path d={linePath(curve, x, y, [bottom, top - 10])} className="fill-none stroke-brand-2" strokeWidth={2.75} strokeLinejoin="round" />}
        </>
      )}
    </Chart>
  )
}

/** Observed frequencies as bars, with the exact probability of each marked across it. */
export function BarsChart({
  labels,
  observed,
  expected,
  label,
  xLabel,
  observedLabel = 'sampled',
  expectedLabel = 'exact probability',
  colours,
}: {
  labels: string[]
  observed: number[]
  expected?: number[]
  label: string
  xLabel?: string
  observedLabel?: string
  expectedLabel?: string
  /** A colour per bar, as CSS */
  colours?: string[]
}) {
  const n = labels.length
  const yMax = Math.max(...observed, ...(expected ?? [])) * 1.12 || 1
  const every = Math.ceil(n / 24)
  const keyItems = [
    { label: observedLabel, className: 'bg-brand/70' },
    ...(expected ? [{ label: expectedLabel, className: 'bg-brand-2', line: true }] : []),
  ]
  return (
    <Chart
      x={[-0.5, n - 0.5]}
      y={[0, yMax]}
      xTicks={labels.map((_, i) => i).filter((i) => i % every === 0)}
      xFormat={(i) => labels[i] ?? ''}
      yFormat={(t) => fmt(t, 3)}
      keyItems={keyItems}
      label={label}
      xLabel={xLabel}
    >
      {({ x, y, bottom }) => {
        const slot = x(1) - x(0)
        const bw = Math.max(1.5, Math.min(slot * 0.66, 64))
        return (
          <>
            {observed.map((v, i) => (
              <rect
                key={i}
                x={x(i) - bw / 2}
                width={bw}
                y={y(v)}
                height={Math.max(0, bottom - y(v))}
                rx={2}
                className={colours ? undefined : 'fill-brand/60'}
                style={colours ? { fill: colours[i % colours.length], opacity: 0.8 } : undefined}
              />
            ))}
            {expected?.map((v, i) => (
              <line
                key={i}
                x1={x(i) - bw / 2 - 3}
                x2={x(i) + bw / 2 + 3}
                y1={y(v)}
                y2={y(v)}
                className="stroke-brand-2"
                strokeWidth={2.75}
                strokeLinecap="round"
              />
            ))}
          </>
        )
      }}
    </Chart>
  )
}
