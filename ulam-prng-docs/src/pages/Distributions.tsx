import { Link } from 'react-router'
import { RNG } from 'ulam-prng'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Md } from '@/components/docs/Md'
import { H2, P, PageHeader } from '@/components/docs/Prose'
import { continuous, defaults, discrete, simplex, type Distribution } from '@/content/distributions'

/** A thumbnail of a distribution's shape at its default parameters. */
function Spark({ dist }: { dist: Distribution }) {
  const w = 160
  const h = 56
  const v = defaults(dist)

  if (dist.kind === 'continuous') {
    const [lo, hi] = dist.view(v)
    const pts: [number, number][] = []
    for (let i = 0; i <= 80; i++) {
      const x = lo + ((hi - lo) * i) / 80
      pts.push([x, dist.pdf(x, v)])
    }
    const finite = pts.map((p) => p[1]).filter(Number.isFinite)
    const max = Math.max(...finite) || 1
    const sx = (x: number) => ((x - lo) / (hi - lo)) * w
    const sy = (y: number) => h - 4 - (Math.min(y, max) / max) * (h - 10)
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(Number.isFinite(y) ? y : max).toFixed(1)}`).join('')
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" aria-hidden="true">
        <path d={`${line}L${w},${h - 4}L0,${h - 4}Z`} className="fill-brand/15" />
        <path d={line} className="fill-none stroke-brand" strokeWidth={2} />
      </svg>
    )
  }

  if (dist.kind === 'discrete') {
    const [a, b] = dist.support(v)
    const ks = Array.from({ length: Math.min(b - a + 1, 30) }, (_, i) => a + i)
    const ps = ks.map((k) => dist.pmf(k, v))
    const max = Math.max(...ps) || 1
    const bw = w / ks.length
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" aria-hidden="true">
        {ps.map((p, i) => (
          <rect key={i} x={i * bw + bw * 0.18} width={bw * 0.64} y={h - 4 - (p / max) * (h - 10)} height={(p / max) * (h - 10)} rx={1.5} className="fill-brand-2" />
        ))}
      </svg>
    )
  }

  // Dirichlet: a handful of three-way splits
  const rng = new RNG('thumbnail')
  const rows = Array.from({ length: 5 }, () => dist.sample(rng, v))
  const colours = ['var(--brand)', 'var(--brand-2)', 'var(--chart-3)']
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" aria-hidden="true">
      {rows.map((r, i) => {
        let x = 0
        return r.map((s, j) => {
          const rect = <rect key={`${i}-${j}`} x={x} y={4 + i * 10} width={s * w} height={8} fill={colours[j]} rx={1} />
          x += s * w
          return rect
        })
      })}
    </svg>
  )
}

function Grid({ items }: { items: Distribution[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((d) => (
        <Link
          key={d.id}
          to={`/docs/distributions/${d.id}`}
          className="group flex flex-col rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-heading font-semibold">{d.title}</span>
            <code className="font-mono text-xs text-muted-foreground group-hover:text-brand">{d.method}</code>
          </div>
          <Spark dist={d} />
          <p className="text-sm text-muted-foreground">
            <Md>{d.tagline}</Md>
          </p>
        </Link>
      ))}
    </div>
  )
}

const chooser: [string, string, string][] = [
  ['About a value, give or take', 'gaussian', 'Gaussian'],
  ['About a value, within hard limits', 'truncated-gaussian', 'Truncated gaussian'],
  ['Roughly here, cheaply bounded', 'triangular', 'Triangular'],
  ['Sizes: mostly small, sometimes big', 'log-normal', 'Log-normal'],
  ['A few dominant, many tiny', 'pareto', 'Pareto'],
  ['Gaps between things', 'exponential', 'Exponential'],
  ['A fraction or a mix', 'beta', 'Beta'],
  ['Splitting a whole into parts', 'dirichlet', 'Dirichlet'],
  ['How many?', 'poisson', 'Poisson'],
  ['Which one, by weight?', 'categorical', 'Categorical'],
  ['Mostly in place, a few flung far', 'cauchy', 'Cauchy'],
  ['Ranked sizes', 'zipf', 'Zipf'],
]

export function Distributions() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Distributions">
        Twenty shapes of randomness, from the bell curve to power laws. Each one has its own page where you can move its
        parameters and watch real draws from the library settle onto the exact curve.
      </PageHeader>

      <CodeBlock
        code={`rng.gaussian({ mean: 100, sd: 15 }) // 103.39...
rng.logNormal({ sigma: 0.4 }) // 1.08... — mostly small, sometimes large
rng.beta({ alpha: 2, beta: 5 }) // 0.38... — usually a smallish fraction
rng.poisson(3) // 1
rng.categorical([5, 3, 2]) // 0 half the time, 1 a third, 2 a fifth`}
      />

      <H2 id="choosing">Which one?</H2>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {chooser.map(([want, id, name]) => (
          <Link key={id} to={`/docs/distributions/${id}`} className="group flex items-baseline justify-between gap-3 border-b border-dashed py-2 text-sm">
            <span className="text-foreground/85">{want}</span>
            <span className="font-medium whitespace-nowrap text-brand group-hover:underline">{name} →</span>
          </Link>
        ))}
      </div>

      <H2 id="continuous">Continuous</H2>
      <Grid items={continuous} />

      <H2 id="discrete">Discrete and vector</H2>
      <Grid items={[...discrete, ...simplex]} />

      <H2 id="standalone">Without an RNG</H2>
      <P>
        Every distribution is also exported as a standalone function taking any source of uniform randomness as its first
        argument, so you can drive them from another generator entirely.
      </P>
      <CodeBlock
        code={`import { gamma, weibull } from "ulam-prng"

gamma(Math.random, { shape: 2, scale: 0.5 })
weibull(rng.random, { shape: 8 })`}
      />
    </>
  )
}
