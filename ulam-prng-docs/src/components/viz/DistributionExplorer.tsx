import { Lock, LockOpen, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RNG } from 'ulam-prng'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Button } from '@/components/ui/button'
import {
  defaults,
  type ContinuousDistribution,
  type DiscreteDistribution,
  type Distribution,
  type SimplexDistribution,
  type Values,
} from '@/content/distributions'
import { describe, fmt, normalPdf } from '@/lib/stats'
import { Demo, ParamSlider, SeedControl, Segmented } from './controls'
import { seedLiteral, useSeed, type Seed } from './seed'
import { PlotFrame } from './plot'
import { linear, plotSize } from './scale'

const sampleSizes = [
  { value: 1000, label: '1k' },
  { value: 10000, label: '10k' },
  { value: 100000, label: '100k' },
]

/**
 * The interactive heart of each distribution page: draw a few thousand values
 * with the real library, histogram them, and lay the exact density on top.
 */
export function DistributionExplorer({ dist }: { dist: Distribution }) {
  const [raw, setRaw] = useState<Values>(() => defaults(dist))
  const values = dist.constrain ? dist.constrain(raw) : raw
  const { text, setText, seed, reroll } = useSeed('sunflower')
  const [n, setN] = useState(10000)

  const set = (key: string, v: number) => setRaw((r) => ({ ...r, [key]: v }))

  const code = `import { RNG } from "ulam-prng"

const rng = new RNG(${seedLiteral(seed)})
rng.${dist.call(values)}`

  return (
    <>
      <Demo
        title={`rng.${dist.method}`}
        caption={
          dist.kind === 'simplex'
            ? 'Each dot is one draw of three shares, placed by how much of the whole each share got.'
            : `${n.toLocaleString()} draws from the library itself, binned, with the exact ${dist.kind === 'discrete' ? 'probabilities' : 'density'} drawn over the top.`
        }
        controls={
          <>
            {dist.controls.map((c) => (
              <ParamSlider
                key={c.key}
                label={c.label}
                value={values[c.key]}
                min={c.min}
                max={c.max}
                step={c.step}
                onChange={(v) => set(c.key, v)}
              />
            ))}
            <SeedControl text={text} setText={setText} reroll={reroll} />
            <div className="flex items-end justify-between gap-3">
              <Segmented label="draws" value={n} options={sampleSizes} onChange={setN} />
              <Button variant="ghost" size="sm" onClick={() => setRaw(defaults(dist))}>
                <RotateCcw /> Reset
              </Button>
            </div>
          </>
        }
      >
        {dist.kind === 'continuous' && <ContinuousView dist={dist} values={values} seed={seed} n={n} />}
        {dist.kind === 'discrete' && <DiscreteView dist={dist} values={values} seed={seed} n={n} />}
        {dist.kind === 'simplex' && <SimplexView dist={dist} values={values} seed={seed} n={Math.min(n, 4000)} />}
      </Demo>
      <CodeBlock code={code} title="Try it" />
    </>
  )
}

/** Draws `n` values from a fresh generator, catching the library's refusals. */
function drawAll<T>(seed: Seed, n: number, draw: (rng: RNG) => T): { draws: T[]; error?: string } {
  const rng = new RNG(seed)
  const draws: T[] = []
  try {
    for (let i = 0; i < n; i++) draws.push(draw(rng))
    return { draws }
  } catch (e) {
    return { draws: [], error: e instanceof Error ? e.message : String(e) }
  }
}

/** Draws for a distribution, recomputed only when what they depend on changes. */
function useDraws<T>(dist: { sample: (rng: RNG, v: Values) => T }, values: Values, seed: Seed, n: number) {
  const key = JSON.stringify(values)
  return useMemo(() => {
    const v = JSON.parse(key) as Values
    return drawAll(seed, n, (rng) => dist.sample(rng, v))
  }, [dist, key, seed, n])
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex h-70 flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="font-mono text-sm text-destructive">Error: {message}</p>
      <p className="text-xs text-muted-foreground">The library refuses these parameters, as it should.</p>
    </div>
  )
}

function Stats({ items }: { items: { label: string; sample: number; exact?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 px-5 pb-4 font-mono text-xs">
      {items.map((s) => (
        <span key={s.label} className="text-muted-foreground">
          {s.label} <span className="text-brand">{fmt(s.sample)}</span>
          {s.exact !== undefined && (
            <>
              {' '}
              <span title="exact">vs</span> <span className="text-brand-2">{Number.isNaN(s.exact) ? 'undefined' : fmt(s.exact)}</span>
            </>
          )}
        </span>
      ))}
    </div>
  )
}

function Legend({ curve }: { curve: string }) {
  return (
    <div className="pointer-events-none absolute top-3 right-4 flex gap-3 rounded-md bg-card/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-brand/70" /> sampled
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 rounded bg-brand-2" /> {curve}
      </span>
    </div>
  )
}

function ContinuousView({ dist, values, seed, n }: { dist: ContinuousDistribution; values: Values; seed: Seed; n: number }) {
  const { draws, error } = useDraws(dist, values, seed, n)
  const [locked, setLocked] = useState<[number, number] | null>(null)

  if (error) return <ErrorPanel message={error} />

  const auto = dist.view(values)
  const [lo, hi] = locked ?? auto
  const bins = 72
  const width = (hi - lo) / bins
  const counts = new Array<number>(bins).fill(0)
  let outside = 0
  for (const v of draws) {
    const b = Math.floor((v - lo) / width)
    if (b >= 0 && b < bins) counts[b]++
    else if (v === hi) counts[bins - 1]++
    else outside++
  }
  const density = counts.map((c) => c / (draws.length * width))

  const { left, right, top, bottom, width: W, height: H } = plotSize
  const x = linear([lo, hi], [left, W - right])

  const curve: [number, number][] = []
  const steps = 320
  for (let i = 0; i <= steps; i++) {
    const xv = lo + ((hi - lo) * i) / steps
    curve.push([xv, dist.pdf(xv, values)])
  }
  const maxBar = Math.max(...density)
  const finiteCurve = curve.map(([, y]) => y).filter(Number.isFinite)
  const maxCurve = Math.max(...finiteCurve)
  const yMax = Math.max(maxBar, Math.min(maxCurve, maxBar * 1.6 || maxCurve)) * 1.08 || 1
  const y = linear([0, yMax], [H - bottom, top])

  const path = curve
    .map(([xv, yv], i) => `${i === 0 ? 'M' : 'L'}${x(xv).toFixed(1)},${y(Number.isFinite(yv) ? Math.min(yv, yMax * 1.2) : yMax * 1.2).toFixed(1)}`)
    .join('')

  const { mean, sd } = describe(draws)
  const exactMean = dist.mean?.(values)
  const exactVar = dist.variance?.(values)

  return (
    <div className="relative">
      <Legend curve="exact density" />
      <PlotFrame x={x} domain={[lo, hi]} label={`Histogram of ${dist.title} draws`}>
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--brand)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--brand)" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {density.map((d, i) => {
          const x0 = x(lo + i * width)
          const x1 = x(lo + (i + 1) * width)
          const yy = y(Math.min(d, yMax))
          return <rect key={i} x={x0 + 0.5} width={Math.max(0, x1 - x0 - 1)} y={yy} height={H - bottom - yy} fill="url(#bar-grad)" rx={1} />
        })}
        {dist.id === 'student-t' && (
          <path
            d={curve.map(([xv], i) => `${i === 0 ? 'M' : 'L'}${x(xv).toFixed(1)},${y(normalPdf(xv)).toFixed(1)}`).join('')}
            className="fill-none stroke-foreground/40"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        )}
        <path d={path} className="fill-none stroke-brand-2" strokeWidth={2.5} strokeLinejoin="round" />
      </PlotFrame>
      <div className="flex flex-wrap items-center justify-between gap-2 pr-3">
        <Stats
          items={[
            { label: 'mean', sample: mean, exact: exactMean },
            { label: 'sd', sample: sd, exact: exactVar === undefined ? undefined : Math.sqrt(exactVar) },
          ]}
        />
        <div className="flex items-center gap-2 pb-4 pl-5 text-xs text-muted-foreground">
          {outside > 0 && <span>{((outside / draws.length) * 100).toFixed(outside / draws.length < 0.01 ? 2 : 1)}% beyond the axes</span>}
          <Button variant="ghost" size="xs" onClick={() => setLocked(locked ? null : [lo, hi])} title="Fix the axes so parameter changes show as movement">
            {locked ? <Lock /> : <LockOpen />}
            {locked ? 'Axes locked' : 'Lock axes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function DiscreteView({ dist, values, seed, n }: { dist: DiscreteDistribution; values: Values; seed: Seed; n: number }) {
  const { draws, error } = useDraws(dist, values, seed, n)
  if (error) return <ErrorPanel message={error} />

  const [kMin, kMax] = dist.support(values)
  const ks: number[] = []
  for (let k = kMin; k <= kMax; k++) ks.push(k)
  const counts = new Map<number, number>()
  let beyond = 0
  for (const v of draws) {
    if (v > kMax) beyond++
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const freq = ks.map((k) => (counts.get(k) ?? 0) / draws.length)
  const probs = ks.map((k) => dist.pmf(k, values))

  const { left, right, top, bottom, width: W, height: H } = plotSize
  const x = linear([kMin - 0.5, kMax + 0.5], [left, W - right])
  const yMax = Math.max(...freq, ...probs) * 1.1 || 1
  const y = linear([0, yMax], [H - bottom, top])
  const slot = x(1) - x(0)
  const barW = Math.max(2, Math.min(slot * 0.62, 56))
  const labelEvery = Math.ceil(ks.length / 20)

  const { mean, sd } = describe(draws)
  const exactVar = dist.variance?.(values)

  return (
    <div className="relative">
      <Legend curve="exact probability" />
      <PlotFrame
        x={x}
        domain={[kMin - 0.5, kMax + 0.5]}
        ticks={ks.filter((_, i) => i % labelEvery === 0)}
        tickLabel={(k) => dist.label?.(k, values) ?? String(k)}
        label={`Bar chart of ${dist.title} draws`}
      >
        {ks.map((k, i) => {
          const yy = y(freq[i])
          return <rect key={k} x={x(k) - barW / 2} width={barW} y={yy} height={H - bottom - yy} className="fill-brand/65" rx={2} />
        })}
        {ks.map((k, i) => (
          <g key={k}>
            <line x1={x(k) - barW / 2 - 3} x2={x(k) + barW / 2 + 3} y1={y(probs[i])} y2={y(probs[i])} className="stroke-brand-2" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        ))}
      </PlotFrame>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stats
          items={[
            { label: 'mean', sample: mean, exact: dist.mean?.(values) },
            { label: 'sd', sample: sd, exact: exactVar === undefined ? undefined : Math.sqrt(exactVar) },
          ]}
        />
        {beyond > 0 && <span className="px-5 pb-4 text-xs text-muted-foreground">{((beyond / draws.length) * 100).toFixed(2)}% beyond the axes</span>}
      </div>
    </div>
  )
}

/** Barycentric coordinates to a point in an equilateral triangle. */
function ternary([a, b, c]: number[], size: number, pad: number): [number, number] {
  const h = (size * Math.sqrt(3)) / 2
  const ax = pad + size / 2
  const ay = pad
  const bx = pad
  const by = pad + h
  const cx = pad + size
  const cy = pad + h
  return [a * ax + b * bx + c * cx, a * ay + b * by + c * cy]
}

function SimplexView({ dist, values, seed, n }: { dist: SimplexDistribution; values: Values; seed: Seed; n: number }) {
  const { draws, error } = useDraws(dist, values, seed, n)
  if (error) return <ErrorPanel message={error} />

  const size = 300
  const pad = 26
  const h = (size * Math.sqrt(3)) / 2
  const corners = [ternary([1, 0, 0], size, pad), ternary([0, 1, 0], size, pad), ternary([0, 0, 1], size, pad)]
  const colours = ['var(--brand)', 'var(--brand-2)', 'var(--chart-3)']
  const strip = draws.slice(0, 14)

  return (
    <div className="grid items-center gap-4 p-4 sm:grid-cols-[1fr_1fr]">
      <svg viewBox={`0 0 ${size + pad * 2} ${h + pad * 2}`} className="mx-auto block w-full max-w-sm" role="img" aria-label="Dirichlet draws on a triangle">
        <polygon points={corners.map((p) => p.join(',')).join(' ')} className="fill-muted/40 stroke-foreground/25" />
        {draws.map((d, i) => {
          const [px, py] = ternary(d, size, pad)
          return <circle key={i} cx={px} cy={py} r={1.4} className="fill-brand" opacity={0.45} />
        })}
        {corners.map(([cx, cy], i) => (
          <text key={i} x={cx} y={i === 0 ? cy - 10 : cy + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
            share {i}
          </text>
        ))}
      </svg>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">The first {strip.length} draws, as a whole split three ways</p>
        <div className="space-y-1">
          {strip.map((d, i) => (
            <div key={i} className="flex h-4 overflow-hidden rounded-sm">
              {d.map((share, j) => (
                <div key={j} style={{ width: `${share * 100}%`, background: colours[j] }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
