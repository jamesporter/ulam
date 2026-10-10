import { ArrowRight, ChartColumn, Compass, Dices, Footprints, GitFork, Link2, Shuffle, Sparkles, Waves } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { InstallCommand } from '@/components/docs/InstallCommand'
import { version } from '@/lib/version'
import { Button } from '@/components/ui/button'
import { HeroArt } from '@/components/viz/HeroArt'
import { heroCode } from '@/components/viz/heroSketch'

const seeds = ['sunflower', 'tide', 'ember', 'lattice', 'fern', 'harbour', 'comet', 'saffron', 'aurora', 'thistle', 'orchard', 'kestrel']

const features = [
  { icon: Dices, title: 'Seeded, by number or name', body: 'PCG32 with excellent statistics. `new RNG("sunflower")` always draws the same picture.', to: '/docs/seeding' },
  { icon: GitFork, title: 'Independent streams', body: 'Named streams and forks, so adding a layer never disturbs the others.', to: '/docs/streams' },
  { icon: ChartColumn, title: 'Twenty-one distributions', body: 'Gaussian to Pareto, Poisson to Zipf, von Mises angles — each with a live explorer.', to: '/docs/distributions' },
  { icon: Compass, title: 'Vectors and directions', body: 'Evenly sampled directions, discs and balls, gaussian blurs in 2, 3 and 4D.', to: '/docs/vectors' },
  { icon: Sparkles, title: 'Even spreads', body: 'Poisson disks of varying density or any shape, jittered grids and quasi-random sequences.', to: '/docs/points' },
  { icon: Waves, title: 'Coherent noise', body: 'Simplex, Perlin and value noise in 1, 2 and 3D, with fractal fbm built in.', to: '/docs/noise' },
  { icon: Footprints, title: 'Random walks', body: 'Paths with momentum and drift, from jittery Brownian to slow meanders.', to: '/docs/walks' },
  { icon: Shuffle, title: 'Collections', body: 'Weighted choices, shuffles, and sampling with or without replacement.', to: '/docs/collections' },
  { icon: Link2, title: 'Save to a URL', body: 'A generator serialises to 32 characters, exact position and all.', to: '/docs/serialisation' },
]

export function Home() {
  const [seed, setSeed] = useState('sunflower')

  const reroll = () => {
    let next = seed
    while (next === seed) next = seeds[Math.floor(Math.random() * seeds.length)]
    setSeed(next)
  }

  return (
    <div className="overflow-x-clip">
      <section className="relative">
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--brand)_18%,transparent),transparent)] blur-2xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <Link
              to="/releases"
              className="group inline-flex items-center gap-2 rounded-full border bg-card/60 py-1 pr-3 pl-1 text-xs text-muted-foreground backdrop-blur transition-colors hover:border-brand/50"
            >
              <span className="rounded-full brand-gradient px-2 py-0.5 font-mono font-medium text-white">v{version}</span>
              Named seeds, streams, noise and walks
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <h1 className="mt-6 text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl">
              Seeded randomness for <span className="brand-gradient-text">generative art</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              A PCG generator with the randomness you actually reach for when drawing — distributions, directions,
              Poisson disk points, noise and walks — all from one seed, so the same seed always draws the same picture.
            </p>
            <InstallCommand className="mt-8 max-w-md" />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" asChild className="h-10 px-5">
                <Link to="/docs">
                  Get started <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-10 px-5">
                <Link to="/docs/distributions">Explore distributions</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              TypeScript types included · ESM only · zero dependencies
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 brand-gradient opacity-15 blur-2xl" />
            <div className="overflow-hidden border bg-card shadow-xl">
              <HeroArt seed={seed} />
              <div className="flex items-center gap-2 border-t px-4 py-3 font-mono text-sm">
                <span className="text-muted-foreground">new RNG(</span>
                <input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="min-w-0 flex-1 rounded-md bg-muted px-2 py-1 text-brand outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="Seed for the picture"
                  spellCheck={false}
                />
                <span className="text-muted-foreground">)</span>
                <Button variant="ghost" size="icon" onClick={reroll} aria-label="Another seed">
                  <Dices />
                </Button>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Type any seed — the same word always draws the same picture.</p>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="text-3xl font-bold">That picture, in code</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Three named streams keep the parts of the sketch independent: a smooth noise field to steer by, Poisson disk
              points to start from, and a style stream for colour and weight. Change how many points there are and the
              colours of the others stay exactly where they were.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                ['stream', '/docs/streams#stream'],
                ['perlinNoise', '/docs/noise#perlinNoise'],
                ['poissonDiskPoints', '/docs/points#poissonDiskPoints'],
                ['beta', '/docs/distributions/beta'],
                ['logNormal', '/docs/distributions/log-normal'],
              ].map(([name, to]) => (
                <li key={name}>
                  <Link to={to} className="inline-flex items-center gap-2 font-mono text-brand hover:underline">
                    <ArrowRight className="size-3" />
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <CodeBlock code={`import { RNG } from "ulam-prng"\n\n${heroCode(seed)}`} className="my-0" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Everything a sketch reaches for</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Every page in the docs is illustrated live by the library itself — move the sliders and watch.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:brand-gradient group-hover:text-white">
                <f.icon className="size-4.5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body.split('`').map((part, i) => (i % 2 ? <code key={i} className="font-mono text-[0.9em] text-foreground">{part}</code> : part))}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Thirty seconds of it</h2>
        <CodeBlock
          className="mt-8"
          code={`import { RNG } from "ulam-prng"

const rng = new RNG(12345)

rng.number() // 0.0327... — uniform in [0, 1)
rng.randomAngle() // 0.5008... — radians, 0 to 2π
rng.sample(["red", "green", "blue"]) // "green"
rng.gaussian({ mean: 10, sd: 2 }) // 9.0601...
rng.onUnitCircle() // [0.3717..., 0.9284...] — a random direction
rng.poissonDiskPoints({ minDist: 0.05 }) // 271 evenly-spread points`}
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Named for Stanisław Ulam, who invented the Monte Carlo method while playing solitaire in a hospital bed and
          wondering what the odds actually were.
        </p>
      </section>
    </div>
  )
}
