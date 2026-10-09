import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { H2, P, PageHeader } from '@/components/docs/Prose'
import { PerturbDemo, PoissonDemo } from '@/components/viz/PointsDemos'
import { entry } from '@/content/api'

export function Points() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Points">
        Places on a canvas: anywhere in a rectangle, on a grid, nudged from where they were, or scattered evenly with
        Poisson disk sampling.
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

      <H2 id="perturbing">Perturbing</H2>
      <P>
        `perturb` nudges a point by a uniform amount on each axis — handy for taking the machine edge off a grid. For three
        dimensions there is [`perturbVec3`](/docs/vectors#perturbVec3).
      </P>
      <PerturbDemo />

      <H2 id="api">API</H2>
      {['randomPoint', 'uniformGridPoint', 'perturb', 'poissonDiskPoints', 'forPoissonDiskPoints'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
