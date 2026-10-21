import { RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RNG } from 'ulam-prng'
import { Button } from '@/components/ui/button'
import { ParamSlider, SeedControl, Segmented } from '@/components/viz/controls'
import { useSeed, type Seed } from '@/components/viz/seed'
import { rampAt } from '@/components/viz/useColours'
import { defaults, distributions, lit, type Distribution, type Values } from '@/content/distributions'
import { describe, fmt, normalPdf } from '@/lib/stats'
import { arts, type Art } from './art'
import { BarsChart, binDensities, Chart, DensityChart, linePath } from './charts'
import { ArtCanvas, Measure, P, SlideFrame, Stat, Stats, type Draw } from './kit'

// ---------------------------------------------------------------------------
// Inverse transform sampling

type Shaped = {
  label: string
  call: string
  domain: [number, number]
  cdf: (x: number) => number
  inverse: (u: number) => number
  sample: (rng: RNG) => number
  pdf: (x: number) => number
}

const shaped: Record<string, Shaped> = {
  exponential: {
    label: 'exponential',
    call: 'exponential()',
    domain: [0, 5],
    cdf: (x) => 1 - Math.exp(-x),
    inverse: (u) => -Math.log(1 - u),
    sample: (rng) => rng.exponential(),
    pdf: (x) => Math.exp(-x),
  },
  weibull: {
    label: 'weibull',
    call: 'weibull({ shape: 2 })',
    domain: [0, 3],
    cdf: (x) => 1 - Math.exp(-(x * x)),
    inverse: (u) => Math.sqrt(-Math.log(1 - u)),
    sample: (rng) => rng.weibull({ shape: 2 }),
    pdf: (x) => 2 * x * Math.exp(-(x * x)),
  },
  pareto: {
    label: 'pareto',
    call: 'pareto({ shape: 2 })',
    domain: [1, 6],
    cdf: (x) => (x < 1 ? 0 : 1 - x ** -2),
    inverse: (u) => 1 / Math.sqrt(1 - u),
    sample: (rng) => rng.pareto({ shape: 2 }),
    pdf: (x) => (x < 1 ? 0 : 2 * x ** -3),
  },
  cauchy: {
    label: 'cauchy',
    call: 'cauchy()',
    domain: [-8, 8],
    cdf: (x) => 0.5 + Math.atan(x) / Math.PI,
    inverse: (u) => Math.tan(Math.PI * (u - 0.5)),
    sample: (rng) => rng.cauchy(),
    pdf: (x) => 1 / (Math.PI * (1 + x * x)),
  },
}

export function InverseSlide() {
  const [which, setWhich] = useState<keyof typeof shaped>('exponential')
  const { text, setText, seed, reroll } = useSeed('warp')
  const d = shaped[which]
  const us = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: 260 }, () => rng.number())
  }, [seed])
  const draws = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: 20000 }, () => d.sample(rng))
  }, [seed, d])

  const draw: Draw = (ctx, size, c) => {
    const pad = 26
    const top = 46
    const bottom = size.height - 46
    const ux = (u: number) => pad + u * (size.width - pad * 2)
    const [lo, hi] = d.domain
    const xx = (x: number) => pad + ((x - lo) / (hi - lo)) * (size.width - pad * 2)
    const paint = (count: number) => {
      ctx.clearRect(0, 0, size.width, size.height)
      ctx.fillStyle = c.muted
      ctx.font = '11px "JetBrains Mono Variable", monospace'
      ctx.textAlign = 'left'
      ctx.fillText('u = rng.number(), uniform on [0, 1)', pad, top - 14)
      ctx.fillText(`x = F⁻¹(u): rng.${d.call}`, pad, bottom + 30)
      ctx.globalAlpha = 0.35
      ctx.fillRect(pad, top, size.width - pad * 2, 1)
      ctx.fillRect(pad, bottom, size.width - pad * 2, 1)
      for (let i = 0; i < count; i++) {
        const u = us[i]
        const x = d.inverse(u)
        const colour = rampAt(c.ramp, u)
        const endX = Math.max(-40, Math.min(size.width + 40, xx(x)))
        ctx.strokeStyle = colour
        ctx.globalAlpha = 0.28
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(ux(u), top)
        ctx.bezierCurveTo(ux(u), (top + bottom) / 2, endX, (top + bottom) / 2, endX, bottom)
        ctx.stroke()
        ctx.fillStyle = colour
        ctx.globalAlpha = 0.95
        ctx.beginPath()
        ctx.arc(ux(u), top, 3, 0, Math.PI * 2)
        ctx.fill()
        if (x >= lo && x <= hi) {
          ctx.beginPath()
          ctx.arc(endX, bottom, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    }
    let count = 0
    return () => {
      count = Math.min(us.length, count + 4)
      paint(count)
      return count < us.length
    }
  }

  const guides = us.slice(0, 14)
  const { density } = binDensities(draws, d.domain, 50)
  const maxDensity = Math.max(...density) || 1
  const curve: [number, number][] = Array.from({ length: 241 }, (_, i) => {
    const x = d.domain[0] + ((d.domain[1] - d.domain[0]) * i) / 240
    return [x, d.cdf(x)]
  })

  return (
    <SlideFrame
      kicker="Shaping randomness"
      title="Bending uniform numbers into any shape"
      visual={{ label: 'Each uniform draw, carried to where it lands', node: <ArtCanvas key={`${which}${seed}`} draw={draw} label="Uniform draws warped by an inverse CDF" /> }}
      graph={{
        label: 'The CDF, read backwards',
        note: 'u on the y axis, x on the x axis',
        node: (
          <Chart
            x={d.domain}
            y={[0, 1]}
            label="Cumulative distribution function with inverse lookups"
            xLabel="x"
            keyItems={[
              { label: 'F(x)', className: 'bg-brand-2', line: true },
              { label: 'histogram of draws', className: 'bg-brand/40' },
            ]}
          >
            {({ x, y, bottom, left }) => {
              const bw = (d.domain[1] - d.domain[0]) / density.length
              return (
                <>
                  {density.map((v, i) => {
                    const h = (v / maxDensity) * 0.45
                    return <rect key={i} x={x(d.domain[0] + i * bw) + 0.5} width={Math.max(0.5, x(d.domain[0] + bw) - x(d.domain[0]) - 1)} y={y(h)} height={bottom - y(h)} className="fill-brand/25" />
                  })}
                  {guides.map((u, i) => {
                    const xv = d.inverse(u)
                    if (xv < d.domain[0] || xv > d.domain[1]) return null
                    return (
                      <g key={i} style={{ stroke: `color-mix(in oklch, var(--brand) ${Math.round((1 - u) * 100)}%, var(--brand-2))` }} strokeWidth={1.25} opacity={0.75}>
                        <line x1={left} x2={x(xv)} y1={y(u)} y2={y(u)} strokeDasharray="3 3" />
                        <line x1={x(xv)} x2={x(xv)} y1={y(u)} y2={bottom} />
                      </g>
                    )
                  })}
                  <path d={linePath(curve, x, y)} className="fill-none stroke-brand-2" strokeWidth={3} />
                </>
              )
            }}
          </Chart>
        ),
      }}
      controls={
        <>
          <Segmented
            label="shape"
            value={which}
            onChange={setWhich}
            options={Object.keys(shaped).map((k) => ({ value: k, label: shaped[k].label }))}
          />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`exponential: -Math.log(1 - u) / rate
pareto:      scale / (1 - u) ** (1 / shape)
weibull:     scale * (-Math.log(1 - u)) ** (1 / shape)
cauchy:      median + scale * Math.tan(π * (u - 0.5))`}
    >
      <P>Every distribution in the library starts from uniform numbers. The most direct way to reshape them is **inverse transform sampling**: if `F` is the cumulative distribution you want, then `F⁻¹(u)` of a uniform `u` follows it exactly.</P>
      <P>Where `F` is steep, many values of `u` crowd into a little range of `x` — that is where the density is high. Where it is flat, a little `u` stretches across a long tail. When `F⁻¹` has no closed form, the library uses other tricks: Box–Muller for gaussians, Marsaglia–Tsang for gamma, rejection for von Mises and Zipf.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// One slide per distribution

const N = 20000

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

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="font-mono text-sm text-destructive">Error: {message}</p>
      <p className="text-xs text-muted-foreground">The library refuses these parameters, as it should.</p>
    </div>
  )
}

/** Barycentric coordinates to a point in an equilateral triangle. */
function ternary([a, b, c]: number[], size: number, x0: number, y0: number): [number, number] {
  const h = (size * Math.sqrt(3)) / 2
  return [a * (x0 + size / 2) + b * x0 + c * (x0 + size), a * y0 + (b + c) * (y0 + h)]
}

function Graph({ dist, values, seed }: { dist: Distribution; values: Values; seed: Seed }) {
  const key = JSON.stringify(values)
  const result = useMemo(() => {
    const v = JSON.parse(key) as Values
    if (dist.kind === 'simplex') return drawAll(seed, 3000, (rng) => dist.sample(rng, v))
    return drawAll(seed, N, (rng) => dist.sample(rng, v))
  }, [dist, key, seed])
  if (result.error) return <ErrorNote message={result.error} />

  if (dist.kind === 'simplex') {
    const draws = result.draws as number[][]
    return (
      <Measure>
        {({ width, height }) => {
          const size = Math.min(width - 150, ((height - 70) * 2) / Math.sqrt(3))
          const x0 = (width - size) / 2
          const y0 = (height - (size * Math.sqrt(3)) / 2) / 2
          const corners = [ternary([1, 0, 0], size, x0, y0), ternary([0, 1, 0], size, x0, y0), ternary([0, 0, 1], size, x0, y0)]
          return (
            <svg width={width} height={height} role="img" aria-label="Dirichlet draws on a triangle">
              <polygon points={corners.map((p) => p.join(',')).join(' ')} className="fill-muted/40 stroke-foreground/25" />
              {draws.map((d, i) => {
                const [px, py] = ternary(d, size, x0, y0)
                return <circle key={i} cx={px} cy={py} r={1.5} className="fill-brand" opacity={0.45} />
              })}
              {corners.map(([cx, cy], i) => (
                <text key={i} x={cx} y={i === 0 ? cy - 10 : cy + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
                  all in share {i}
                </text>
              ))}
            </svg>
          )
        }}
      </Measure>
    )
  }

  const draws = result.draws as number[]
  if (dist.kind === 'continuous') {
    const isT = dist.id === 'student-t'
    const isTrunc = dist.id === 'truncated-gaussian'
    return (
      <DensityChart
        draws={draws}
        domain={dist.view(values)}
        pdf={(x) => dist.pdf(x, values)}
        reference={isT ? (x) => normalPdf(x) : isTrunc ? (x) => normalPdf(x, values.mean, values.sd) : undefined}
        referenceLabel={isT ? 'standard gaussian' : isTrunc ? 'the untruncated bell' : undefined}
        bins={72}
        label={`Histogram of ${dist.title} draws`}
        xFormat={dist.id === 'von-mises' ? (t) => `${fmt(t, 2)}` : undefined}
      />
    )
  }

  const [kMin, kMax] = dist.support(values)
  const ks: number[] = []
  for (let k = kMin; k <= kMax; k++) ks.push(k)
  const counts = new Map<number, number>()
  for (const v of draws) counts.set(v, (counts.get(v) ?? 0) + 1)
  return (
    <BarsChart
      labels={ks.map((k) => dist.label?.(k, values) ?? String(k))}
      observed={ks.map((k) => (counts.get(k) ?? 0) / draws.length)}
      expected={ks.map((k) => dist.pmf(k, values))}
      colours={dist.id === 'categorical' ? ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'] : undefined}
      label={`Frequencies of ${dist.title} draws`}
    />
  )
}

function DistributionSlide({ dist, art }: { dist: Distribution; art: Art }) {
  const [raw, setRaw] = useState<Values>(() => defaults(dist))
  const values = dist.constrain ? dist.constrain(raw) : raw
  const { text, setText, seed, reroll } = useSeed(art.seed)
  const set = (k: string, v: number) => setRaw((r) => ({ ...r, [k]: v }))
  const draw: Draw = (ctx, size, c) => {
    try {
      return art.draw(ctx, size, c, new RNG(seed), values)
    } catch {
      // Parameters the library refuses; the chart beside it says why
    }
  }

  const key = JSON.stringify(values)
  const stats = useMemo(() => {
    if (dist.kind === 'simplex') return undefined
    const v = JSON.parse(key) as Values
    const { draws } = drawAll(seed, N, (rng) => dist.sample(rng, v))
    return describe(draws)
  }, [dist, key, seed])
  const exactMean = dist.mean?.(values)
  const exactVar = dist.variance?.(values)
  const kindLabel = dist.kind === 'continuous' ? 'continuous' : dist.kind === 'discrete' ? 'discrete' : 'proportions'

  return (
    <SlideFrame
      kicker={`Distributions · ${kindLabel}`}
      title={dist.title}
      visual={{ label: art.label, node: <ArtCanvas draw={draw} label={art.label} /> }}
      graph={{
        label: dist.kind === 'simplex' ? '3,000 draws of three shares' : `${N.toLocaleString()} draws against the exact ${dist.kind === 'discrete' ? 'probabilities' : 'density'}`,
        node: <Graph dist={dist} values={values} seed={seed} />,
      }}
      controls={
        <>
          {dist.controls.map((c) => (
            <ParamSlider key={c.key} label={c.label} value={values[c.key]} min={c.min} max={c.max} step={c.step} onChange={(v) => set(c.key, v)} format={(v) => lit(v)} />
          ))}
          <SeedControl text={text} setText={setText} reroll={reroll} />
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => setRaw(defaults(dist))}>
              <RotateCcw /> Reset
            </Button>
          </div>
        </>
      }
      code={`rng.${dist.call(values)}${dist.algorithm ? `\n// ${dist.algorithm.replace(/`/g, '')}` : ''}`}
    >
      <P className="text-foreground">{dist.tagline}</P>
      {dist.description.map((d) => (
        <P key={d}>{d}</P>
      ))}
      {stats && (
        <Stats>
          <Stat label="sample mean" value={fmt(stats.mean)} />
          <Stat label="exact mean" value={exactMean === undefined ? '—' : Number.isNaN(exactMean) ? 'none' : fmt(exactMean)} tone="brand-2" />
          <Stat label="sample sd" value={fmt(stats.sd)} />
          <Stat label="exact sd" value={exactVar === undefined ? '—' : Number.isNaN(exactVar) ? 'none' : fmt(Math.sqrt(exactVar))} tone="brand-2" />
        </Stats>
      )}
    </SlideFrame>
  )
}

/** A slide for every distribution the library has, in the docs’ order. */
export const distributionSlides = distributions.map((dist) => {
  const art = arts[dist.id]
  const Component = () => <DistributionSlide dist={dist} art={art} />
  Component.displayName = `${dist.title}Slide`
  return {
    id: dist.id,
    title: dist.title,
    kind: dist.kind,
    keywords: [dist.method, ...dist.tags, dist.tagline],
    Component,
  }
})
