import { useMemo, useRef, useState } from 'react'
import { pointInPolygon, RNG, type Vec2, type Vec3 } from 'ulam-prng'
import { ParamSlider, SeedControl, Segmented, ToggleControl } from '@/components/viz/controls'
import { useSeed } from '@/components/viz/seed'
import { rampAt } from '@/components/viz/useColours'
import { fmt } from '@/lib/stats'
import { BarsChart, Chart, DensityChart, linePath } from './charts'
import { ArtCanvas, P, SlideFrame, square, Stat, Stats, type Draw } from './kit'

const TAU = Math.PI * 2

/** Nearest neighbour distances, the brute force way; fine for a couple of thousand points. */
function nearestDistances(points: Vec2[]): number[] {
  return points.map((p, i) => {
    let best = Infinity
    for (let j = 0; j < points.length; j++) {
      if (j === i) continue
      const d = (p[0] - points[j][0]) ** 2 + (p[1] - points[j][1]) ** 2
      if (d < best) best = d
    }
    return Math.sqrt(best)
  })
}

// ---------------------------------------------------------------------------
// Perturb

export function PerturbSlide() {
  const { text, setText, seed, reroll } = useSeed('schotter')
  const [magnitude, setMagnitude] = useState(0.6)
  const [twist, setTwist] = useState(0.7)

  const draw: Draw = (ctx, size, c) => {
    const rng = new RNG(seed)
    const cols = 12
    const rows = Math.max(8, Math.floor((cols * (size.height - 30)) / (size.width - 30)))
    const cell = Math.min((size.width - 40) / cols, (size.height - 40) / rows)
    const x0 = (size.width - cell * cols) / 2
    const y0 = (size.height - cell * rows) / 2
    ctx.lineWidth = 1.4
    for (let j = 0; j < rows; j++) {
      const k = j / (rows - 1)
      for (let i = 0; i < cols; i++) {
        const [px, py] = rng.perturb({ at: [i + 0.5, j + 0.5], magnitude: magnitude * k })
        const angle = rng.gaussian({ sd: twist * k * 0.6 })
        ctx.save()
        ctx.translate(x0 + px * cell, y0 + py * cell)
        ctx.rotate(angle)
        ctx.strokeStyle = rampAt(c.ramp, k)
        ctx.globalAlpha = 0.9
        ctx.strokeRect(-cell / 2, -cell / 2, cell, cell)
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
  }

  const offsets = useMemo(() => {
    const rng = new RNG(seed)
    return {
      square: Array.from({ length: 1500 }, () => rng.perturb({ at: [0, 0], magnitude: 1 })),
      blur: Array.from({ length: 1500 }, () => rng.gaussianVec2({ sd: 1 / Math.sqrt(12) })),
    }
  }, [seed])

  return (
    <SlideFrame
      kicker="Points"
      title={<>Nudging things: <code className="font-mono text-[0.8em]">perturb</code></>}
      visual={{ label: 'After Georg Nees’ Schotter (1968): disorder growing down the page', node: <ArtCanvas draw={draw} label="A grid of squares, increasingly perturbed and rotated" /> }}
      graph={{
        label: 'Where a nudge can land',
        note: 'same variance',
        node: (
          <Chart
            x={[-0.8, 0.8]}
            y={[-0.8, 0.8]}
            square
            label="Offsets from perturb and from gaussianVec2"
            keyItems={[
              { label: 'perturb({ magnitude: 1 })', className: 'bg-brand' },
              { label: 'gaussianVec2({ sd: 1/√12 })', className: 'bg-brand-2' },
            ]}
          >
            {({ x, y }) => (
              <>
                <rect x={x(-0.5)} y={y(0.5)} width={x(0.5) - x(-0.5)} height={y(-0.5) - y(0.5)} className="fill-none stroke-brand/50" strokeDasharray="4 4" />
                {offsets.blur.map(([a, b], i) => (
                  <circle key={`b${i}`} cx={x(a)} cy={y(b)} r={1.6} className="fill-brand-2" opacity={0.5} />
                ))}
                {offsets.square.map(([a, b], i) => (
                  <circle key={`s${i}`} cx={x(a)} cy={y(b)} r={1.6} className="fill-brand" opacity={0.55} />
                ))}
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="magnitude at the bottom" value={magnitude} min={0} max={1.5} step={0.01} onChange={setMagnitude} />
          <ParamSlider label="rotation sd at the bottom" value={twist} min={0} max={2} step={0.01} onChange={setTwist} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.perturb({ at: [x, y], magnitude }) // ± magnitude/2 on each axis
rng.perturbVec3({ at: [x, y, z], magnitude })
rng.gaussian({ sd }) // for the rotation`}
    >
      <P>Generative art is often order, slightly spoiled. `perturb` moves a point by up to half of `magnitude` along each axis — uniformly within a square window around where it was.</P>
      <P>A uniform nudge has a hard edge: nothing lands outside the window. When you want a soft blur with no edge at all, a gaussian nudge (`gaussianVec2`) with the same variance spreads into a round cloud instead.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Poisson disk

type Region = 'square' | 'circle' | 'ring'

export function PoissonSlide() {
  const { text, setText, seed, reroll } = useSeed('stipple')
  const [minDist, setMinDist] = useState(0.03)
  const [vary, setVary] = useState(false)
  const [region, setRegion] = useState<Region>('square')

  const { points, uniform, spacing } = useMemo(() => {
    const rng = new RNG(seed)
    const noise = rng.stream('noise').simplexNoise()
    const contains =
      region === 'square'
        ? undefined
        : region === 'circle'
          ? ([x, y]: Vec2) => (x - 0.5) ** 2 + (y - 0.5) ** 2 < 0.24
          : ([x, y]: Vec2) => {
              const r = Math.hypot(x - 0.5, y - 0.5)
              return r < 0.49 && r > 0.25
            }
    const spacing = (p: Vec2) => (vary ? minDist * (0.55 + 0.9 * ((noise.at(p[0] * 2.5, p[1] * 2.5) + 1) / 2)) : minDist)
    const points = rng.stream('poisson').poissonDiskPoints({ minDist: vary ? spacing : minDist, maxDist: vary ? minDist * 1.45 : undefined, contains })
    const u = rng.stream('uniform')
    const uniform: Vec2[] = []
    while (uniform.length < points.length) {
      const p = u.randomPoint()
      if (!contains || contains(p)) uniform.push(p)
    }
    return { points, uniform, spacing }
  }, [seed, minDist, vary, region])

  const nn = useMemo(() => ({ poisson: nearestDistances(points), uniform: nearestDistances(uniform) }), [points, uniform])

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 12)
    for (const p of points) {
      const r = spacing(p) * s * 0.32
      ctx.fillStyle = rampAt(c.ramp, Math.hypot(p[0] - 0.5, p[1] - 0.5) * 1.6)
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(x + p[0] * s, y + p[1] * s, r, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  const hi = minDist * 2.6
  return (
    <SlideFrame
      kicker="Points"
      title="Poisson disk points: random, but never too close"
      visual={{ label: `${points.length.toLocaleString()} points`, note: vary ? 'spacing from simplex noise' : `minDist ${minDist}`, node: <ArtCanvas draw={draw} label="Poisson disk stipple" /> }}
      graph={{
        label: 'Distance from each point to its nearest neighbour',
        node: (
          <Chart
            x={[0, hi]}
            y={[0, 1]}
            hideY
            label="Nearest neighbour distances"
            xLabel="distance"
            keyItems={[
              { label: 'poissonDiskPoints', className: 'bg-brand/70' },
              { label: 'randomPoint, same count', className: 'bg-brand-2/60' },
            ]}
          >
            {({ x, y, bottom, top }) => {
              const bins = 48
              const w = hi / bins
              const hist = (ds: number[]) => {
                const out = new Array<number>(bins).fill(0)
                for (const d of ds) if (d < hi) out[Math.floor(d / w)]++
                return out
              }
              const a = hist(nn.poisson)
              const b = hist(nn.uniform)
              const max = Math.max(...a, ...b) || 1
              return (
                <>
                  {b.map((v, i) => (
                    <rect key={`u${i}`} x={x(i * w) + 0.5} width={Math.max(0.5, x(w) - x(0) - 1)} y={y(v / max)} height={bottom - y(v / max)} className="fill-brand-2/45" />
                  ))}
                  {a.map((v, i) => (
                    <rect key={`p${i}`} x={x(i * w) + 0.5} width={Math.max(0.5, x(w) - x(0) - 1)} y={y(v / max)} height={bottom - y(v / max)} className="fill-brand/65" />
                  ))}
                  {!vary && (
                    <>
                      <line x1={x(minDist)} x2={x(minDist)} y1={top} y2={bottom} className="stroke-foreground/60" strokeDasharray="4 4" />
                      <text x={x(minDist) + 6} y={top + 12} className="fill-muted-foreground font-mono text-[11px]">
                        minDist
                      </text>
                    </>
                  )}
                </>
              )
            }}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="minDist" value={minDist} min={0.015} max={0.08} step={0.001} onChange={setMinDist} />
          <Segmented
            label="contains"
            value={region}
            onChange={setRegion}
            options={[
              { value: 'square', label: 'everything' },
              { value: 'circle', label: 'a disc' },
              { value: 'ring', label: 'a ring' },
            ]}
          />
          <ToggleControl label="minDist from noise" checked={vary} onChange={setVary} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.poissonDiskPoints({ minDist: 0.03 })
rng.poissonDiskPoints({
  minDist: (p) => 0.02 + 0.02 * noise.at(...p),
  maxDist: 0.045,
  contains: (p) => pointInPolygon(p, outline),
})`}
    >
      <P>Uniform random points clump and leave holes — no pair is ever kept apart. Bridson’s algorithm grows a **Poisson disk** set instead: each new point is tried in a ring around an existing one, and kept only if nothing is closer than `minDist`.</P>
      <P>The nearest-neighbour histogram tells the story: uniform points have neighbours at every distance down to zero; Poisson disk points have a hard floor at `minDist`, and pack just above it. `minDist` can vary across the canvas, and `contains` confines the points to any shape.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Even spreads

type Spread = 'uniform' | 'jittered' | 'r2' | 'halton'
const spreadColumns = [4, 6, 8, 11, 16, 23, 32, 45]

function spread(rng: RNG, kind: Spread, columns: number): Vec2[] {
  const n = columns * columns
  if (kind === 'uniform') return Array.from({ length: n }, () => rng.randomPoint())
  if (kind === 'jittered') return rng.jitteredGridPoints({ columns })
  return rng.quasiRandomPoints({ n, sequence: kind })
}

/** The worst gap between the share of points in a box anchored at the origin and the box's area. */
function discrepancy(points: Vec2[]): number {
  const g = 20
  let worst = 0
  for (let a = 1; a <= g; a++) {
    for (let b = 1; b <= g; b++) {
      const w = a / g
      const h = b / g
      let count = 0
      for (const [x, y] of points) if (x < w && y < h) count++
      worst = Math.max(worst, Math.abs(count / points.length - w * h))
    }
  }
  return worst
}

const spreadNames: Record<Spread, string> = { uniform: 'randomPoint', jittered: 'jitteredGridPoints', r2: 'quasiRandom r2', halton: 'quasiRandom halton' }
const spreadClass: Record<Spread, string> = { uniform: 'stroke-muted-foreground', jittered: 'stroke-brand-2', r2: 'stroke-brand', halton: 'stroke-chart-3' }
const spreadKey: Record<Spread, string> = { uniform: 'bg-muted-foreground', jittered: 'bg-brand-2', r2: 'bg-brand', halton: 'bg-chart-3' }

export function SpreadsSlide() {
  const { text, setText, seed, reroll } = useSeed('even')
  const [kind, setKind] = useState<Spread>('r2')
  const [columns, setColumns] = useState(16)
  const [shown, setShown] = useState(1)
  const points = useMemo(() => spread(new RNG(seed), kind, columns), [seed, kind, columns])
  const count = Math.max(1, Math.round(points.length * shown))

  const curves = useMemo(() => {
    const rng = new RNG(seed)
    return (Object.keys(spreadNames) as Spread[]).map((k) => ({
      kind: k,
      points: spreadColumns.map((cols) => [cols * cols, discrepancy(spread(rng, k, cols))] as [number, number]),
    }))
  }, [seed])

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 14)
    ctx.strokeStyle = c.muted
    ctx.globalAlpha = 0.3
    ctx.strokeRect(x, y, s, s)
    const r = Math.max(1.6, Math.min(6, (s / columns) * 0.2))
    for (let i = 0; i < count; i++) {
      const [px, py] = points[i]
      ctx.fillStyle = rampAt(c.ramp, i / points.length)
      ctx.globalAlpha = 0.92
      ctx.beginPath()
      ctx.arc(x + px * s, y + py * s, r, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Points"
      title="Even spreads, cheaply: grids and quasi-random sequences"
      visual={{ label: `${spreadNames[kind]}: the first ${count} of ${points.length}`, note: 'coloured by order', node: <ArtCanvas draw={draw} label="Points coloured by the order they were made" /> }}
      graph={{
        label: 'How unevenly the square is covered',
        note: 'discrepancy, log–log',
        node: (
          <Chart
            x={[16, 2025]}
            y={[0.002, 0.3]}
            xLog
            yLog
            xTicks={[16, 64, 256, 1024]}
            xFormat={(t) => String(t)}
            yTicks={[0.003, 0.01, 0.03, 0.1, 0.3]}
            yFormat={(t) => String(t)}
            label="Discrepancy against number of points"
            xLabel="points"
            keyItems={(Object.keys(spreadNames) as Spread[]).map((k) => ({ label: spreadNames[k], className: spreadKey[k], line: true }))}
          >
            {({ x, y }) => (
              <>
                {curves.map((curve) => (
                  <g key={curve.kind}>
                    <path d={linePath(curve.points, x, y)} className={`fill-none ${spreadClass[curve.kind]}`} strokeWidth={curve.kind === kind ? 3.5 : 2} opacity={curve.kind === kind ? 1 : 0.6} />
                    {curve.points.map(([n, d]) => (
                      <circle key={n} cx={x(n)} cy={y(d)} r={3} className={`fill-card ${spreadClass[curve.kind]}`} strokeWidth={1.5} />
                    ))}
                  </g>
                ))}
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <Segmented
            label="spread"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'uniform', label: 'uniform' },
              { value: 'jittered', label: 'jittered' },
              { value: 'r2', label: 'r2' },
              { value: 'halton', label: 'halton' },
            ]}
          />
          <ParamSlider label="columns (n = columns²)" value={columns} min={4} max={40} step={1} onChange={setColumns} />
          <ParamSlider label="how many are drawn" value={shown} min={0.02} max={1} step={0.01} onChange={setShown} format={(v) => `${Math.round(v * 100)}%`} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.jitteredGridPoints({ columns: 20 })      // one per cell
rng.quasiRandomPoints({ n: 400 })            // Roberts’ R2
rng.quasiRandomPoints({ n: 400, sequence: "halton" })`}
    >
      <P>Poisson disk sampling is the gold standard, but it is not free. A **jittered grid** puts one random point in each cell: never clumped, and only two draws a point. A **quasi-random** (low discrepancy) sequence is not random at all: R2 steps by the plastic number’s powers, Halton by digit reversal, and the library only randomises one shared offset.</P>
      <P>Drag “how many are drawn”: a quasi-random sequence fills the square in an order that never leaves a gap. Its discrepancy falls almost like `1/n`, where uniform points only manage `1/√n`.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Shapes

type ShapeKind = 'triangle' | 'star'

function starVertices(points: number, inner: number): Vec2[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : 1
    const a = (i / (points * 2)) * TAU - Math.PI / 2
    return [r * Math.cos(a), r * Math.sin(a)]
  })
}

const tri: Vec2[] = [
  [0, -1],
  [0.95, 0.8],
  [-0.95, 0.8],
]

function triangleArea(a: Vec2, b: Vec2, c: Vec2): number {
  return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
}

function inTriangleTest(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  return pointInPolygon(p, [a, b, c])
}

export function ShapesSlide() {
  const { text, setText, seed, reroll } = useSeed('stars')
  const [kind, setKind] = useState<ShapeKind>('star')
  const [arms, setArms] = useState(5)
  const [inner, setInner] = useState(0.42)
  const [n, setN] = useState(2500)

  const vertices = useMemo(() => (kind === 'star' ? starVertices(arms, inner) : tri), [kind, arms, inner])
  // Regions of known area to count points in: a fan from the centre for the
  // star, the four midpoint triangles of the triangle
  const regions: [Vec2, Vec2, Vec2][] =
    kind === 'star'
      ? vertices.map((v, i) => [[0, 0], v, vertices[(i + 1) % vertices.length]] as [Vec2, Vec2, Vec2])
      : (() => {
          const [a, b, c] = tri
          const mid = (p: Vec2, q: Vec2): Vec2 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
          const ab = mid(a, b)
          const bc = mid(b, c)
          const ca = mid(c, a)
          return [
            [a, ab, ca],
            [ab, b, bc],
            [ca, bc, c],
            [ab, bc, ca],
          ] as [Vec2, Vec2, Vec2][]
        })()

  const points = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: n }, () => (vertices === tri ? rng.inTriangle(tri[0], tri[1], tri[2]) : rng.inPolygon(vertices)))
  }, [seed, n, vertices])

  const areas = regions.map(([a, b, c]) => triangleArea(a, b, c))
  const total = areas.reduce((x, y) => x + y, 0)
  const xs = vertices.map((v) => v[0])
  const ys = vertices.map((v) => v[1])
  const boxArea = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
  const counts = regions.map(([a, b, c]) => points.filter((p) => inTriangleTest(p, a, b, c)).length)

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 20)
    const map = ([px, py]: Vec2): [number, number] => [x + s / 2 + px * s * 0.48, y + s / 2 + py * s * 0.48]
    ctx.strokeStyle = c.muted
    ctx.globalAlpha = 0.25
    for (const [a, b, cc] of regions) {
      ctx.beginPath()
      ;[a, b, cc].forEach((p, i) => (i ? ctx.lineTo(...map(p)) : ctx.moveTo(...map(p))))
      ctx.closePath()
      ctx.stroke()
    }
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = c.fg
    ctx.lineWidth = 1.5
    ctx.beginPath()
    vertices.forEach((p, i) => (i ? ctx.lineTo(...map(p)) : ctx.moveTo(...map(p))))
    ctx.closePath()
    ctx.stroke()
    for (const p of points) {
      const [px, py] = map(p)
      ctx.fillStyle = rampAt(c.ramp, (Math.atan2(p[1], p[0]) + Math.PI) / TAU)
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(px, py, 1.6, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Points"
      title="Inside any shape, uniform by area"
      visual={{ label: kind === 'star' ? `rng.inPolygon(star) × ${n}` : `rng.inTriangle(a, b, c) × ${n}`, node: <ArtCanvas draw={draw} label="Points inside a shape" /> }}
      graph={{
        label: 'Each piece’s share of the points, against its share of the area',
        node: (
          <BarsChart
            labels={regions.map((_, i) => String(i + 1))}
            observed={counts.map((k) => k / n)}
            expected={areas.map((a) => a / total)}
            observedLabel="share of points"
            expectedLabel="share of area"
            label="Points per region against area per region"
            xLabel={kind === 'star' ? 'triangles of the fan' : 'midpoint triangles'}
          />
        ),
      }}
      controls={
        <>
          <Segmented
            label="shape"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'star', label: 'inPolygon (star)' },
              { value: 'triangle', label: 'inTriangle' },
            ]}
          />
          <ParamSlider label="points" value={n} min={200} max={8000} step={100} onChange={setN} />
          {kind === 'star' && (
            <>
              <ParamSlider label="arms" value={arms} min={3} max={12} step={1} onChange={setArms} />
              <ParamSlider label="inner radius" value={inner} min={0.1} max={1} step={0.01} onChange={setInner} />
            </>
          )}
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.inTriangle(a, b, c)   // always two draws
rng.inPolygon(vertices)   // convex or not
pointInPolygon(p, vertices)`}
    >
      <P>{'`inTriangle` takes two uniform numbers `u, v` as a point of the parallelogram on two edges, and folds it back in half when `u + v > 1` — two draws, no rejection, every point equally likely.'}</P>
      <P>`inPolygon` works for any outline, convex or not: it throws darts at the bounding box and keeps the first one `pointInPolygon` accepts. Every piece of the shape ends up with points in proportion to its area — the bars match their marks.</P>
      <Stats>
        <Stat label="darts kept by inPolygon" value={kind === 'star' ? `${fmt((100 * total) / boxArea, 3)}%` : '—'} />
        <Stat label="draws per point" value={kind === 'star' ? fmt((2 * boxArea) / total, 3) : '2'} tone="brand-2" />
      </Stats>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Annulus and disc

export function DiscSlide() {
  const { text, setText, seed, reroll } = useSeed('ring')
  const [inner, setInner] = useState(0.3)
  const [naive, setNaive] = useState(false)
  const [n, setN] = useState(3000)
  const points = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: n }, (): Vec2 => {
      if (!naive) return rng.inAnnulus({ inner })
      const r = inner + rng.number() * (1 - inner)
      const a = rng.randomAngle()
      return [r * Math.cos(a), r * Math.sin(a)]
    })
  }, [seed, inner, naive, n])
  const radii = points.map(([x, y]) => Math.hypot(x, y))

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 16)
    const cx = x + s / 2
    const cy = y + s / 2
    const R = s / 2
    ctx.strokeStyle = c.muted
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, TAU)
    ctx.moveTo(cx + R * inner, cy)
    ctx.arc(cx, cy, R * inner, 0, TAU)
    ctx.stroke()
    for (const [px, py] of points) {
      ctx.fillStyle = rampAt(c.ramp, (Math.hypot(px, py) - inner) / (1 - inner || 1))
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(cx + px * R, cy + py * R, 1.7, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Points"
      title={<>Discs and rings: <code className="font-mono text-[0.8em]">inAnnulus</code></>}
      visual={{ label: naive ? 'radius uniform: crowded in the middle' : `rng.inAnnulus({ inner: ${inner} })`, node: <ArtCanvas draw={draw} label="Points in a ring" /> }}
      graph={{
        label: 'How far from the centre the points land',
        node: <DensityChart draws={radii} domain={[0, 1]} pdf={(r) => (r < inner || r > 1 ? 0 : (2 * r) / (1 - inner * inner))} bins={40} label="Histogram of radii" xLabel="radius" />,
      }}
      controls={
        <>
          <ParamSlider label="inner" value={inner} min={0} max={0.95} step={0.01} onChange={setInner} />
          <ParamSlider label="points" value={n} min={200} max={8000} step={100} onChange={setN} />
          <ToggleControl label="naive: radius uniform" checked={naive} onChange={setNaive} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.inAnnulus({ inner: 0.8 })  // outer defaults to 1
rng.inUnitDisc({ radius: 3 })   // inner = 0
// r = √(inner² + u·(outer² − inner²))`}
    >
      <P>Picking a random angle and a uniformly random radius looks reasonable, and is wrong: there is far more room near the rim than near the centre, so the points crowd inwards. The circumference at radius `r` grows with `r`, so the density of the radius must too.</P>
      <P>Taking the square root of a uniform draw (squared bounds and all, for a ring) is exactly the inverse transform that density needs. Toggle the naive version and watch the histogram leave the line.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Directions on a circle

export function CircleSlide() {
  const { text, setText, seed, reroll } = useSeed('compass')
  const [method, setMethod] = useState<'correct' | 'normalise'>('normalise')
  const [n, setN] = useState(600)
  const dirs = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: 20000 }, (): Vec2 => {
      if (method === 'correct') return rng.onUnitCircle()
      const [x, y] = rng.uniformVec2({ from: -1, to: 1 })
      const l = Math.hypot(x, y)
      return [x / l, y / l]
    })
  }, [seed, method])
  const angles = dirs.map(([x, y]) => Math.atan2(y, x))

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 16)
    const cx = x + s / 2
    const cy = y + s / 2
    const R = s / 2
    ctx.lineCap = 'round'
    for (let i = 0; i < n; i++) {
      const [dx, dy] = dirs[i]
      const t = (Math.atan2(dy, dx) + Math.PI) / TAU
      ctx.strokeStyle = rampAt(c.ramp, Math.abs(t * 2 - 1))
      ctx.globalAlpha = 0.28
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx + dx * R * 0.12, cy + dy * R * 0.12)
      ctx.lineTo(cx + dx * R * 0.97, cy + dy * R * 0.97)
      ctx.stroke()
      ctx.globalAlpha = 0.9
      ctx.fillStyle = ctx.strokeStyle
      ctx.beginPath()
      ctx.arc(cx + dx * R * 0.97, cy + dy * R * 0.97, 2, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Vectors"
      title="Random directions, done properly"
      visual={{ label: method === 'correct' ? 'rng.onUnitCircle()' : 'a point in the square, normalised', note: `${n} directions`, node: <ArtCanvas draw={draw} label="A burst of random directions" /> }}
      graph={{
        label: 'Histogram of the angles',
        note: '20,000 directions',
        node: <DensityChart draws={angles} domain={[-Math.PI, Math.PI]} pdf={() => 1 / TAU} bins={64} label="Histogram of direction angles" xLabel="angle (radians)" />,
      }}
      controls={
        <>
          <Segmented
            label="method"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'normalise', label: 'normalise a square point' },
              { value: 'correct', label: 'onUnitCircle()' },
            ]}
          />
          <ParamSlider label="directions drawn" value={n} min={50} max={3000} step={50} onChange={setN} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.onUnitCircle()             // [cos θ, sin θ]
rng.inUnitDisc({ radius: 0.5 })
rng.randomAngle()               // 0 to 2π`}
    >
      <P>A tempting way to get a direction is to take a random point in a square and scale it to length one. But a square has corners: there is more square along the diagonals than along the axes, so the diagonals come up about 40% more often.</P>
      <P>`onUnitCircle` draws the angle itself, uniformly, and returns `[cos θ, sin θ]` — every heading equally likely. The burst on the left shows the naive bias as four faint spokes; the histogram makes it unmistakable.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Spheres

export function SphereSlide() {
  const { text, setText, seed, reroll } = useSeed('globe')
  const [method, setMethod] = useState<'sphere' | 'latlong' | 'ball'>('latlong')
  const yaw = useRef(0)
  const points = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: 4000 }, (): Vec3 => {
      if (method === 'sphere') return rng.onUnitSphere()
      if (method === 'ball') return rng.inUnitBall()
      const lat = (rng.number() - 0.5) * Math.PI
      const lon = rng.randomAngle()
      return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]
    })
  }, [seed, method])
  const zs = points.map((p) => p[2])

  const draw: Draw = (ctx, size, c) => {
    const { s } = square(size, 24)
    const cx = size.width / 2
    const cy = size.height / 2
    const R = s / 2
    const tilt = 0.45
    const paint = () => {
      ctx.clearRect(0, 0, size.width, size.height)
      ctx.strokeStyle = c.muted
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, TAU)
      ctx.stroke()
      const cyw = Math.cos(yaw.current)
      const syw = Math.sin(yaw.current)
      const projected = points.map(([x, y, z]) => {
        const x1 = x * cyw - y * syw
        const y1 = x * syw + y * cyw
        const depth = y1 * Math.cos(tilt) + z * Math.sin(tilt)
        const up = z * Math.cos(tilt) - y1 * Math.sin(tilt)
        return [cx + x1 * R, cy - up * R, depth, z] as const
      })
      projected.sort((a, b) => b[2] - a[2])
      for (const [px, py, d, z] of projected) {
        ctx.fillStyle = rampAt(c.ramp, (z + 1) / 2)
        ctx.globalAlpha = 0.25 + 0.65 * ((1 - d) / 2)
        ctx.fillRect(px - 1.4, py - 1.4, 2.8, 2.8)
      }
      ctx.globalAlpha = 1
    }
    return () => {
      yaw.current += 0.004
      paint()
    }
  }

  return (
    <SlideFrame
      kicker="Vectors"
      title="Points on a sphere, and in a ball"
      visual={{ label: method === 'latlong' ? 'latitude and longitude, each uniform' : method === 'sphere' ? 'rng.onUnitSphere()' : 'rng.inUnitBall()', note: '4,000 points', node: <ArtCanvas draw={draw} label="A rotating sphere of points" /> }}
      graph={{
        label: 'Histogram of the height, z',
        node: (
          <DensityChart
            draws={zs}
            domain={[-1, 1]}
            pdf={method === 'ball' ? (z) => 0.75 * (1 - z * z) : () => 0.5}
            bins={40}
            label="Histogram of z coordinates"
            xLabel="z"
          />
        ),
      }}
      controls={
        <>
          <Segmented
            label="method"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'latlong', label: 'lat / long' },
              { value: 'sphere', label: 'onUnitSphere()' },
              { value: 'ball', label: 'inUnitBall()' },
            ]}
          />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.onUnitSphere() // z uniform in [−1, 1], then an angle
rng.inUnitBall()   // that, times ∛u`}
    >
      <P>Latitude and longitude are the obvious coordinates, and uniform values of them crowd the poles: a band of latitude near the pole is a tiny circle, near the equator a huge one, yet each gets the same share of points.</P>
      <P>Archimedes knew the fix: the area of a sphere between two heights is proportional to the gap between them. So `onUnitSphere` draws the height `z` uniformly, then an angle around it. `inUnitBall` scales that by the cube root of a uniform number, since volume grows with `r³`.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Gaussian vectors

export function GaussianVecSlide() {
  const { text, setText, seed, reroll } = useSeed('nebula')
  const [sd, setSd] = useState(0.08)
  const [clusters, setClusters] = useState(5)

  const { blobs, radii } = useMemo(() => {
    const rng = new RNG(seed)
    const centres = Array.from({ length: clusters }, () => ({ at: rng.uniformVec2({ from: 0.2, to: 0.8 }), sd: sd * rng.logNormal({ sigma: 0.4 }), t: rng.number() }))
    const blobs = centres.flatMap((c) => Array.from({ length: Math.round(5000 / clusters) }, () => ({ p: rng.gaussianVec2({ mean: c.at, sd: c.sd }), t: c.t })))
    const probe = new RNG(seed).stream('probe')
    const radii = Array.from({ length: 20000 }, () => Math.hypot(...probe.gaussianVec2()))
    return { blobs, radii }
  }, [seed, sd, clusters])

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 8)
    for (const b of blobs) {
      ctx.fillStyle = rampAt(c.ramp, b.t)
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      ctx.arc(x + b.p[0] * s, y + b.p[1] * s, 1.5, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Vectors"
      title={<>Round blurs: <code className="font-mono text-[0.8em]">gaussianVec2</code></>}
      visual={{ label: `${clusters} clusters of gaussianVec2({ mean, sd })`, node: <ArtCanvas draw={draw} label="Gaussian clusters" /> }}
      graph={{
        label: 'Distance from the mean, in standard deviations',
        node: (
          <DensityChart draws={radii} domain={[0, 4]} pdf={(r) => r * Math.exp((-r * r) / 2)} bins={60} label="Histogram of distances from the mean" xLabel="distance / sd (a Rayleigh distribution)" />
        ),
      }}
      controls={
        <>
          <ParamSlider label="sd" value={sd} min={0.01} max={0.2} step={0.005} onChange={setSd} />
          <ParamSlider label="clusters" value={clusters} min={1} max={12} step={1} onChange={setClusters} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.gaussianVec2({ mean: [0.5, 0.5], sd: 0.1 })
rng.gaussianVec3({ sd: 2 })
rng.uniformVec3({ from: -1, to: 1 })`}
    >
      <P>Independent gaussians on each axis make a blur that is perfectly round — the only distribution with independent coordinates that does not care which way is up. That makes `gaussianVec2`, `gaussianVec3` and `gaussianVec4` the natural way to scatter things about a centre.</P>
      <P>The distance from the centre is not gaussian, though: it follows a Rayleigh distribution, rarely right at the mean, most often about one standard deviation out. `uniformVec2`, `3` and `4` are the boxy counterparts: each component uniform between `from` and `to`.</P>
    </SlideFrame>
  )
}
