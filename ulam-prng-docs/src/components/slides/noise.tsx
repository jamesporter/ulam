import { useMemo, useState } from 'react'
import { RNG, type NoiseField, type Vec2 } from 'ulam-prng'
import { ParamSlider, SeedControl, Segmented, ToggleControl } from '@/components/viz/controls'
import { useSeed } from '@/components/viz/seed'
import { rampAt, type Colours } from '@/components/viz/useColours'
import { Chart, DensityChart, linePath } from './charts'
import { ArtCanvas, P, SlideFrame, square, type Draw } from './kit'

type Rgb = [number, number, number]

/** Any colour a canvas understands, as RGB bytes. */
function toRgb(colour: string): Rgb {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = colour
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

/** 256 colours from the background through the two brand colours to the foreground. */
function colourMap(c: Colours, bands = 0): Rgb[] {
  const stops = [toRgb(c.bg), toRgb(c.brand), toRgb(c.brand2), toRgb(c.fg)]
  const positions = [0, 0.5, 0.82, 1]
  return Array.from({ length: 256 }, (_, i) => {
    let t = i / 255
    if (bands) t = Math.min(1, Math.floor(t * bands) / (bands - 1))
    let s = 0
    while (s < stops.length - 2 && t > positions[s + 1]) s++
    const u = (t - positions[s]) / (positions[s + 1] - positions[s])
    return [0, 1, 2].map((k) => stops[s][k] + (stops[s + 1][k] - stops[s][k]) * u) as Rgb
  })
}

/** Paints a field into a square, at a modest resolution scaled up smoothly. */
function paintField(ctx: CanvasRenderingContext2D, area: { s: number; x: number; y: number }, res: number, value: (u: number, v: number) => number, map: Rgb[], contours = false) {
  const off = document.createElement('canvas')
  off.width = off.height = res
  const octx = off.getContext('2d')!
  const image = octx.createImageData(res, res)
  const values = new Float32Array(res * res)
  let lo = Infinity
  let hi = -Infinity
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const v = value(i / res, j / res)
      values[j * res + i] = v
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  const span = hi - lo || 1
  const bandOf = (v: number) => Math.floor(((v - lo) / span) * 9.999)
  for (let p = 0; p < values.length; p++) {
    const idx = Math.max(0, Math.min(255, Math.round(((values[p] - lo) / span) * 255)))
    let [r, g, b] = map[idx]
    if (contours) {
      const i = p % res
      const j = Math.floor(p / res)
      const here = bandOf(values[p])
      const edge = (i + 1 < res && bandOf(values[p + 1]) !== here) || (j + 1 < res && bandOf(values[p + res]) !== here)
      if (edge) [r, g, b] = [r * 0.55, g * 0.55, b * 0.55]
    }
    image.data[p * 4] = r
    image.data[p * 4 + 1] = g
    image.data[p * 4 + 2] = b
    image.data[p * 4 + 3] = 255
  }
  octx.putImageData(image, 0, 0)
  ctx.imageSmoothingEnabled = !contours
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(off, area.x, area.y, area.s, area.s)
}

type Kind = 'simplex' | 'perlin' | 'value'

function field(rng: RNG, kind: Kind): NoiseField {
  return kind === 'simplex' ? rng.simplexNoise() : kind === 'perlin' ? rng.perlinNoise() : rng.valueNoise()
}

const kindClass: Record<Kind, string> = { simplex: 'stroke-brand', perlin: 'stroke-brand-2', value: 'stroke-chart-3' }
const kindKey: Record<Kind, string> = { simplex: 'bg-brand', perlin: 'bg-brand-2', value: 'bg-chart-3' }

// ---------------------------------------------------------------------------
// Noise

export function NoiseSlide() {
  const { text, setText, seed, reroll } = useSeed('landscape')
  const [kind, setKind] = useState<Kind>('simplex')
  const [scale, setScale] = useState(4)
  const [animate, setAnimate] = useState(true)
  const fields = useMemo(() => ({ simplex: field(new RNG(seed), 'simplex'), perlin: field(new RNG(seed), 'perlin'), value: field(new RNG(seed), 'value') }), [seed])

  const draw: Draw = (ctx, size, c) => {
    const area = square(size, 16)
    const map = colourMap(c)
    const f = fields[kind]
    const paint = (z: number) => paintField(ctx, area, animate ? 110 : 200, (u, v) => f.at(u * scale, v * scale, z), map)
    if (!animate) {
      paint(0)
      return
    }
    return (frame) => {
      paint(frame * 0.01)
    }
  }

  return (
    <SlideFrame
      kicker="Noise"
      title="Coherent noise: smooth randomness"
      visual={{ label: `rng.${kind}Noise().at(x × ${scale}, y × ${scale}${animate ? ', t' : ''})`, note: animate ? 'z is time' : undefined, node: <ArtCanvas draw={draw} label="A noise field" /> }}
      graph={{
        label: 'The same seed’s three fields, along one line',
        node: (
          <Chart
            x={[0, scale]}
            y={[-1, 1]}
            label="One dimensional slices through three noise fields"
            xLabel="x"
            keyItems={(['simplex', 'perlin', 'value'] as Kind[]).map((k) => ({ label: `${k}Noise`, className: kindKey[k], line: true }))}
          >
            {({ x, y }) => (
              <>
                {(['value', 'perlin', 'simplex'] as Kind[]).map((k) => (
                  <path
                    key={k}
                    d={linePath(Array.from({ length: 401 }, (_, i) => [(i / 400) * scale, fields[k].at((i / 400) * scale, scale / 2)]), x, y)}
                    className={`fill-none ${kindClass[k]}`}
                    strokeWidth={k === kind ? 3 : 1.5}
                    opacity={k === kind ? 1 : 0.45}
                  />
                ))}
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <Segmented
            label="noise"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'simplex', label: 'simplex' },
              { value: 'perlin', label: 'perlin' },
              { value: 'value', label: 'value' },
            ]}
          />
          <ParamSlider label="scale (zoom out)" value={scale} min={0.5} max={16} step={0.25} onChange={setScale} />
          <ToggleControl label="animate the third dimension" checked={animate} onChange={setAnimate} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`const noise = rng.simplexNoise() // or perlinNoise, valueNoise
noise.at(x * 4)                  // 1D, in [−1, 1]
noise.at(x * 4, y * 4)           // 2D
noise.at(x * 4, y * 4, t)        // 3D, t often time`}
    >
      <P>Independent random numbers jump: neighbouring pixels have nothing to do with each other. **Coherent noise** is a random *landscape* instead — nearby points get nearby values, points a unit apart are unrelated — so heights, hues and angles drift rather than flicker.</P>
      <P>Value noise interpolates random values on a grid: blobby and cheap. Perlin noise interpolates random *gradients*, so it has no flat plateaus. Simplex noise, Perlin’s successor, uses a triangular grid with no grid-aligned streaks. Building a field draws a few hundred numbers; sampling it draws none.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Fractal Brownian motion

export function FbmSlide() {
  const { text, setText, seed, reroll } = useSeed('ridges')
  const [octaves, setOctaves] = useState(5)
  const [lacunarity, setLacunarity] = useState(2)
  const [gain, setGain] = useState(0.5)
  const base = useMemo(() => new RNG(seed).perlinNoise(), [seed])
  const fbm = useMemo(() => base.fbm({ octaves, lacunarity, gain }), [base, octaves, lacunarity, gain])

  const draw: Draw = (ctx, size, c) => {
    paintField(ctx, square(size, 16), 240, (u, v) => fbm.at(u * 3, v * 3), colourMap(c, 10), true)
  }

  let total = 0
  for (let i = 0, a = 1; i < octaves; i++, a *= gain) total += a
  const xs = Array.from({ length: 501 }, (_, i) => (i / 500) * 4)

  return (
    <SlideFrame
      kicker="Noise"
      title={<>Detail at every scale: <code className="font-mono text-[0.8em]">fbm</code></>}
      visual={{ label: 'A contour map of perlinNoise().fbm({ … })', note: `${octaves} octaves`, node: <ArtCanvas draw={draw} label="Topographic map of fractal noise" /> }}
      graph={{
        label: 'Each octave, and their sum',
        node: (
          <Chart
            x={[0, 4]}
            y={[-1, 1]}
            label="Octaves of fractal noise along a line"
            xLabel="x"
            keyItems={[
              { label: 'octaves, finer and fainter', className: 'bg-brand-2/60', line: true },
              { label: 'fbm: their sum', className: 'bg-brand', line: true },
            ]}
          >
            {({ x, y }) => (
              <>
                {Array.from({ length: octaves }, (_, i) => {
                  const freq = lacunarity ** i
                  const amp = gain ** i / total
                  return <path key={i} d={linePath(xs.map((t) => [t, amp * base.at(t * freq, 0.5)]), x, y)} className="fill-none stroke-brand-2" strokeWidth={1.5} opacity={0.85 - (i / octaves) * 0.5} />
                })}
                <path d={linePath(xs.map((t) => [t, fbm.at(t, 0.5)]), x, y)} className="fill-none stroke-brand" strokeWidth={3} />
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="octaves" value={octaves} min={1} max={8} step={1} onChange={setOctaves} />
          <ParamSlider label="lacunarity" value={lacunarity} min={1.2} max={3.5} step={0.05} onChange={setLacunarity} />
          <ParamSlider label="gain" value={gain} min={0.1} max={0.9} step={0.01} onChange={setGain} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`const hills = noise.fbm({ octaves: 6, lacunarity: 2, gain: 0.5 })
hills.at(x, y) // still in [−1, 1]`}
    >
      <P>Real terrain is rough at every scale: mountains have ridges, ridges have rocks. **Fractal Brownian motion** adds up octaves of the same noise, each `lacunarity` times finer and `gain` times fainter than the last, and rescales the sum back into `[−1, 1]`.</P>
      <P>The result is another field, sampled exactly the same way, so the configuring is done once rather than at every point. A high gain keeps the fine octaves loud — craggy; a low gain lets them fade — rolling hills.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Flow fields

export function FlowSlide() {
  const { text, setText, seed, reroll } = useSeed('current')
  const [zoom, setZoom] = useState(2.4)
  const [turns, setTurns] = useState(1)
  const [minDist, setMinDist] = useState(0.03)
  const [steps, setSteps] = useState(40)

  const { strokes, values } = useMemo(() => {
    const rng = new RNG(seed)
    const f = rng.stream('field').simplexNoise().fbm({ octaves: 3 })
    const starts = rng.stream('layout').poissonDiskPoints({ minDist })
    const style = rng.stream('style')
    const strokes = starts.map(([x, y]) => {
      const t = style.beta({ alpha: 2, beta: 2 })
      const width = style.logNormal({ mu: 0.1, sigma: 0.45 })
      let px = x
      let py = y
      const path: Vec2[] = [[px, py]]
      for (let i = 0; i < steps; i++) {
        const angle = f.at(px * zoom, py * zoom) * Math.PI * 2 * turns
        px += Math.cos(angle) * 0.005
        py += Math.sin(angle) * 0.005
        path.push([px, py])
      }
      return { path, t, width }
    })
    const values: number[] = []
    for (let j = 0; j < 100; j++) for (let i = 0; i < 100; i++) values.push(f.at((i / 100) * zoom, (j / 100) * zoom))
    return { strokes, values }
  }, [seed, zoom, turns, minDist, steps])

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 12)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, s, s)
    ctx.clip()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const st of strokes) {
      ctx.strokeStyle = rampAt(c.ramp, st.t)
      ctx.lineWidth = st.width * s * 0.004
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      st.path.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)))
      ctx.stroke()
    }
    ctx.restore()
  }

  return (
    <SlideFrame
      kicker="Noise in use"
      title="Flow fields: everything together"
      visual={{ label: `${strokes.length} strokes, each following the field`, node: <ArtCanvas draw={draw} label="A flow field drawing" /> }}
      graph={{
        label: 'What values the field actually takes',
        node: <DensityChart draws={values} domain={[-1, 1]} reference={() => 0.5} referenceLabel="uniform, for comparison" bins={50} label="Histogram of noise values" xLabel="field.at(x, y)" />,
      }}
      controls={
        <>
          <ParamSlider label="noise zoom" value={zoom} min={0.5} max={8} step={0.1} onChange={setZoom} />
          <ParamSlider label="angle = value × 2π ×" value={turns} min={0.25} max={4} step={0.05} onChange={setTurns} />
          <ParamSlider label="minDist between starts" value={minDist} min={0.015} max={0.08} step={0.001} onChange={setMinDist} />
          <ParamSlider label="steps per stroke" value={steps} min={4} max={120} step={1} onChange={setSteps} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`const field = rng.stream("field").simplexNoise().fbm({ octaves: 3 })
const starts = rng.stream("layout").poissonDiskPoints({ minDist })
const style = rng.stream("style") // beta hues, log-normal widths
// each step: angle = field.at(x, y) × 2π × turns`}
    >
      <P>The home page’s picture, taken apart: Poisson disk points to start from, a noise field to steer by, and a separate stream for colour and weight, so changing one never disturbs the others.</P>
      <P>One subtlety: noise values are not uniform. They pile up near zero and rarely reach ±1, so `value × 2π` mostly points the same few ways. Turn up the multiplier to let strokes curl right round.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Random walks

export function WalkSlide() {
  const { text, setText, seed, reroll } = useSeed('wander')
  const [momentum, setMomentum] = useState(0.9)
  const [drift, setDrift] = useState(0)
  const [steps, setSteps] = useState(300)
  const [walkers, setWalkers] = useState(12)

  const paths = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: walkers }, () => rng.fork().walk({ steps, stepSize: 1, momentum, drift: [drift, 0] }))
  }, [seed, walkers, steps, momentum, drift])

  const spread = useMemo(() => {
    const curve = (m: number) => {
      const rng = new RNG(seed).stream(`spread ${m}`)
      const trials = 150
      const len = 400
      const sq = new Array<number>(len + 1).fill(0)
      for (let t = 0; t < trials; t++) {
        const path = rng.walk({ steps: len, momentum: m })
        path.forEach(([x, y], i) => (sq[i] += x * x + y * y))
      }
      return sq.map((s, i) => [i, Math.sqrt(s / trials)] as [number, number]).slice(1)
    }
    return { now: curve(momentum), brownian: curve(0) }
  }, [seed, momentum])

  const draw: Draw = (ctx, size, c) => {
    let lo = Infinity
    let hi = -Infinity
    let loY = Infinity
    let hiY = -Infinity
    for (const p of paths) for (const [x, y] of p) {
      lo = Math.min(lo, x)
      hi = Math.max(hi, x)
      loY = Math.min(loY, y)
      hiY = Math.max(hiY, y)
    }
    const span = Math.max(hi - lo, hiY - loY, 1)
    const k = (Math.min(size.width, size.height) - 40) / span
    const ox = size.width / 2 - ((lo + hi) / 2) * k
    const oy = size.height / 2 - ((loY + hiY) / 2) * k
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    paths.forEach((p, i) => {
      ctx.strokeStyle = rampAt(c.ramp, i / Math.max(1, paths.length - 1))
      ctx.globalAlpha = 0.85
      ctx.lineWidth = 1.8
      ctx.beginPath()
      p.forEach(([x, y], j) => (j ? ctx.lineTo(ox + x * k, oy + y * k) : ctx.moveTo(ox + x * k, oy + y * k)))
      ctx.stroke()
      const [ex, ey] = p[p.length - 1]
      ctx.fillStyle = ctx.strokeStyle
      ctx.beginPath()
      ctx.arc(ox + ex * k, oy + ey * k, 3, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
    ctx.fillStyle = c.fg
    ctx.beginPath()
    ctx.arc(ox, oy, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  return (
    <SlideFrame
      kicker="Walks"
      title={<>Paths that remember: <code className="font-mono text-[0.8em]">walk</code></>}
      visual={{ label: `${walkers} walks of ${steps} steps from one point`, note: `momentum ${momentum}`, node: <ArtCanvas draw={draw} label="Random walks" /> }}
      graph={{
        label: 'Typical distance from the start',
        note: 'root mean square, log–log',
        node: (
          <Chart
            x={[1, 400]}
            y={[1, 400]}
            xLog
            yLog
            label="Root mean square distance against steps"
            xLabel="steps"
            keyItems={[
              { label: `momentum ${momentum}`, className: 'bg-brand', line: true },
              { label: 'momentum 0: √n', className: 'bg-brand-2', line: true },
              { label: 'a straight line', className: 'bg-foreground/40', line: true },
            ]}
          >
            {({ x, y }) => (
              <>
                <path d={linePath([[1, 1], [400, 400]], x, y)} className="fill-none stroke-foreground/40" strokeDasharray="5 4" strokeWidth={1.5} />
                <path d={linePath(spread.brownian, x, y)} className="fill-none stroke-brand-2" strokeWidth={2.5} />
                <path d={linePath(spread.now, x, y)} className="fill-none stroke-brand" strokeWidth={3} />
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="momentum" value={momentum} min={0} max={0.995} step={0.005} onChange={setMomentum} />
          <ParamSlider label="drift (x)" value={drift} min={-0.5} max={0.5} step={0.01} onChange={setDrift} />
          <ParamSlider label="steps" value={steps} min={20} max={1000} step={10} onChange={setSteps} />
          <ParamSlider label="walkers" value={walkers} min={1} max={40} step={1} onChange={setWalkers} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.walk({ steps: 300, stepSize: 0.01, momentum: 0.9 })
rng.walk({ steps: 500, momentum: 0.97, drift: [0.5, 0] })`}
    >
      <P>A random walk is a path of steps, each heading off from where the last one ended. With no memory — `momentum` 0 — it is Brownian motion: jagged, and after `n` steps typically only `√n` from where it began.</P>
      <P>`momentum` blends each new direction with the last one, so the line turns slowly and keeps going: almost straight over short distances, still diffusing over long ones — the bend in the curve. `drift` adds a constant current on top.</P>
    </SlideFrame>
  )
}
