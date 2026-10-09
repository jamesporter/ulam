import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RNG, type Vec3 } from 'ulam-prng'
import { Demo, ParamSlider, SeedControl, Segmented } from './controls'
import { useSeed } from './seed'
import { prepareCanvas, useColours } from './useColours'

function Panel({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-right text-xs text-muted-foreground">{note}</span>
      </div>
      {children}
    </div>
  )
}

export function DiscDemo() {
  const { text, setText, seed, reroll } = useSeed('disc')
  const [n, setN] = useState(1500)
  const rng = new RNG(seed)
  const good = Array.from({ length: n }, () => rng.inUnitDisc())
  const naive = Array.from({ length: n }, () => {
    const r = rng.number()
    const a = rng.randomAngle()
    return [r * Math.cos(a), r * Math.sin(a)]
  })

  const plot = (pts: number[][], label: string) => (
    <svg viewBox="-1.05 -1.05 2.1 2.1" className="aspect-square w-full border bg-card" role="img" aria-label={label}>
      <circle r={1} className="fill-none stroke-foreground/20" strokeWidth={0.008} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.011} className="fill-brand" />
      ))}
    </svg>
  )

  return (
    <Demo
      title="Points in a disc"
      caption="Picking a radius uniformly crowds the middle, because there is less area near the centre to share it with. inUnitDisc is uniform by area."
      controls={
        <>
          <ParamSlider label="points" value={n} min={100} max={5000} step={100} onChange={setN} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <Panel title="Naive" note="radius = rng.number()">
          {plot(naive, 'Naive disc points')}
        </Panel>
        <Panel title="rng.inUnitDisc()" note="uniform by area">
          {plot(good, 'Uniform disc points')}
        </Panel>
      </div>
    </Demo>
  )
}

/** A polar histogram of directions: petal length is how often each heading came up. */
function Rose({ angles, label }: { angles: number[]; label: string }) {
  const bins = 48
  const counts = new Array<number>(bins).fill(0)
  for (const a of angles) counts[Math.floor((((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / ((2 * Math.PI) / bins)) % bins]++
  const expected = angles.length / bins
  const scale = 0.55 / expected
  return (
    <svg viewBox="-1.1 -1.1 2.2 2.2" className="aspect-square w-full border bg-card" role="img" aria-label={label}>
      <circle r={0.55} className="fill-none stroke-brand-2" strokeWidth={0.012} strokeDasharray="0.03 0.03" />
      {counts.map((c, i) => {
        const a0 = (i / bins) * Math.PI * 2
        const a1 = ((i + 1) / bins) * Math.PI * 2
        const r = Math.min(c * scale, 1.05)
        return (
          <path
            key={i}
            d={`M0,0L${r * Math.cos(a0)},${r * Math.sin(a0)}A${r},${r} 0 0 1 ${r * Math.cos(a1)},${r * Math.sin(a1)}Z`}
            className="fill-brand/70 stroke-card"
            strokeWidth={0.006}
          />
        )
      })}
    </svg>
  )
}

export function DirectionsDemo() {
  const { text, setText, seed, reroll } = useSeed('compass')
  const n = 20000
  const { good, naive } = useMemo(() => {
    const rng = new RNG(seed)
    const good = Array.from({ length: n }, () => {
      const [x, y] = rng.onUnitCircle()
      return Math.atan2(y, x)
    })
    const naive = Array.from({ length: n }, () => {
      const [x, y] = rng.uniformVec2({ from: -1, to: 1 })
      return Math.atan2(y, x)
    })
    return { good, naive }
  }, [seed])

  return (
    <Demo
      title="Random directions"
      caption={`${n.toLocaleString()} directions each. Normalising a random point in a square favours the diagonals, where the square reaches further; onUnitCircle has no favourites. The dashed ring is perfectly even.`}
      controls={<SeedControl text={text} setText={setText} reroll={reroll} className="sm:col-span-2" />}
    >
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <Panel title="Naive" note="normalise(uniformVec2)">
          <Rose angles={naive} label="Directions from a normalised square" />
        </Panel>
        <Panel title="rng.onUnitCircle()" note="uniform by angle">
          <Rose angles={good} label="Directions from onUnitCircle" />
        </Panel>
      </div>
    </Demo>
  )
}

function SphereCanvas({ points, label }: { points: Vec3[]; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const colours = useColours()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const size = canvas.clientWidth
    const ctx = prepareCanvas(canvas, size, size)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let t = 0.6
    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      const c = Math.cos(t)
      const s = Math.sin(t)
      const tilt = 0.45
      const ct = Math.cos(tilt)
      const st = Math.sin(tilt)
      const projected = points.map(([x, y, z]) => {
        // Spin about the polar (z) axis, then tip towards the viewer
        const x1 = x * c - y * s
        const y1 = x * s + y * c
        const y2 = y1 * ct - z * st
        const z2 = y1 * st + z * ct
        return [x1, z2, y2] as const
      })
      projected.sort((a, b) => a[2] - b[2])
      for (const [x, y, depth] of projected) {
        ctx.globalAlpha = 0.25 + 0.75 * ((depth + 1) / 2)
        ctx.fillStyle = depth > 0 ? colours.brand : colours.brand2
        ctx.beginPath()
        ctx.arc(size / 2 + x * size * 0.42, size / 2 - y * size * 0.42, 1.6 + depth * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (!reduced) {
        t += 0.004
        raf = requestAnimationFrame(draw)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [points, colours])

  return <canvas ref={ref} className="aspect-square w-full border bg-card" role="img" aria-label={label} />
}

export function SphereDemo() {
  const { text, setText, seed, reroll } = useSeed('globe')
  const [n, setN] = useState(1500)
  const [method, setMethod] = useState<'sphere' | 'latlong' | 'ball'>('sphere')

  const points = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: n }, (): Vec3 => {
      if (method === 'sphere') return rng.onUnitSphere()
      if (method === 'ball') return rng.inUnitBall()
      const lon = rng.randomAngle()
      const lat = (rng.number() - 0.5) * Math.PI
      return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]
    })
  }, [seed, n, method])

  const notes = {
    sphere: 'onUnitSphere(): even everywhere.',
    latlong: 'Uniform latitude and longitude: the poles are crowded, since every line of latitude gets the same share however short it is.',
    ball: 'inUnitBall(): uniform by volume, so most points sit near the surface where most of the volume is.',
  }

  return (
    <Demo
      title="Points on and in a sphere"
      caption={notes[method]}
      controls={
        <>
          <Segmented
            label="method"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'sphere', label: 'onUnitSphere' },
              { value: 'latlong', label: 'lat/long' },
              { value: 'ball', label: 'inUnitBall' },
            ]}
          />
          <ParamSlider label="points" value={n} min={200} max={4000} step={100} onChange={setN} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="p-5">
        <div className="mx-auto max-w-sm">
          <SphereCanvas points={points} label="Rotating sphere of points" />
        </div>
      </div>
    </Demo>
  )
}

export function BlurDemo() {
  const { text, setText, seed, reroll } = useSeed('blur')
  const [sd, setSd] = useState(0.12)
  const [n, setN] = useState(1200)
  const rng = new RNG(seed)
  const pts = Array.from({ length: n }, () => rng.gaussianVec2({ mean: [0.5, 0.5], sd }))
  const uni = Array.from({ length: Math.round(n / 4) }, () => rng.uniformVec2())

  return (
    <Demo
      title="gaussianVec2 and uniformVec2"
      caption="A round blur about the centre, over a sprinkling of uniform points."
      controls={
        <>
          <ParamSlider label="sd" value={sd} min={0.02} max={0.3} step={0.005} onChange={setSd} />
          <ParamSlider label="points" value={n} min={100} max={4000} step={100} onChange={setN} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="p-5">
        <svg viewBox="0 0 1 1" className="mx-auto aspect-square w-full max-w-sm overflow-hidden border bg-card" role="img" aria-label="Gaussian blur of points">
          {uni.map(([x, y], i) => (
            <circle key={`u${i}`} cx={x} cy={y} r={0.005} className="fill-brand-2" />
          ))}
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={0.005} className="fill-brand" opacity={0.7} />
          ))}
        </svg>
      </div>
    </Demo>
  )
}
