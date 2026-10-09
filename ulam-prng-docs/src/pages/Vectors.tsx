import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { H2, P, PageHeader } from '@/components/docs/Prose'
import { BlurDemo, DirectionsDemo, DiscDemo, SphereDemo } from '@/components/viz/VectorsDemos'
import { entry } from '@/content/api'

export function Vectors() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Vectors">
        Uniform and gaussian vectors in two, three and four dimensions, and directions, discs and balls sampled evenly.
      </PageHeader>

      <P>
        `Vec2`, `Vec3` and `Vec4` are plain tuples — `[number, number]` and friends — so they drop straight into whatever
        you already use for geometry. `Point2D` is an alias of `Vec2`.
      </P>
      <CodeBlock
        code={`import type { Vec2, Vec3, Vec4 } from "ulam-prng"

rng.uniformVec2() // In the unit square
rng.uniformVec3({ from: -1, to: 1 }) // In a cube around the origin
rng.uniformVec4() // Four independent components

rng.gaussianVec2({ mean: [0.5, 0.5], sd: 0.1 }) // A round blur
rng.gaussianVec3({ sd: 2 }) // A spherical one
rng.gaussianVec4()

rng.perturbVec3({ at: [0.5, 0.5, 0.5], magnitude: 0.2 })`}
      />
      <BlurDemo />

      <H2 id="directions">Directions and interiors</H2>
      <P>
        Sampled evenly — not by normalising a point from a square, which favours the diagonals, and not by latitude and
        longitude, which crowds the poles.
      </P>
      <CodeBlock
        code={`rng.onUnitCircle() // A direction: [0.9789..., 0.2042...]
rng.inUnitDisc({ radius: 3 }) // Uniform by area, so no clump in the middle
rng.onUnitSphere() // A direction in three dimensions
rng.inUnitBall() // Uniform by volume`}
      />
      <DirectionsDemo />
      <DiscDemo />
      <SphereDemo />

      <H2 id="api">API</H2>
      {[
        'uniformVec2',
        'uniformVec3',
        'uniformVec4',
        'gaussianVec2',
        'gaussianVec3',
        'gaussianVec4',
        'onUnitCircle',
        'inUnitDisc',
        'onUnitSphere',
        'inUnitBall',
        'perturbVec3',
        'Vec2',
        'Vec3',
        'Vec4',
        'Point2D',
        'Vector2D',
        'UniformVecConfig',
        'GaussianVecConfig',
      ].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
