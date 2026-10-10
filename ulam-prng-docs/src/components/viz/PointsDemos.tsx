import { useMemo, useState, type ReactNode } from 'react'
import { pointInPolygon, RNG, type QuasiRandomSequence, type Vec2 } from 'ulam-prng'
import { Demo, ParamSlider, SeedControl, Segmented, ToggleControl } from './controls'
import { useSeed } from './seed'

function Scatter({ points, title, r = 0.8, note }: { points: [number, number][]; title: string; r?: number; note?: string }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 text-xs sm:text-sm">
        <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{title}</span>
        <span className="font-mono text-xs text-muted-foreground">{note}</span>
      </div>
      <svg viewBox="-2 -2 104 104" className="aspect-square w-full border bg-card" role="img" aria-label={title}>
        {points.map(([x, y], i) => (
          <circle key={i} cx={x * 100} cy={y * 100} r={r} className="fill-brand" />
        ))}
      </svg>
    </div>
  )
}

export function PoissonDemo() {
  const { text, setText, seed, reroll } = useSeed('stipple')
  const [minDist, setMinDist] = useState(0.045)

  const { poisson, uniform } = useMemo(() => {
    const rng = new RNG(seed)
    const poisson = rng.stream('poisson').poissonDiskPoints({ minDist })
    const u = rng.stream('uniform')
    const uniform = Array.from({ length: poisson.length }, () => u.randomPoint())
    return { poisson, uniform }
  }, [seed, minDist])

  return (
    <Demo
      title="Uniform points against Poisson disk points"
      caption="The same number of points each side. Uniform placement clumps and leaves gaps; Poisson disk sampling keeps every pair at least minDist apart."
      controls={
        <>
          <ParamSlider label="minDist" value={minDist} min={0.025} max={0.12} step={0.005} onChange={setMinDist} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <Scatter points={uniform} title="randomPoint()" note={`${uniform.length} points`} r={minDist * 18} />
        <Scatter points={poisson} title="poissonDiskPoints()" note={`${poisson.length} points`} r={minDist * 18} />
      </div>
    </Demo>
  )
}

export function PerturbDemo() {
  const { text, setText, seed, reroll } = useSeed('wobble')
  const [magnitude, setMagnitude] = useState(0.1)
  const n = 9
  const rng = new RNG(seed)
  const grid: [number, number][] = []
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) grid.push([(i + 0.5) / n, (j + 0.5) / n])
  const moved = grid.map((at) => rng.perturb({ at, magnitude }))

  return (
    <Demo
      title="perturb({ at, magnitude })"
      caption={`Each grid point moves by up to ±${(magnitude / 2).toFixed(3)} on each axis: magnitude is the width of the window it can land in.`}
      controls={
        <>
          <ParamSlider label="magnitude" value={magnitude} min={0} max={0.3} step={0.005} onChange={setMagnitude} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="p-5">
        <svg viewBox="0 0 100 100" className="mx-auto aspect-square w-full max-w-sm border bg-card" role="img" aria-label="Perturbed grid">
          {grid.map(([x, y], i) => (
            <g key={i}>
              <rect
                x={(x - magnitude / 2) * 100}
                y={(y - magnitude / 2) * 100}
                width={magnitude * 100}
                height={magnitude * 100}
                className="fill-brand-2/10 stroke-brand-2/30"
                strokeWidth={0.2}
              />
              <line x1={x * 100} y1={y * 100} x2={moved[i][0] * 100} y2={moved[i][1] * 100} className="stroke-foreground/30" strokeWidth={0.3} />
              <circle cx={moved[i][0] * 100} cy={moved[i][1] * 100} r={1.3} className="fill-brand" />
            </g>
          ))}
        </svg>
      </div>
    </Demo>
  )
}

export function SpreadsDemo() {
  const { text, setText, seed, reroll } = useSeed('even')
  const [columns, setColumns] = useState(14)
  const [sequence, setSequence] = useState<QuasiRandomSequence>('r2')
  const n = columns * columns

  const sets = useMemo(() => {
    const rng = new RNG(seed)
    const u = rng.stream('uniform')
    return {
      uniform: Array.from({ length: n }, () => u.randomPoint()),
      jittered: rng.stream('jittered').jitteredGridPoints({ columns }),
      quasi: rng.stream('quasi').quasiRandomPoints({ n, sequence }),
      // Bridson packs about 0.7 / minDist² points into the unit square
      poisson: rng.stream('poisson').poissonDiskPoints({ minDist: Math.sqrt(0.7 / n) }),
    }
  }, [seed, columns, n, sequence])

  const r = 22 / columns

  return (
    <Demo
      title="Four ways to spread points"
      caption="About the same number of points in each square. Uniform points clump and leave holes; the others each trade cost against how natural the result looks."
      controls={
        <>
          <ParamSlider label="points" value={columns} min={5} max={30} step={1} onChange={setColumns} format={(c) => `${c * c}`} />
          <Segmented
            label="quasi-random sequence"
            value={sequence}
            onChange={setSequence}
            options={[
              { value: 'r2', label: 'r2' },
              { value: 'halton', label: 'halton' },
            ]}
          />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-5 p-5">
        <Scatter points={sets.uniform} title="randomPoint()" note={`${sets.uniform.length} points`} r={r} />
        <Scatter points={sets.jittered} title="jitteredGridPoints()" note={`${sets.jittered.length} points`} r={r} />
        <Scatter points={sets.quasi} title="quasiRandomPoints()" note={`${sets.quasi.length} points`} r={r} />
        <Scatter points={sets.poisson} title="poissonDiskPoints()" note={`${sets.poisson.length} points`} r={r} />
      </div>
    </Demo>
  )
}

/** A five pointed star filling most of the unit square. */
const star: Vec2[] = Array.from({ length: 10 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI) / 5
  const radius = i % 2 ? 0.2 : 0.48
  return [0.5 + radius * Math.cos(angle), 0.53 + radius * Math.sin(angle)]
})

const outline = (vertices: Vec2[]) => vertices.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 100},${y * 100}`).join('') + 'Z'

export function DensityDemo() {
  const { text, setText, seed, reroll } = useSeed('drift')
  const [closest, setClosest] = useState(0.012)
  const [furthest, setFurthest] = useState(0.06)
  const [inStar, setInStar] = useState(false)

  const points = useMemo(() => {
    const rng = new RNG(seed)
    const noise = rng.stream('noise').simplexNoise()
    const maxDist = Math.max(furthest, closest)
    return rng.stream('points').poissonDiskPoints({
      minDist: ([x, y]) => closest + ((maxDist - closest) * (noise.at(x * 2.5, y * 2.5) + 1)) / 2,
      maxDist,
      contains: inStar ? (p) => pointInPolygon(p, star) : undefined,
    })
  }, [seed, closest, furthest, inStar])

  return (
    <Demo
      title="poissonDiskPoints({ minDist: (at) => …, maxDist, contains })"
      caption="The spacing at each place comes from a simplex noise field, between the two values below: dense where the field is low, sparse where it is high. Switch on the star to confine the points to a shape."
      controls={
        <>
          <ParamSlider label="closest spacing" value={closest} min={0.01} max={0.04} step={0.001} onChange={setClosest} />
          <ParamSlider label="furthest spacing (maxDist)" value={furthest} min={0.02} max={0.1} step={0.002} onChange={setFurthest} />
          <ToggleControl label="contains: inside a star" checked={inStar} onChange={setInStar} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      footer={<span className="font-mono">{points.length} points</span>}
    >
      <div className="p-5">
        <svg viewBox="-2 -2 104 104" className="mx-auto aspect-square w-full max-w-md border bg-card" role="img" aria-label="Poisson disk points of varying density">
          {inStar && <path d={outline(star)} className="fill-none stroke-brand-2/40" strokeWidth={0.3} />}
          {points.map(([x, y], i) => (
            <circle key={i} cx={x * 100} cy={y * 100} r={0.45} className="fill-brand" />
          ))}
        </svg>
      </div>
    </Demo>
  )
}

/** An arrow-like concave polygon, to show off non-convex sampling. */
const chevron: Vec2[] = [
  [0.08, 0.15],
  [0.55, 0.15],
  [0.92, 0.5],
  [0.55, 0.85],
  [0.08, 0.85],
  [0.42, 0.5],
]

export function ShapesDemo() {
  const { text, setText, seed, reroll } = useSeed('inside')
  const [n, setN] = useState(500)
  const [inner, setInner] = useState(0.6)

  const sets = useMemo(() => {
    const rng = new RNG(seed)
    const t = rng.stream('triangle')
    const p = rng.stream('polygon')
    const a = rng.stream('annulus')
    return {
      triangle: Array.from({ length: n }, () => t.inTriangle([0.5, 0.06], [0.95, 0.9], [0.05, 0.9])),
      polygon: Array.from({ length: n }, () => p.inPolygon(chevron)),
      annulus: Array.from({ length: n }, (): Vec2 => {
        const [x, y] = a.inAnnulus({ inner, outer: 1 })
        return [0.5 + 0.45 * x, 0.5 + 0.45 * y]
      }),
    }
  }, [seed, n, inner])

  const panel = (title: string, points: Vec2[], shape: ReactNode) => (
    <div>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <svg viewBox="-2 -2 104 104" className="aspect-square w-full border bg-card" role="img" aria-label={title}>
        {shape}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x * 100} cy={y * 100} r={0.7} className="fill-brand" />
        ))}
      </svg>
    </div>
  )

  return (
    <Demo
      title="Points inside shapes"
      caption="Each is uniform by area: no bunching at a triangle's corners, in a concave polygon's arms, or towards a ring's inner edge."
      controls={
        <>
          <ParamSlider label="points" value={n} min={50} max={2000} step={50} onChange={setN} />
          <ParamSlider label="inner (annulus)" value={inner} min={0} max={0.95} step={0.01} onChange={setInner} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="grid gap-5 p-5 sm:grid-cols-3">
        {panel('inTriangle(a, b, c)', sets.triangle, <path d={outline([[0.5, 0.06], [0.95, 0.9], [0.05, 0.9]])} className="fill-brand-2/8 stroke-brand-2/40" strokeWidth={0.3} />)}
        {panel('inPolygon(vertices)', sets.polygon, <path d={outline(chevron)} className="fill-brand-2/8 stroke-brand-2/40" strokeWidth={0.3} />)}
        {panel(
          'inAnnulus({ inner })',
          sets.annulus,
          <>
            <circle cx={50} cy={50} r={45} className="fill-brand-2/8 stroke-brand-2/40" strokeWidth={0.3} />
            <circle cx={50} cy={50} r={45 * inner} className="fill-card stroke-brand-2/40" strokeWidth={0.3} />
          </>,
        )}
      </div>
    </Demo>
  )
}
