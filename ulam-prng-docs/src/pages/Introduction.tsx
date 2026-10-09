import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { InstallCommand } from '@/components/docs/InstallCommand'
import { Callout, H2, P, PageHeader } from '@/components/docs/Prose'

const tour = [
  ['Seeding', '/docs/seeding', 'Numbers, strings, and moving around the sequence.'],
  ['Streams', '/docs/streams', 'Independent generators so parts of a sketch stop disturbing each other.'],
  ['Distributions', '/docs/distributions', 'Twenty shapes of randomness, each with a live explorer.'],
  ['Points and vectors', '/docs/points', 'Places, directions, discs, balls and Poisson disk scatter.'],
  ['Noise', '/docs/noise', 'Smooth fields for things that should drift rather than jump.'],
  ['API reference', '/api', 'Every method and export on one page.'],
]

export function Introduction() {
  return (
    <>
      <PageHeader eyebrow="Getting started" title="Introduction">
        ulam-prng is seeded random number generation for generative art: a fast PCG generator with excellent
        statistical properties, plus the higher level randomness you reach for when drawing.
      </PageHeader>

      <P>
        Weighted choices, sampling, shuffling, a shelf of distributions from gaussian to Pareto, random vectors and
        directions, perturbed points, Poisson disk distributions, coherent noise and random walks — all from one seed, so
        the same seed always draws the same picture. Seed it with a string, split it into independent streams, and save
        its exact position in a URL.
      </P>

      <H2 id="install">Installation</H2>
      <InstallCommand />
      <P>
        TypeScript types are included. The package is ESM only, has no dependencies, and is marked side effect free so
        bundlers can tree-shake whatever you do not use.
      </P>

      <H2 id="quick-start">Quick start</H2>
      <P>Create a generator with a seed, then ask it for what you need.</P>
      <CodeBlock
        code={`import { RNG } from "ulam-prng"

const rng = new RNG(12345)

rng.number() // 0.0327... — uniform in [0, 1)
rng.randomAngle() // 0.5008... — radians, 0 to 2π
rng.sample(["red", "green", "blue"]) // "green"
rng.gaussian({ mean: 10, sd: 2 }) // 9.0601...
rng.onUnitCircle() // [0.3717..., 0.9284...] — a random direction
rng.poissonDiskPoints({ minDist: 0.05 }) // 271 evenly-spread points`}
      />
      <Callout title="Reproducible by design">
        Everything an `RNG` produces is determined by its seed. Run the code above anywhere and you get exactly the
        values in the comments. The output sequence is pinned by golden tests, so a change to what an existing seed draws
        can only ever arrive as a deliberate, breaking release.
      </Callout>

      <H2 id="a-sketch">A whole sketch</H2>
      <P>
        Here is the shape of a typical canvas sketch. The seed comes from the URL if there is one, so a picture you like
        can be shared and drawn again.
      </P>
      <CodeBlock
        title="sketch.ts"
        code={`import { RNG } from "ulam-prng"

const seed = location.hash.slice(1) || "sunflower"
const rng = new RNG(seed)

const ctx = canvas.getContext("2d")!
const { width, height } = canvas

for (const [x, y] of rng.poissonDiskPoints({ minDist: 0.03 })) {
  const r = rng.logNormal({ mu: Math.log(4), sigma: 0.4 })
  ctx.fillStyle = rng.weightedSample([
    [5, "#e8336a"],
    [3, "#f58a2c"],
    [1, "#2b1b22"],
  ])
  ctx.beginPath()
  ctx.arc(x * width, y * height, r, 0, Math.PI * 2)
  ctx.fill()
}`}
      />

      <H2 id="standalone">Bring your own randomness</H2>
      <P>
        Every distribution and vector sampler is also exported as a plain function taking any `() =&gt; number` first, so
        you can use them with `Math.random` or another generator. `rng.random` is a pre-bound `() =&gt; number` for exactly
        this.
      </P>
      <CodeBlock
        code={`import { gamma, onUnitSphere } from "ulam-prng"

gamma(Math.random, { shape: 2, scale: 0.5 })
onUnitSphere(rng.random)`}
      />

      <H2 id="tour">Where next</H2>
      <div className="grid gap-3 sm:grid-cols-2">
        {tour.map(([title, to, body]) => (
          <Link key={to} to={to} className="group border border-brand-2/30 bg-brand-2/6 p-4 transition-colors hover:border-brand-2 hover:bg-brand-2/12">
            <div className="flex items-center justify-between font-medium">
              {title}
              <ArrowRight className="size-4 text-brand-2 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </Link>
        ))}
      </div>
    </>
  )
}
