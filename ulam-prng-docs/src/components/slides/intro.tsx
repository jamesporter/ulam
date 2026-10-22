import { Check, Crosshair, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { RNG } from 'ulam-prng'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ParamSlider, SeedControl, Segmented, ToggleControl } from '@/components/viz/controls'
import { useSeed } from '@/components/viz/seed'
import { fmt } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { BarsChart, Chart, linePath } from './charts'
import { ArtCanvas, Measure, P, SlideFrame, square, Stat, Stats, type Draw } from './kit'
import { twoPictures } from './library'
import { superscript } from './util'
import { bitsOf, hex, lcgStep, pcgOutput, pcgStages, stateOf } from './pcg'

// ---------------------------------------------------------------------------
// Monte Carlo

const MAX_DARTS = 20000

export function MonteCarloSlide() {
  const { text, setText, seed, reroll } = useSeed('solitaire')
  const [n, setN] = useState(3000)
  const darts = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: MAX_DARTS }, () => rng.randomPoint())
  }, [seed])
  const inside = useMemo(() => {
    const out = new Uint32Array(MAX_DARTS + 1)
    for (let i = 0; i < MAX_DARTS; i++) out[i + 1] = out[i] + (darts[i][0] ** 2 + darts[i][1] ** 2 < 1 ? 1 : 0)
    return out
  }, [darts])
  const estimate = (4 * inside[n]) / n
  const animatedFor = useRef<unknown>(null)

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 28)
    const r = Math.max(1.1, Math.min(4, s / Math.sqrt(n) / 4.5))
    ctx.strokeStyle = c.muted
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.6
    ctx.strokeRect(x, y, s, s)
    ctx.beginPath()
    ctx.arc(x, y + s, s, -Math.PI / 2, 0)
    ctx.strokeStyle = c.brand2
    ctx.lineWidth = 2
    ctx.globalAlpha = 1
    ctx.stroke()
    const plot = (from: number, to: number) => {
      for (let i = from; i < to; i++) {
        const [u, v] = darts[i]
        const hit = u * u + v * v < 1
        ctx.fillStyle = hit ? c.brand : c.muted
        ctx.globalAlpha = hit ? 0.85 : 0.45
        ctx.beginPath()
        ctx.arc(x + u * s, y + (1 - v) * s, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    if (animatedFor.current === darts) {
      plot(0, n)
      return
    }
    animatedFor.current = darts
    let done = 0
    const step = Math.max(10, Math.ceil(n / 50))
    return () => {
      plot(done, Math.min(n, done + step))
      done += step
      return done < n
    }
  }

  const points: [number, number][] = []
  for (let k = 1; k <= n; k = Math.max(k + 1, Math.round(k * 1.04))) points.push([k, (4 * inside[k]) / k])
  points.push([n, estimate])
  const sigma = 4 * Math.sqrt((Math.PI / 4) * (1 - Math.PI / 4))
  const band: [number, number][] = []
  for (let i = 0; i <= 80; i++) {
    const k = Math.exp((Math.log(Math.max(2, n)) * i) / 80)
    band.push([k, sigma / Math.sqrt(k)])
  }

  return (
    <SlideFrame
      kicker="Why randomness"
      title="Ulam’s solitaire"
      visual={{ label: 'Darts at a square', note: `${n.toLocaleString()} darts`, node: <ArtCanvas draw={draw} label="Random darts in a unit square with a quarter circle" /> }}
      graph={{
        label: 'The estimate, dart by dart',
        note: 'log scale',
        node: (
          <Chart
            x={[1, Math.max(10, n)]}
            y={[2.4, 3.9]}
            xLog
            label="Running estimate of pi"
            xLabel="darts thrown"
            keyItems={[
              { label: 'estimate', className: 'bg-brand', line: true },
              { label: 'π ± 2σ/√n', className: 'bg-brand-2/40' },
            ]}
          >
            {({ x, y, top, bottom }) => (
              <>
                <path
                  d={`${linePath(band.map(([k, e]) => [k, Math.PI + 2 * e]), x, y, [bottom, top])}L${band
                    .slice()
                    .reverse()
                    .map(([k, e]) => `${x(k).toFixed(1)},${Math.min(bottom, y(Math.PI - 2 * e)).toFixed(1)}`)
                    .join('L')}Z`}
                  className="fill-brand-2/15"
                />
                <line x1={x(1)} x2={x(Math.max(10, n))} y1={y(Math.PI)} y2={y(Math.PI)} className="stroke-brand-2" strokeWidth={1.5} strokeDasharray="4 4" />
                <path d={linePath(points, x, y, [bottom, top])} className="fill-none stroke-brand" strokeWidth={2} strokeLinejoin="round" />
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="darts" value={n} min={10} max={MAX_DARTS} step={10} onChange={setN} format={(v) => v.toLocaleString()} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <P>In 1946, recovering from illness, Stanisław Ulam wondered how often a game of Canfield solitaire comes out. The combinatorics were hopeless — so why not just *play* a hundred games and count? With John von Neumann he turned that into the **Monte Carlo method**: answer a hard question by sampling it.</P>
      <P>Here, the fraction of random darts landing inside the quarter circle is π/4. The error shrinks like `1/√n`: a hundred times the darts for one more digit.</P>
      <Stats>
        <Stat label="estimate of π" value={estimate.toFixed(4)} />
        <Stat label="error" value={fmt(estimate - Math.PI, 4)} tone="brand-2" />
      </Stats>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Pseudo randomness

export function RepeatableSlide() {
  const [a, setA] = useState('sunflower')
  const [b, setB] = useState('sunflower')
  const seqA = useMemo(() => {
    const rng = new RNG(a)
    return Array.from({ length: 32 }, () => rng.number())
  }, [a])
  const seqB = useMemo(() => {
    const rng = new RNG(b)
    return Array.from({ length: 32 }, () => rng.number())
  }, [b])
  const same = seqA.every((v, i) => v === seqB[i])

  return (
    <SlideFrame
      kicker="Pseudo random numbers"
      title="Random, but repeatable"
      visual={{
        label: 'Two sketches, two seeds',
        note: same ? 'identical' : 'different',
        node: <ArtCanvas draw={twoPictures(a, b)} label="Pictures drawn from seeds A and B" />,
      }}
      graph={{
        label: 'The first 32 draws of each',
        node: (
          <Chart
            x={[0, 31]}
            y={[0, 1]}
            label="First draws from two seeds"
            xLabel="draw"
            keyItems={[
              { label: JSON.stringify(a), className: 'bg-brand', line: true },
              { label: JSON.stringify(b), className: 'bg-brand-2', line: true },
            ]}
          >
            {({ x, y }) => (
              <>
                <path d={linePath(seqA.map((v, i) => [i, v]), x, y)} className="fill-none stroke-brand" strokeWidth={2} />
                {seqA.map((v, i) => (
                  <circle key={i} cx={x(i)} cy={y(v)} r={4} className="fill-brand" />
                ))}
                <path d={linePath(seqB.map((v, i) => [i, v]), x, y)} className="fill-none stroke-brand-2" strokeWidth={2} strokeDasharray="5 4" />
                {seqB.map((v, i) => (
                  <circle key={i} cx={x(i)} cy={y(v)} r={6.5} className="fill-none stroke-brand-2" strokeWidth={1.5} />
                ))}
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            seed A
            <Input value={a} onChange={(e) => setA(e.target.value)} className="h-8 font-mono" spellCheck={false} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            seed B
            <Input value={b} onChange={(e) => setB(e.target.value)} className="h-8 font-mono" spellCheck={false} />
          </label>
        </>
      }
    >
      <P>Truly random numbers come from the physical world — radioactive decay, thermal noise, a lava lamp. A *pseudo* random number generator computes them instead: a deterministic recipe whose output merely passes for random.</P>
      <P>For art that is a feature, not a compromise. The same seed gives the same sequence on every machine, so a picture can be named, shared, debugged and drawn again. Change seed B by one letter and both the numbers and the sketch become unrelated.</P>
      <blockquote className="border-l-2 border-brand pl-4 text-sm text-muted-foreground italic">
        “Anyone who considers arithmetical methods of producing random digits is, of course, in a state of sin.”
        <footer className="mt-1 text-xs not-italic">— John von Neumann, 1951 (who used them anyway)</footer>
      </blockquote>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// A state and a step

const moduli = [16, 32, 64, 128, 256]

export function StateSlide() {
  const [m, setM] = useState(64)
  const [aRaw, setA] = useState(21)
  const [cRaw, setC] = useState(7)
  const [x0Raw, setX0] = useState(1)
  const a = Math.min(aRaw, m - 1)
  const c = Math.min(cRaw, m - 1)
  const x0 = Math.min(x0Raw, m - 1)
  const f = (x: number) => (a * x + c) % m

  // Follow the orbit from x0 until it repeats: a tail, then a cycle
  const seen = new Map<number, number>()
  const orbit: number[] = []
  for (let x = x0; !seen.has(x); x = f(x)) {
    seen.set(x, orbit.length)
    orbit.push(x)
  }
  const tail = seen.get(f(orbit[orbit.length - 1]))!
  const period = orbit.length - tail
  const onCycle = new Set(orbit.slice(tail))

  const cOdd = c % 2 === 1
  const aMod4 = (a - 1) % 4 === 0
  const steps = Math.min(160, Math.max(48, period * 3 + tail))
  const sequence: [number, number][] = []
  for (let k = 0, x = x0; k <= steps; k++, x = f(x)) sequence.push([k, x])

  return (
    <SlideFrame
      kicker="Pseudo random numbers"
      title="A state, and a step"
      visual={{
        label: 'Where each state goes next',
        note: `x → (${a}x + ${c}) mod ${m}`,
        node: (
          <Measure>
            {(size) => {
              const { s } = square(size, 26)
              const R = s / 2
              const cx = size.width / 2
              const cy = size.height / 2
              const pos = (i: number): [number, number] => [cx + R * Math.cos((i / m) * Math.PI * 2 - Math.PI / 2), cy + R * Math.sin((i / m) * Math.PI * 2 - Math.PI / 2)]
              return (
                <svg width={size.width} height={size.height} role="img" aria-label="State transition diagram">
                  {Array.from({ length: m }, (_, i) => {
                    const [x1, y1] = pos(i)
                    const [x2, y2] = pos(f(i))
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-foreground/12" strokeWidth={1} />
                  })}
                  {orbit.slice(tail).map((i, k) => {
                    const [x1, y1] = pos(i)
                    const [x2, y2] = pos(f(i))
                    return (
                      <line
                        key={`c${i}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        strokeWidth={1.75}
                        style={{ stroke: `color-mix(in oklch, var(--brand) ${Math.round((1 - k / period) * 100)}%, var(--brand-2))` }}
                        opacity={0.85}
                      />
                    )
                  })}
                  {Array.from({ length: m }, (_, i) => {
                    const [px, py] = pos(i)
                    return (
                      <circle
                        key={i}
                        cx={px}
                        cy={py}
                        r={i === x0 ? 6 : m > 128 ? 2 : 3}
                        className={i === x0 ? 'fill-brand-2' : onCycle.has(i) ? 'fill-brand' : 'fill-muted-foreground/50'}
                      />
                    )
                  })}
                </svg>
              )
            }}
          </Measure>
        ),
      }}
      graph={{
        label: 'The sequence from the seed',
        note: `period ${period}${tail ? `, after ${tail} steps` : ''}`,
        node: (
          <Chart x={[0, steps]} y={[0, m - 1]} label="Sequence of states" xLabel="step">
            {({ x, y, top, bottom }) => (
              <>
                {Array.from({ length: Math.floor((steps - tail) / period) + 1 }, (_, j) => tail + j * period)
                  .filter((k) => k > 0 && k <= steps)
                  .map((k) => (
                    <line key={k} x1={x(k)} x2={x(k)} y1={top} y2={bottom} className="stroke-brand-2/50" strokeDasharray="3 4" />
                  ))}
                <path d={linePath(sequence, x, y)} className="fill-none stroke-brand/40" strokeWidth={1} />
                {sequence.map(([k, v]) => (
                  <circle key={k} cx={x(k)} cy={y(v)} r={2.5} className="fill-brand" />
                ))}
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <Segmented label="states (m)" value={m} onChange={setM} options={moduli.map((v) => ({ value: v, label: String(v) }))} />
          <ParamSlider label="multiplier a" value={a} min={1} max={m - 1} step={1} onChange={setA} />
          <ParamSlider label="increment c" value={c} min={0} max={m - 1} step={1} onChange={setC} />
          <ParamSlider label="seed x₀" value={x0} min={0} max={m - 1} step={1} onChange={setX0} />
        </>
      }
    >
      <P>Every pseudo random generator is a **state** and a **step**: a few bytes of memory, a function from one state to the next, and a way of reading a number off each state. The seed is just the state you start in.</P>
      <P>With finitely many states the sequence must eventually repeat. The best a generator can do is visit *every* state before it does. For the linear congruential step here, the Hull–Dobell theorem says when that happens:</P>
      <ul className="space-y-1.5 text-sm">
        {[
          [cOdd, '`c` is odd'],
          [aMod4, '`a − 1` is divisible by 4'],
          [period === m, `a full period of ${m}`],
        ].map(([ok, label]) => (
          <li key={label as string} className="flex items-center gap-2">
            {ok ? <Check className="size-4 text-brand" /> : <X className="size-4 text-muted-foreground" />}
            <P className="text-sm xl:text-sm 2xl:text-base">{label as string}</P>
          </li>
        ))}
      </ul>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Lattices

const RANDU_EDGE_ON = Math.atan2(6, 9)

function randuTriples(seed: number, n: number): [number, number, number][] {
  let x = (seed | 1) >>> 0
  const next = () => {
    x = (65539 * x) % 2147483648
    return x / 2147483648
  }
  return Array.from({ length: n }, () => [next(), next(), next()])
}

export function LatticeSlide() {
  const [gen, setGen] = useState<'randu' | 'pcg'>('randu')
  const [spin, setSpin] = useState(true)
  const [k, setK] = useState(5)
  const [, redraw] = useState(0)
  const yaw = useRef(0.2)
  const pitch = useRef(0.35)

  const triples = useMemo<[number, number, number][]>(() => {
    if (gen === 'randu') return randuTriples(12345, 4000)
    const rng = new RNG('lattice')
    return Array.from({ length: 4000 }, () => [rng.number(), rng.number(), rng.number()])
  }, [gen])

  const draw: Draw = (ctx, size, c) => {
    const { s } = square(size, 30)
    const cx = size.width / 2
    const cy = size.height / 2
    const scale = s / 1.75
    const project = ([px, py, pz]: [number, number, number]) => {
      const qx = px - 0.5
      const qy = py - 0.5
      const qz = pz - 0.5
      const cyaw = Math.cos(yaw.current)
      const syaw = Math.sin(yaw.current)
      const x1 = qx * cyaw - qy * syaw
      const y1 = qx * syaw + qy * cyaw
      const cp = Math.cos(pitch.current)
      const sp = Math.sin(pitch.current)
      const depth = y1 * cp + qz * sp
      const up = qz * cp - y1 * sp
      return [cx + x1 * scale, cy - up * scale, depth] as const
    }
    const corners: [number, number, number][] = []
    for (let i = 0; i < 8; i++) corners.push([i & 1, (i >> 1) & 1, (i >> 2) & 1])
    const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
    const paint = () => {
      ctx.clearRect(0, 0, size.width, size.height)
      ctx.strokeStyle = c.muted
      ctx.globalAlpha = 0.45
      ctx.lineWidth = 1
      for (const [i, j] of edges) {
        const [x1, y1] = project(corners[i])
        const [x2, y2] = project(corners[j])
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      const projected = triples.map(project).sort((p, q) => q[2] - p[2])
      for (const [x, y, d] of projected) {
        const t = Math.max(0, Math.min(1, d + 0.5))
        ctx.globalAlpha = 0.35 + 0.55 * (1 - t)
        ctx.fillStyle = c.ramp[Math.round(t * (c.ramp.length - 1))]
        ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6)
      }
      ctx.globalAlpha = 1
    }
    paint()
    if (!spin) return
    return () => {
      yaw.current += 0.006
      paint()
    }
  }

  const edgeOn = () => {
    setSpin(false)
    yaw.current = RANDU_EDGE_ON
    pitch.current = 0
    redraw((n) => n + 1)
  }

  // A small full period LCG, for the pairs plot
  const m = 1024
  const a = 4 * k + 1
  const pairs: [number, number][] = []
  for (let i = 0, x = 1; i < m; i++) {
    const nx = (a * x + 1) % m
    pairs.push([x / m, nx / m])
    x = nx
  }

  return (
    <SlideFrame
      kicker="Pseudo random numbers"
      title="Random numbers fall mainly in the planes"
      visual={{
        label: 'Successive triples (xₙ, xₙ₊₁, xₙ₊₂)',
        note: gen === 'randu' ? 'RANDU' : 'PCG32',
        node: <ArtCanvas draw={draw} label="Three dimensional scatter of successive triples" />,
      }}
      graph={{
        label: 'Successive pairs from a small LCG',
        note: `a = ${a}, m = ${m}`,
        node: (
          <Chart x={[0, 1]} y={[0, 1]} square label="Pairs of successive values" xLabel="xₙ  →  xₙ₊₁ up">
            {({ x, y }) => (
              <>
                {pairs.map(([u, v], i) => (
                  <circle key={i} cx={x(u)} cy={y(v)} r={1.6} className="fill-brand" opacity={0.75} />
                ))}
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <Segmented
            label="generator"
            value={gen}
            onChange={(g) => {
              setGen(g)
              setSpin(true)
              pitch.current = 0.35
            }}
            options={[
              { value: 'randu', label: 'RANDU' },
              { value: 'pcg', label: 'PCG32' },
            ]}
          />
          <div className="flex items-end gap-3">
            <ToggleControl
              label="spin"
              checked={spin}
              onChange={(v) => {
                setSpin(v)
                if (v) pitch.current = 0.35
              }}
            />
            <Button variant="outline" size="sm" onClick={edgeOn}>
              <Crosshair /> Look edge on
            </Button>
          </div>
          <ParamSlider label="small LCG multiplier a" value={k} min={1} max={120} step={1} onChange={setK} format={() => String(a)} className="sm:col-span-2 lg:col-span-1 xl:col-span-2" />
        </>
      }
    >
      <P>The **linear congruential generator** — `x → (a·x + c) mod m` — is fast and was everywhere for decades. But its successive outputs are not independent: as points in space they lie on a small number of parallel planes.</P>
      <P>IBM’s RANDU (1960s, `a = 65539`, `m = 2³¹`) is the infamous case: every triple satisfies `9x − 6y + z ≡ 0`, so all of them sit on just **15 planes**. Spin the cube, then look at it edge on. PCG32’s triples, from the same view, are a featureless cloud.</P>
      <P>George Marsaglia proved in 1968 that *every* LCG does this to some degree; the small one on the right makes it obvious.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Low bits

type BitSource = 'lcg-low' | 'lcg-high' | 'pcg'
const BIT_ROWS = 4096

function bitRows(source: BitSource): number[] {
  const rng = new RNG('low bits')
  let { state, inc } = stateOf(rng)
  const out: number[] = []
  for (let i = 0; i < BIT_ROWS; i++) {
    if (source === 'pcg') out.push(pcgOutput(state))
    else if (source === 'lcg-low') out.push(Number(state & 0xffffffffn))
    else out.push(Number(state >> 32n))
    state = lcgStep(state, inc)
  }
  return out
}

/** The shortest power of two period a bit column repeats with, or 0 if none shows. */
function bitPeriod(rows: number[], bit: number): number {
  for (let p = 2; p <= rows.length / 2; p *= 2) {
    let ok = true
    for (let i = 0; ok && i + p < rows.length; i++) if (((rows[i] >>> bit) & 1) !== ((rows[i + p] >>> bit) & 1)) ok = false
    if (ok) return p
  }
  return 0
}

export function LowBitsSlide() {
  const [source, setSource] = useState<BitSource>('lcg-low')
  const rows = useMemo(() => bitRows(source), [source])
  const periods = useMemo(() => Array.from({ length: 32 }, (_, b) => bitPeriod(rows, b)), [rows])
  const cap = Math.log2(BIT_ROWS)

  const draw: Draw = (ctx, size, c) => {
    const cell = Math.max(2, Math.floor(Math.min((size.width - 40) / 32, 14)))
    const count = Math.floor((size.height - 24) / cell)
    const x0 = (size.width - cell * 32) / 2
    const y0 = (size.height - cell * count) / 2
    for (let r = 0; r < count; r++) {
      for (let b = 0; b < 32; b++) {
        const on = (rows[r] >>> (31 - b)) & 1
        ctx.fillStyle = on ? c.ramp[Math.round((b / 31) * (c.ramp.length - 1))] : c.muted
        ctx.globalAlpha = on ? 0.95 : 0.12
        ctx.fillRect(x0 + b * cell, y0 + r * cell, cell - 1, cell - 1)
      }
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Pseudo random numbers"
      title="The trouble with the low bits"
      visual={{
        label: 'Each row one output, each column one bit',
        note: 'bit 31 … bit 0',
        node: <ArtCanvas draw={draw} label="Bits of successive outputs" />,
      }}
      graph={{
        label: 'How soon each bit repeats',
        note: `in ${BIT_ROWS.toLocaleString()} outputs`,
        node: (
          <Chart
            x={[-0.5, 31.5]}
            y={[0, cap + 1]}
            xTicks={[0, 4, 8, 12, 16, 20, 24, 28, 31]}
            xFormat={(t) => `bit ${t}`}
            yTicks={[1, 3, 5, 7, 9, 11, cap]}
            yFormat={(t) => `2${superscript(t)}`}
            label="Period of each output bit"
            yLabel="period"
            keyItems={[
              { label: 'repeats', className: 'bg-brand/70' },
              { label: 'no repeat found', className: 'bg-muted-foreground/30' },
            ]}
          >
            {({ x, y, bottom }) => {
              const w = (x(1) - x(0)) * 0.7
              return periods.map((p, b) => {
                const h = p ? Math.log2(p) : cap + 1
                return <rect key={b} x={x(b) - w / 2} width={w} y={y(h)} height={bottom - y(h)} rx={1.5} className={p ? 'fill-brand/65' : 'fill-muted-foreground/25'} />
              })
            }}
          </Chart>
        ),
      }}
      controls={
        <Segmented
          label="what is shown"
          value={source}
          onChange={setSource}
          options={[
            { value: 'lcg-low', label: 'LCG low 32' },
            { value: 'lcg-high', label: 'LCG high 32' },
            { value: 'pcg', label: 'PCG output' },
          ]}
        />
      }
    >
      <P>When the modulus is a power of two — which is what makes an LCG fast — its low bits are hardly random at all. Bit 0 just alternates. Bit 1 repeats every 4 steps, bit 2 every 8: bit *k* has period `2^(k+1)`.</P>
      <P>The high bits are much better: they depend on everything below them. So the trick is to keep a big, fast, power-of-two LCG for the state, and only ever *show* a scrambled version of its best bits. Switch to the PCG output and the stripes vanish.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// PCG

function BitRow({
  bits,
  y,
  cell,
  x0,
  label,
  value,
  highlight,
  offset = 0,
}: {
  bits: number[]
  y: number
  cell: number
  x0: number
  label: string
  value: string
  highlight?: (i: number) => 'rot' | 'window' | undefined
  offset?: number
}) {
  return (
    <g>
      <text x={x0} y={y - 6} className="fill-muted-foreground text-[11px]">
        {label} <tspan className="fill-foreground font-mono">{value}</tspan>
      </text>
      {bits.map((b, i) => {
        const h = highlight?.(i)
        return (
          <rect
            key={i}
            x={x0 + (i + offset) * cell}
            y={y}
            width={cell - 1.5}
            height={cell - 1.5}
            rx={1.5}
            className={cn(
              b ? (h === 'rot' ? 'fill-brand-2' : 'fill-brand') : h === 'rot' ? 'fill-brand-2/20' : 'fill-foreground/10',
              h === 'window' && 'stroke-brand-2',
            )}
            strokeWidth={h === 'window' ? 1 : 0}
            opacity={b || h ? 1 : 0.9}
          />
        )
      })}
    </g>
  )
}

export function PcgSlide() {
  const { text, setText, seed, reroll } = useSeed('sunflower')
  const [k, setK] = useState(0)

  const { stages, old, libraryOutput } = useMemo(() => {
    const rng = new RNG(seed)
    for (let i = 0; i < k; i++) rng.next()
    const old = stateOf(rng).state
    return { stages: pcgStages(old), old, libraryOutput: rng.next() }
  }, [seed, k])

  const pairs = useMemo(() => {
    const rng = new RNG(seed)
    const outputs = Array.from({ length: 2501 }, () => rng.next() / 2 ** 32)
    return outputs.slice(1).map((v, i): [number, number] => [outputs[i], v])
  }, [seed])

  const matches = stages.output === libraryOutput

  return (
    <SlideFrame
      kicker="Pseudo random numbers"
      title="PCG: a permuted congruential generator"
      stack
      visual={{
        label: 'One draw, step by step',
        note: matches ? '✓ same as rng.next()' : '✗ differs',
        node: (
          <Measure>
            {(size) => {
              const cell = Math.max(5, Math.min(18, (size.width - 40) / 64))
              const x0 = (size.width - cell * 64) / 2
              const gap = Math.max(cell * 3.2, Math.min(78, (size.height - 40) / 6))
              const top = Math.max(30, (size.height - gap * 5 - cell) / 2)
              const oldBits = bitsOf(old, 64)
              const window = (i: number) => (i >= 64 - 59 && i < 64 - 27 ? 'window' : undefined)
              return (
                <svg width={size.width} height={size.height} role="img" aria-label="PCG output function, step by step">
                  <BitRow bits={oldBits} y={top} cell={cell} x0={x0} label="state" value={`0x${hex(old, 64)}`} highlight={(i) => (i < 5 ? 'rot' : undefined)} />
                  <BitRow bits={bitsOf(stages.shifted, 64)} y={top + gap} cell={cell} x0={x0} label="state >> 18" value="" />
                  <BitRow bits={bitsOf(stages.mixed, 64)} y={top + gap * 2} cell={cell} x0={x0} label="state ^ (state >> 18), keep bits 27–58" value="" highlight={window} />
                  <BitRow bits={bitsOf(stages.xorshifted, 32)} y={top + gap * 3} cell={cell} x0={x0} offset={5} label="32 bits" value={`0x${hex(stages.xorshifted, 32)}`} />
                  <BitRow
                    bits={bitsOf(stages.output, 32)}
                    y={top + gap * 4}
                    cell={cell}
                    x0={x0}
                    offset={5}
                    label={`rotate right by the top 5 bits of state = ${stages.rot}`}
                    value={`0x${hex(stages.output, 32)}`}
                  />
                  <text x={x0} y={top + gap * 5 + 4} className="fill-muted-foreground text-[11px]">
                    then the state moves on: <tspan className="fill-foreground font-mono">state × 6364136223846793005 + increment</tspan>
                  </text>
                </svg>
              )
            }}
          </Measure>
        ),
      }}
      graph={{
        label: 'Successive outputs, against each other',
        note: '2,500 pairs',
        node: (
          <Chart x={[0, 1]} y={[0, 1]} label="Pairs of successive PCG outputs" xLabel="next() / 2³²">
            {({ x, y }) => pairs.map(([u, v], i) => <circle key={i} cx={x(u)} cy={y(v)} r={1.5} className="fill-brand" opacity={0.6} />)}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="draws so far" value={k} min={0} max={40} step={1} onChange={setK} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`// rng.next(), the core every method builds on
old = state
state = state * 6364136223846793005n + inc
xorshifted = ((old ^ (old >> 18)) >> 27) & 0xffffffff
rot = old >> 59
return rotr32(xorshifted, rot)`}
    >
      <P>Melissa O’Neill’s PCG (2014) keeps a 64-bit LCG for its state — fast, and a full period of 2⁶⁴ — but never shows it directly. Each output is a **permutation** of the state: an xorshift folds the high bits down onto the middle ones, then the result is *rotated* by an amount taken from the top five bits.</P>
      <P>The rotation depends on the very best bits, so even the weak low bits end up scrambled. ulam-prng uses this XSH RR variant: 32 bits out per step, written with 32-bit halves because JavaScript has no unsigned 64-bit integers.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Uniform doubles

export function NumberSlide() {
  const { text, setText, seed, reroll } = useSeed('uniform')
  const [n, setN] = useState(2000)
  const [bins, setBins] = useState(20)
  const draws = useMemo(() => {
    const rng = new RNG(seed)
    return Array.from({ length: 100000 }, () => [rng.number(), rng.number()] as const)
  }, [seed])

  const counts = new Array<number>(bins).fill(0)
  for (let i = 0; i < n; i++) counts[Math.floor(draws[i][0] * bins)]++
  const expected = n / bins
  const chi2 = counts.reduce((s, o) => s + (o - expected) ** 2 / expected, 0)
  const sd = Math.sqrt(expected * (1 - 1 / bins))

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 22)
    const r = Math.max(0.7, Math.min(3, s / Math.sqrt(n) / 3.2))
    ctx.strokeStyle = c.muted
    ctx.globalAlpha = 0.4
    for (let b = 1; b < bins; b++) {
      ctx.beginPath()
      ctx.moveTo(x + (b / bins) * s, y)
      ctx.lineTo(x + (b / bins) * s, y + s)
      ctx.stroke()
    }
    ctx.globalAlpha = 0.75
    for (let i = 0; i < n; i++) {
      const [u, v] = draws[i]
      ctx.fillStyle = c.ramp[Math.floor(u * bins) % 2 ? 2 : 6]
      ctx.beginPath()
      ctx.arc(x + u * s, y + v * s, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="From bits to numbers"
      title={<>Uniform doubles: <code className="font-mono text-[0.8em]">number()</code></>}
      visual={{ label: 'Draws as points, (number(), number())', note: `${n.toLocaleString()} points`, node: <ArtCanvas draw={draw} label="Uniform points in a square" /> }}
      graph={{
        label: 'How many land in each column',
        note: `χ² = ${chi2.toFixed(1)} on ${bins - 1} df`,
        node: (
          <Chart
            x={[-0.5, bins - 0.5]}
            y={[0, Math.max(...counts, expected + 3 * sd) * 1.08]}
            xTicks={[0, Math.floor(bins / 2), bins - 1]}
            xFormat={(i) => `bin ${i + 1}`}
            label="Counts per bin"
            keyItems={[
              { label: 'count', className: 'bg-brand/70' },
              { label: 'expected ± 2σ', className: 'bg-brand-2/40' },
            ]}
          >
            {({ x, y, bottom, left, right }) => {
              const w = (x(1) - x(0)) * 0.72
              return (
                <>
                  <rect x={left} width={right - left} y={y(expected + 2 * sd)} height={y(Math.max(0, expected - 2 * sd)) - y(expected + 2 * sd)} className="fill-brand-2/12" />
                  <line x1={left} x2={right} y1={y(expected)} y2={y(expected)} className="stroke-brand-2" strokeWidth={2} />
                  {counts.map((cnt, i) => (
                    <rect key={i} x={x(i) - w / 2} width={w} y={y(cnt)} height={bottom - y(cnt)} rx={1.5} className="fill-brand/60" />
                  ))}
                </>
              )
            }}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="draws" value={n} min={50} max={100000} step={50} onChange={setN} format={(v) => v.toLocaleString()} />
          <ParamSlider label="bins" value={bins} min={2} max={60} step={1} onChange={setBins} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`number() {
  const hi = this.next() & 0x03ffffff // 26 bits
  const lo = this.next() & 0x07ffffff // 27 bits
  return (hi * 2 ** 27 + lo) / 2 ** 53
}`}
    >
      <P>Everything else is built on a uniform number in `[0, 1)`. Dividing one 32-bit output by 2³² would leave gaps — a double has 53 bits of mantissa — so `number()` spends two draws and fills every one of them.</P>
      <P>Uniform does not mean *even*. Counts scatter around their expected value by about `√(n/bins)`, so a few thousand draws look lumpy; the χ² statistic stays near the degrees of freedom when the generator is doing its job.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Integers without bias

export function IntegerSlide() {
  const [bits, setBits] = useState(4)
  const [maxRaw, setMax] = useState(6)
  const [method, setMethod] = useState<'modulo' | 'rejection'>('modulo')
  const size = 2 ** bits
  const max = Math.min(maxRaw, size)
  const skew = size % max
  const counts = new Array<number>(max).fill(0)
  for (let v = 0; v < size; v++) if (method === 'modulo' || v >= skew) counts[v % max]++
  const total = counts.reduce((a, b) => a + b, 0)
  const probs = counts.map((c) => c / total)
  const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
  const colourOf = (r: number) => `color-mix(in oklch, ${palette[r % palette.length]} ${100 - Math.floor(r / palette.length) * 30}%, var(--foreground))`

  return (
    <SlideFrame
      kicker="From bits to numbers"
      title={<>Integers without bias: <code className="font-mono text-[0.8em]">integer(max)</code></>}
      visual={{
        label: `Every output of a ${bits}-bit generator, and where it goes`,
        note: method === 'rejection' && skew ? `${skew} rejected` : 'none rejected',
        node: (
          <Measure>
            {({ width, height }) => {
              const cols = Math.min(size, bits <= 4 ? 8 : 16)
              const rowsN = size / cols
              const cell = Math.min((width - 40) / cols, (height - 40) / rowsN, 72)
              const x0 = (width - cell * cols) / 2
              const y0 = (height - cell * rowsN) / 2
              return (
                <svg width={width} height={height} role="img" aria-label="Source values coloured by result">
                  {Array.from({ length: size }, (_, v) => {
                    const rejected = method === 'rejection' && v < skew
                    const cx = x0 + (v % cols) * cell
                    const cy = y0 + Math.floor(v / cols) * cell
                    return (
                      <g key={v}>
                        <rect
                          x={cx + 2}
                          y={cy + 2}
                          width={cell - 4}
                          height={cell - 4}
                          rx={4}
                          style={{ fill: rejected ? 'transparent' : colourOf(v % max) }}
                          className={rejected ? 'stroke-muted-foreground/50' : undefined}
                          strokeDasharray={rejected ? '3 3' : undefined}
                          opacity={rejected ? 1 : 0.85}
                        />
                        {cell > 26 && (
                          <text x={cx + cell / 2} y={cy + cell / 2} dy="0.35em" textAnchor="middle" className={cn('font-mono text-[11px]', rejected ? 'fill-muted-foreground' : 'fill-white')}>
                            {rejected ? '×' : `${v}→${v % max}`}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
              )
            }}
          </Measure>
        ),
      }}
      graph={{
        label: `The chance of each result, 0 to ${max - 1}`,
        node: (
          <BarsChart
            labels={probs.map((_, i) => String(i))}
            observed={probs}
            expected={probs.map(() => 1 / max)}
            observedLabel={method === 'modulo' ? 'next() % max' : 'with rejection'}
            expectedLabel="fair, 1 / max"
            colours={probs.map((_, i) => colourOf(i))}
            label="Probability of each result"
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
              { value: 'modulo', label: 'next() % max' },
              { value: 'rejection', label: 'integer(max)' },
            ]}
          />
          <Segmented label="toy generator" value={bits} onChange={setBits} options={[3, 4, 5, 6].map((b) => ({ value: b, label: `${b} bits` }))} />
          <ParamSlider label="max" value={max} min={2} max={size} step={1} onChange={setMax} />
        </>
      }
    >
      <P>The obvious way to roll a die is `next() % 6`. But 2³² is not a multiple of 6, so the smallest results get one extra way to happen. With a toy generator of a few bits the bias is glaring; with 32 bits it is small for a die, and huge for big ranges — at `max` = 3,000,000,000 the low results are *twice* as likely.</P>
      <P>`integer(max)` throws away the `2³² mod max` outputs that would tip the balance and draws again. It rarely needs a second try, and powers of two take a fast path with no rejection at all.</P>
      <Stats>
        <Stat label="worst bias" value={`${((Math.max(...probs) * max - 1) * 100).toFixed(1)}%`} />
        <Stat label="chance of a redraw" value={method === 'rejection' ? `${((skew / size) * 100).toFixed(1)}%` : '—'} tone="brand-2" />
      </Stats>
    </SlideFrame>
  )
}
