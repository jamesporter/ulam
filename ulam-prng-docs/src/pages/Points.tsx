import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Callout, H2, H3, P, PageHeader } from '@/components/docs/Prose'
import { DensityDemo, PerturbDemo, PoissonDemo, ShapesDemo, SpreadsDemo } from '@/components/viz/PointsDemos'
import { entry } from '@/content/api'

export function Points() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Points">
        Places on a canvas: anywhere in a rectangle, on a grid, nudged from where they were, inside a shape, or spread
        evenly — by Poisson disk sampling, a jittered grid, or a quasi-random sequence.
      </PageHeader>

      <CodeBlock
        code={`rng.randomPoint() // Somewhere in the unit square
rng.randomPoint({ width: 1, height: 0.75 }) // A canvas of that shape
rng.uniformGridPoint({ minX: 0, maxX: 9, minY: 0, maxY: 9 }) // Integer coordinates
rng.perturb({ at: [0.5, 0.5] }) // Nudge by ±0.05 on each axis
rng.perturb({ at: [0.5, 0.5], magnitude: 1 }) // Nudge by ±0.5`}
      />

      <H2 id="poisson-disk">Poisson disk points</H2>
      <P>
        Points scattered at random but never closer together than `minDist`. Far more even, and far better looking, than
        uniformly random placement — this is what you want for stipples, dots, and seed points.
      </P>
      <PoissonDemo />
      <CodeBlock
        code={`for (const [x, y] of rng.poissonDiskPoints({ minDist: 0.05 })) {
  drawDot(x, y)
}

rng.forPoissonDiskPoints({ minDist: 0.05, height: 0.75 }, ([x, y], i) => {
  drawDot(x, y, i)
})`}
      />
      <P>
        `width` and `height` default to 1, and `attempts` (how hard the sampler tries to place each point, so how tightly
        it packs) defaults to 30. The implementation is Bridson’s algorithm with a background grid, so it runs in time
        proportional to the number of points. It is [exported standalone](/docs/standalone#fn-poissonDiskPoints) too.
      </P>

      <H3 id="varying-density">Density that varies, and shapes to fill</H3>
      <P>
        `minDist` can be a function of position instead of a number: small where you want points packed close, large
        where you want them sparse. Each pair of neighbours then keeps the average of their two spacings apart, so the
        density follows the function smoothly. Tell the sampler the largest spacing the function can give with `maxDist`.
      </P>
      <P>
        `contains` confines the points to a shape: only places where it returns `true` are filled. When the sampler runs
        out of room it tries fresh random places, so a shape in several separate pieces gets every piece filled.
      </P>
      <DensityDemo />
      <CodeBlock
        code={`const noise = rng.simplexNoise()

rng.poissonDiskPoints({
  minDist: ([x, y]) => 0.01 + 0.04 * (noise.at(x * 3, y * 3) + 1) / 2,
  maxDist: 0.05,
})

import { pointInPolygon } from "ulam-prng"

rng.poissonDiskPoints({
  minDist: 0.02,
  contains: (p) => pointInPolygon(p, outline),
})`}
      />
      <Callout tone="orange" title="Same seed, same points">
        Neither option changes anything for a plain `minDist` number on the whole rectangle: those draw exactly the points
        they drew in earlier releases.
      </Callout>

      <H2 id="even-spreads">Other even spreads</H2>
      <P>
        Poisson disk sampling looks the most natural, but it is not the only way to avoid clumps. A **jittered grid**
        puts one random point in every cell of a grid — just as cheap as uniform points, and far more even. A
        **quasi-random** (low discrepancy) sequence fills the region in an order designed never to leave a gap, so any
        prefix of it is evenly spread too.
      </P>
      <SpreadsDemo />
      <CodeBlock
        code={`rng.jitteredGridPoints({ columns: 20 }) // 400 points, one per cell
rng.jitteredGridPoints({ columns: 20, height: 0.5 }) // 20 × 10, square cells
rng.jitteredGridPoints({ columns: 20, jitter: 0.3 }) // A grid, roughened

rng.quasiRandomPoints({ n: 400 }) // Roberts' R2 sequence
rng.quasiRandomPoints({ n: 400, sequence: "halton" }) // The classic`}
      />
      <P>
        `jitter` slides from a regular grid at 0 to anywhere in the cell at 1. The quasi-random sequences are fixed, and
        the randomness is a single offset shared by every point, wrapping round the region — so they cost two draws
        however many points you ask for, and asking for more only adds to the end.
      </P>

      <H2 id="shapes">Inside shapes</H2>
      <P>
        Uniformly random points inside a triangle, any polygon (convex or not), or a ring. All are uniform by area, and
        all are [exported standalone](/docs/standalone#functions) too.
      </P>
      <ShapesDemo />
      <CodeBlock
        code={`rng.inTriangle([0, 0], [1, 0], [0.5, 1])
rng.inPolygon([[0, 0], [1, 0], [1, 1], [0.5, 0.4], [0, 1]])
rng.inAnnulus({ inner: 0.8 }) // A thin ring just inside the unit circle
rng.inAnnulus({ inner: 2, outer: 3 })`}
      />
      <P>
        `inTriangle` always takes two draws. `inPolygon` tries random points in the bounding box until one lands inside,
        so a thin or spidery polygon takes more draws than a fat one. For a disc, see
        [`inUnitDisc`](/docs/vectors#inUnitDisc).
      </P>

      <H2 id="perturbing">Perturbing</H2>
      <P>
        `perturb` nudges a point by a uniform amount on each axis — handy for taking the machine edge off a grid. For three
        dimensions there is [`perturbVec3`](/docs/vectors#perturbVec3).
      </P>
      <PerturbDemo />

      <H2 id="api">API</H2>
      {[
        'randomPoint',
        'uniformGridPoint',
        'perturb',
        'poissonDiskPoints',
        'forPoissonDiskPoints',
        'jitteredGridPoints',
        'quasiRandomPoints',
        'inTriangle',
        'inPolygon',
        'inAnnulus',
        'pointInPolygon',
        'PoissonDiskSpacing',
        'QuasiRandomConfig',
        'JitteredGridConfig',
      ].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
