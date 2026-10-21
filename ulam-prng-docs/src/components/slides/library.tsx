import { Check, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { hashSeed, RNG, type RNGState } from 'ulam-prng'
import { Input } from '@/components/ui/input'
import { strokesFor } from '@/components/viz/heroSketch'
import { ParamSlider, SeedControl, Segmented } from '@/components/viz/controls'
import { useSeed, type Seed } from '@/components/viz/seed'
import { rampAt } from '@/components/viz/useColours'
import { cn } from '@/lib/utils'
import { BarsChart, Chart, linePath } from './charts'
import { binomialPmf, superscript } from './util'
import { ArtCanvas, Measure, P, SlideFrame, square, Stat, Stats, type Draw } from './kit'
import { hex, MASK64, MULTIPLIER } from './pcg'
import type { Colours } from '@/components/viz/useColours'

/** The home page's flow field picture, drawn once, without the animation. */
export function drawFlow(ctx: CanvasRenderingContext2D, area: { s: number; x: number; y: number }, seed: string, c: Colours) {
  const { s, x, y } = area
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, s, s)
  ctx.clip()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokesFor(seed || ' ')) {
    ctx.strokeStyle = rampAt(c.ramp, stroke.t)
    ctx.lineWidth = stroke.width * s * 0.0042
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    stroke.path.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)))
    ctx.stroke()
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

/** Two seeds' pictures, side by side. */
export function twoPictures(a: string, b: string): Draw {
  return (ctx, size, c) => {
    const half = { width: size.width / 2, height: size.height }
    const left = square(half, 18)
    const right = square(half, 18)
    ctx.strokeStyle = c.muted
    ctx.globalAlpha = 0.35
    ctx.strokeRect(left.x, left.y, left.s, left.s)
    ctx.strokeRect(right.x + half.width, right.y, right.s, right.s)
    ctx.globalAlpha = 1
    drawFlow(ctx, left, a, c)
    drawFlow(ctx, { ...right, x: right.x + half.width }, b, c)
  }
}

function words(seed: Seed): [number, number] {
  return typeof seed === 'string' ? hashSeed(seed) : [0, seed >>> 0]
}

function bits64([hi, lo]: [number, number]): number[] {
  return [...Array.from({ length: 32 }, (_, i) => (hi >>> (31 - i)) & 1), ...Array.from({ length: 32 }, (_, i) => (lo >>> (31 - i)) & 1)]
}

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789 '

// ---------------------------------------------------------------------------
// Seeding

export function SeedingSlide() {
  const [a, setA] = useState('tree')
  const [b, setB] = useState('tres')
  const ba = bits64(words(a))
  const bb = bits64(words(b))
  const differ = ba.filter((v, i) => v !== bb[i]).length

  // Every seed one character away from A, and how far its hash lands from A's
  const distances = useMemo(() => {
    const base = bits64(hashSeed(a))
    const out: number[] = []
    for (let i = 0; i < Math.max(1, a.length); i++) {
      for (const ch of alphabet) {
        const variant = a.slice(0, i) + ch + a.slice(i + 1)
        if (variant === a) continue
        const v = bits64(hashSeed(variant))
        out.push(v.filter((bit, j) => bit !== base[j]).length)
      }
    }
    return out
  }, [a])
  const ks = Array.from({ length: 29 }, (_, i) => 18 + i)
  const observed = ks.map((k) => distances.filter((d) => d === k).length / distances.length)

  return (
    <SlideFrame
      kicker="ulam-prng · seeds"
      title="Name a picture, not just number it"
      visual={{ label: 'Two seeds, two pictures', note: `${differ} of 64 seed bits differ`, node: <ArtCanvas draw={twoPictures(a, b)} label="Pictures from two seeds" /> }}
      graph={{
        label: `Bits flipped by a one-letter change to ${JSON.stringify(a)}`,
        note: `${distances.length} neighbours`,
        node: (
          <BarsChart
            labels={ks.map(String)}
            observed={observed}
            expected={ks.map((k) => binomialPmf(k, 64, 0.5))}
            observedLabel="neighbouring seeds"
            expectedLabel="coin flips, binomial(64, ½)"
            label="Hamming distance between hashes of neighbouring seeds"
            xLabel="bits that differ, of 64"
          />
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
      code={`new RNG(42)          // the low 32 bits of the seed
new RNG("sunflower") // hashed to 64 bits
hashSeed("tree")     // [${hashSeed('tree').join(', ')}]`}
    >
      <P>A generator needs a 64-bit seed. Numbers are taken as they are; a string goes through `hashSeed`, two murmur-style accumulators finished with an avalanche mix, so every character influences every bit.</P>
      <P>A good seed hash makes near neighbours strangers: change one letter and about half of the 64 bits flip — as if by coin toss — so `"tree"` and `"tres"` share nothing.</P>
      <svg viewBox="0 0 352 40" className="w-full max-w-md" role="img" aria-label="Seed bits of A and B, differences marked">
        <text x={0} y={10} className="fill-muted-foreground font-mono text-[9px]">A</text>
        <text x={0} y={27} className="fill-muted-foreground font-mono text-[9px]">B</text>
        {ba.map((bit, i) => (
          <rect key={`a${i}`} x={14 + i * 5.2} y={1} width={4.2} height={12} rx={1} className={bit ? 'fill-brand' : 'fill-foreground/10'} />
        ))}
        {bb.map((bit, i) => (
          <rect key={`b${i}`} x={14 + i * 5.2} y={18} width={4.2} height={12} rx={1} className={bit ? 'fill-brand-2' : 'fill-foreground/10'} />
        ))}
        {bb.map((bit, i) => (bit !== ba[i] ? <rect key={`d${i}`} x={14 + i * 5.2} y={34} width={4.2} height={3} rx={1} className="fill-foreground/60" /> : null))}
      </svg>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Streams

type Petal = { angle: number; t: number; length: number }

function flower(seed: Seed, n: number, streams: boolean): Petal[] {
  const rng = new RNG(seed)
  const layout = streams ? rng.stream('layout') : rng
  const colour = streams ? rng.stream('colour') : rng
  const angles = Array.from({ length: n }, (_, i) => ((i + (layout.number() - 0.5) * 0.5) / n) * Math.PI * 2)
  return angles.map((angle) => ({ angle, t: colour.number(), length: 0.55 + 0.45 * colour.number() }))
}

function drawFlower(ctx: CanvasRenderingContext2D, petals: Petal[], cx: number, cy: number, r: number, c: Colours) {
  for (const p of petals) {
    const len = r * p.length
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(p.angle)
    ctx.fillStyle = rampAt(c.ramp, p.t)
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(len * 0.5, -len * 0.22, len, 0)
    ctx.quadraticCurveTo(len * 0.5, len * 0.22, 0, 0)
    ctx.fill()
    ctx.restore()
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = c.fg
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.07, 0, Math.PI * 2)
  ctx.fill()
}

export function StreamsSlide() {
  const { text, setText, seed, reroll } = useSeed('sunflower')
  const [n, setN] = useState(12)
  const shared = flower(seed, n, false)
  const separate = flower(seed, n, true)

  const draw: Draw = (ctx, size, c) => {
    // Side by side in a wide panel, one above the other in a tall one
    const tall = size.height > size.width * 1.15
    const cell = tall ? { width: size.width, height: size.height / 2 } : { width: size.width / 2, height: size.height }
    const { s } = square({ width: cell.width, height: cell.height - 34 }, 14)
    const labels = ['one generator', 'stream("layout") + stream("colour")']
    ;[shared, separate].forEach((petals, i) => {
      const cx = tall ? cell.width / 2 : cell.width * (i + 0.5)
      const top = tall ? cell.height * i : 0
      const cy = top + (cell.height - 34) / 2 + 6
      drawFlower(ctx, petals, cx, cy, s / 2, c)
      ctx.fillStyle = c.muted
      ctx.font = '12px "JetBrains Mono Variable", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(labels[i], cx, top + cell.height - 14)
    })
  }

  const cells = 40
  return (
    <SlideFrame
      kicker="ulam-prng · streams"
      title="Streams: change one thing, keep the rest"
      visual={{ label: 'Add a petal, and watch the colours', note: `${n} petals`, node: <ArtCanvas draw={draw} label="Two flowers, one drawn from a single generator and one from streams" /> }}
      graph={{
        label: 'Which draw goes where',
        node: (
          <Measure>
            {({ width, height }) => {
              const cell = Math.min((width - 140) / cells, 22)
              const x0 = 120
              const rows = [
                { label: 'one generator', kinds: Array.from({ length: cells }, (_, i) => (i < n ? 'layout' : i < 3 * n ? 'colour' : 'later')) },
                { label: 'stream("layout")', kinds: Array.from({ length: cells }, (_, i) => (i < n ? 'layout' : 'later')) },
                { label: 'stream("colour")', kinds: Array.from({ length: cells }, (_, i) => (i < 2 * n ? 'colour' : 'later')) },
              ]
              const y0 = height / 2 - 70
              return (
                <svg width={width} height={height} role="img" aria-label="Draw timelines">
                  {rows.map((row, r) => (
                    <g key={row.label} transform={`translate(0,${y0 + r * 52 + (r ? 26 : 0)})`}>
                      <text x={x0 - 10} y={cell / 2} dy="0.35em" textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
                        {row.label}
                      </text>
                      {row.kinds.map((k, i) => {
                        const first = (r === 0 && i === n) || (r === 2 && i === 0)
                        return (
                          <rect
                            key={i}
                            x={x0 + i * cell}
                            width={cell - 2}
                            height={cell}
                            rx={2}
                            className={cn(k === 'layout' && 'fill-brand-2/70', k === 'colour' && 'fill-brand/70', k === 'later' && 'fill-foreground/8', first && 'stroke-foreground')}
                            strokeWidth={first ? 2 : 0}
                          />
                        )
                      })}
                    </g>
                  ))}
                  <text x={x0} y={y0 + 52 * 3 + 44} className="fill-muted-foreground text-[11px]">
                    <tspan className="fill-brand-2">■</tspan> layout <tspan className="fill-brand" dx={10}>■</tspan> colour
                  </text>
                  <text x={x0} y={y0 + 52 * 3 + 62} className="fill-muted-foreground text-[11px]">
                    outlined: the draw that colours the first petal
                  </text>
                </svg>
              )
            }}
          </Measure>
        ),
      }}
      controls={
        <>
          <ParamSlider label="petals" value={n} min={3} max={13} step={1} onChange={setN} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`const rng = new RNG("sunflower")
const layout = rng.stream("layout")
const colour = rng.stream("colour")
layout.stream("colour") // streams nest`}
    >
      <P>Draw everything from one generator and each part of a sketch depends on how much randomness came before it. Add a petal, and every colour after it shifts along by one draw.</P>
      <P>`stream(id)` hands out a named generator that depends only on the seed and the name. Under the hood the name is hashed into PCG’s **increment** — each odd increment is a different sequence through the same 2⁶⁴ states — and a fresh seed is drawn on that stream, so streams never line up with each other or with their parent.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Fork

type Plant = { x: number; height: number; lean: number; leaves: { at: number; side: number; size: number }[]; t: number }

function garden(seed: Seed, leavesOnThird: number, forked: boolean) {
  const rng = new RNG(seed)
  const taken: number[] = []
  const plants: Plant[] = []
  for (let i = 0; i < 7; i++) {
    const before = rng.getState()
    const g = forked ? rng.fork() : rng
    const count = i === 2 ? leavesOnThird : 4 + g.integer(8)
    plants.push({
      x: (i + 0.5) / 7,
      height: 0.45 + 0.4 * g.number(),
      lean: g.gaussian({ sd: 0.06 }),
      t: g.number(),
      leaves: Array.from({ length: count }, () => ({ at: 0.15 + 0.8 * g.number(), side: g.randomPolarity(), size: 0.3 + 0.7 * g.number() })),
    })
    taken.push(stepsBetween(before, rng.getState()))
  }
  return { plants, taken }
}

/** How many draws took a generator from one state to another, by stepping a copy along. */
function stepsBetween(before: RNGState, after: RNGState): number {
  const probe = new RNG(0)
  probe.setState(before)
  for (let k = 0; k < 100000; k++) {
    const [hi, lo] = probe.getState()
    if (hi === after[0] && lo === after[1]) return k
    probe.next()
  }
  return Number.NaN
}

export function ForkSlide() {
  const { text, setText, seed, reroll } = useSeed('garden')
  const [leaves, setLeaves] = useState(6)
  const [mode, setMode] = useState<'fork' | 'shared'>('fork')
  const { plants, taken } = garden(seed, leaves, mode === 'fork')

  const draw: Draw = (ctx, size, c) => {
    const ground = size.height - 36
    const w = size.width - 40
    ctx.strokeStyle = c.muted
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(20, ground)
    ctx.lineTo(size.width - 20, ground)
    ctx.stroke()
    ctx.globalAlpha = 1
    plants.forEach((p, i) => {
      const bx = 20 + p.x * w
      const h = p.height * (ground - 30)
      const tip = [bx + p.lean * h * 2, ground - h]
      const colour = rampAt(c.ramp, p.t)
      ctx.strokeStyle = i === 2 ? c.fg : colour
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(bx, ground)
      ctx.quadraticCurveTo(bx, ground - h * 0.5, tip[0], tip[1])
      ctx.stroke()
      for (const leaf of p.leaves) {
        const ly = ground - h * leaf.at
        const lx = bx + (tip[0] - bx) * leaf.at * leaf.at
        const len = (w / 7) * 0.55 * leaf.size
        ctx.fillStyle = colour
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.ellipse(lx + (leaf.side * len) / 2, ly - len * 0.2, len / 2, len / 5, leaf.side * -0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = c.muted
      ctx.font = '11px "JetBrains Mono Variable", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(i === 2 ? 'plant 3 ←' : `plant ${i + 1}`, bx, ground + 20)
    })
  }

  return (
    <SlideFrame
      kicker="ulam-prng · forks"
      title={<>Hand out generators with <code className="font-mono text-[0.8em]">fork()</code></>}
      visual={{ label: 'Seven plants', note: mode === 'fork' ? 'one fork each' : 'one shared generator', node: <ArtCanvas draw={draw} label="A row of plants" /> }}
      graph={{
        label: 'Draws each plant takes from the parent',
        node: (
          <BarsChart
            labels={taken.map((_, i) => `plant ${i + 1}`)}
            observed={taken}
            observedLabel="draws from the parent"
            label="Draws taken from the parent generator per plant"
          />
        ),
      }}
      controls={
        <>
          <Segmented
            label="each plant draws from"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'fork', label: 'rng.fork()' },
              { value: 'shared', label: 'rng itself' },
            ]}
          />
          <ParamSlider label="leaves on plant 3" value={leaves} min={0} max={24} step={1} onChange={setLeaves} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`for (const plant of plants) drawPlant(plant, rng.fork())
const [background, foreground] = rng.split(2)`}
    >
      <P>Some parts of a sketch do not have names — there are just a lot of them. `fork()` takes a fresh generator out of this one: its own seed *and* its own stream, built from exactly four of the parent’s draws.</P>
      <P>However greedy the child, the parent moves on by four. Change how many leaves plant 3 has: with forks, only plant 3 changes; with one shared generator, every plant after it does too. `split(n)` is `n` forks at once.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Skip

export function SkipSlide() {
  const [exp, setExp] = useState(6)
  const n = Math.round(10 ** exp)
  const nBits = n.toString(2)
  const length = nBits.length

  // The multiplier for a jump of 2^k is a^(2^k): square it once per bit
  const ladder = useMemo(() => {
    const out: { k: number; mult: bigint; taken: boolean }[] = []
    let mult = MULTIPLIER
    for (let k = 0; k < length; k++) {
      out.push({ k, mult, taken: nBits[length - 1 - k] === '1' })
      mult = (mult * mult) & MASK64
    }
    return out
  }, [length, nBits])

  const check = useMemo(() => {
    if (n > 2_000_000) return undefined
    const a = new RNG('skip')
    for (let i = 0; i < n; i++) a.next()
    const b = new RNG('skip').skip(n)
    return a.next() === b.next()
  }, [n])

  return (
    <SlideFrame
      kicker="ulam-prng · moving around"
      title={<>Jumping ahead: <code className="font-mono text-[0.8em]">skip(n)</code></>}
      visual={{
        label: `${n.toLocaleString()} in binary: one squaring per bit`,
        note: `${ladder.filter((r) => r.taken).length} jumps`,
        node: (
          <Measure>
            {({ width, height }) => {
              const rowH = Math.min(22, (height - 30) / Math.max(length, 8))
              const y0 = (height - rowH * length) / 2
              const barMax = width - 64 - 250
              return (
                <svg width={width} height={height} role="img" aria-label="Binary decomposition of n">
                  {ladder.map((r) => {
                    const y = y0 + (length - 1 - r.k) * rowH
                    return (
                      <g key={r.k} opacity={r.taken ? 1 : 0.45}>
                        <text x={20} y={y + rowH / 2} dy="0.35em" className="fill-muted-foreground font-mono text-[10px]">
                          2{superscript(r.k)}
                        </text>
                        <rect x={64} y={y + 2} width={Math.max(3, ((r.k + 1) / length) * barMax)} height={rowH - 4} rx={2} className={r.taken ? 'fill-brand/75' : 'fill-foreground/10'} />
                        <text x={width - 16} y={y + rowH / 2} dy="0.35em" textAnchor="end" className={cn('font-mono text-[10px]', r.taken ? 'fill-foreground' : 'fill-muted-foreground')}>
                          a^(2{superscript(r.k)}) = {hex(r.mult, 64)}
                        </text>
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
        label: 'Work to move n draws along',
        note: 'log–log',
        node: (
          <Chart
            x={[1, 1e15]}
            y={[1, 1e15]}
            xLog
            yLog
            xTicks={[1, 1e3, 1e6, 1e9, 1e12, 1e15]}
            yTicks={[1, 1e3, 1e6, 1e9, 1e12, 1e15]}
            label="Steps needed by stepping versus skipping"
            xLabel="n, draws to jump"
            keyItems={[
              { label: 'calling next() n times', className: 'bg-brand-2', line: true },
              { label: 'skip(n): squarings', className: 'bg-brand', line: true },
            ]}
          >
            {({ x, y, top, bottom }) => {
              const pts = Array.from({ length: 61 }, (_, i) => 10 ** (i / 4))
              return (
                <>
                  <path d={linePath(pts.map((v) => [v, v]), x, y)} className="fill-none stroke-brand-2" strokeWidth={2.5} />
                  <path d={linePath(pts.map((v) => [v, Math.max(1, Math.ceil(Math.log2(v + 1)))]), x, y)} className="fill-none stroke-brand" strokeWidth={2.5} />
                  <line x1={x(Math.max(1, n))} x2={x(Math.max(1, n))} y1={top} y2={bottom} className="stroke-foreground/40" strokeDasharray="3 4" />
                  <circle cx={x(Math.max(1, n))} cy={y(Math.max(1, n))} r={5} className="fill-brand-2" />
                  <circle cx={x(Math.max(1, n))} cy={y(Math.max(1, length))} r={5} className="fill-brand" />
                </>
              )
            }}
          </Chart>
        ),
      }}
      controls={<ParamSlider label="n = 10^x" value={exp} min={0} max={15} step={0.05} onChange={setExp} format={(v) => `10^${v.toFixed(2)} = ${Math.round(10 ** v).toLocaleString()}`} className="sm:col-span-2 lg:col-span-1 xl:col-span-2" />}
      code={`rng.skip(1_000_000) // as if next() ran a million times
rng.skip(-2).next()  // the draw before last, again`}
    >
      <P>Applying an LCG step twice is another LCG step: `a(ax + c) + c = a²x + (a + 1)c`. So jumping 2ᵏ steps needs only the multiplier squared *k* times. Write `n` in binary and fold in a jump for every set bit — about 64 squarings for any jump at all, instead of `n` calls.</P>
      <P>A negative `n` is a jump of 2⁶⁴ − n: the sequence is a circle, and going forward far enough is going back.</P>
      <Stats>
        <Stat label="squarings" value={length} />
        <Stat
          label="skip(n).next() matches n× next()"
          value={check === undefined ? <span className="text-sm text-muted-foreground">too far to check by hand</span> : check ? <Check className="mt-1 size-6" /> : <X className="mt-1 size-6" />}
          tone="brand-2"
        />
      </Stats>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Serialisation

const wordNames = ['seed hi', 'seed lo', 'state hi', 'state lo', 'inc hi', 'inc lo']

export function SerialiseSlide() {
  const { text, setText, seed, reroll } = useSeed('sunflower')
  const [drawn, setDrawn] = useState(12)
  const rng = new RNG(seed)
  for (let i = 0; i < drawn; i++) rng.number()
  const saved = rng.toJSON()
  const restored = RNG.fromJSON(saved)
  const original = Array.from({ length: 24 }, () => rng.number())
  const again = Array.from({ length: 24 }, () => restored.number())
  const same = original.every((v, i) => v === again[i])
  const [s0, s1, s2, s3, s4, s5] = (() => {
    const r = new RNG(seed)
    for (let i = 0; i < drawn; i++) r.number()
    const st = r.getState()
    const w = typeof seed === 'string' ? hashSeed(seed) : [0, seed >>> 0]
    return [w[0], w[1], st[0], st[1], st[2], st[3]].map((v) => v >>> 0)
  })()
  const wordValues = [s0, s1, s2, s3, s4, s5]

  return (
    <SlideFrame
      kicker="ulam-prng · saving"
      title={<>Saving where you are: <code className="font-mono text-[0.8em]">toJSON()</code></>}
      visual={{
        label: 'Six 32-bit words in 32 characters',
        note: '6 bits per character',
        node: (
          <Measure>
            {({ width, height }) => {
              const cols = width > 760 ? 16 : 8
              const cell = Math.min((width - 40) / cols, 58)
              const x0 = (width - cell * cols) / 2
              const rowsN = 32 / cols
              const y0 = height / 2 - ((cell + 8) * rowsN + 70) / 2
              return (
                <svg width={width} height={height} role="img" aria-label="The serialised string, coloured by word">
                  {saved.split('').map((ch, i) => {
                    const word = Math.floor((i * 6) / 32)
                    const straddles = Math.floor((i * 6 + 5) / 32) !== word
                    const x = x0 + (i % cols) * cell
                    const y = y0 + Math.floor(i / cols) * (cell + 8)
                    return (
                      <g key={i}>
                        <rect
                          x={x + 2}
                          y={y}
                          width={cell - 4}
                          height={cell}
                          rx={6}
                          style={{ fill: `color-mix(in oklch, var(--chart-${(word % 5) + 1}) 22%, transparent)`, stroke: `var(--chart-${(word % 5) + 1})` }}
                          strokeWidth={1.5}
                          strokeDasharray={straddles ? '4 3' : undefined}
                        />
                        <text x={x + cell / 2} y={y + cell / 2} dy="0.35em" textAnchor="middle" className="fill-foreground font-mono" style={{ fontSize: cell * 0.48 }}>
                          {ch}
                        </text>
                      </g>
                    )
                  })}
                  {wordValues.map((w, i) => (
                    <g key={i} transform={`translate(${x0 + (i % 2) * ((cell * cols) / 2)},${y0 + (cell + 8) * rowsN + 30 + Math.floor(i / 2) * 24})`}>
                      <rect width={10} height={10} y={-9} rx={2} style={{ fill: `var(--chart-${(i % 5) + 1})` }} />
                      <text x={16} className="fill-muted-foreground font-mono text-[11px]">
                        {wordNames[i]} <tspan className="fill-foreground">{hex(w, 32)}</tspan>
                      </text>
                    </g>
                  ))}
                </svg>
              )
            }}
          </Measure>
        ),
      }}
      graph={{
        label: 'Carrying on: the original and the restored copy',
        note: same ? '✓ identical' : '✗ differ',
        node: (
          <Chart
            x={[0, 23]}
            y={[0, 1]}
            label="Next draws of the original and the restored generator"
            xLabel="draws after saving"
            keyItems={[
              { label: 'original', className: 'bg-brand', line: true },
              { label: 'RNG.fromJSON(saved)', className: 'bg-brand-2', line: true },
            ]}
          >
            {({ x, y }) => (
              <>
                <path d={linePath(original.map((v, i) => [i, v]), x, y)} className="fill-none stroke-brand" strokeWidth={2} />
                {again.map((v, i) => (
                  <circle key={i} cx={x(i)} cy={y(v)} r={6} className="fill-none stroke-brand-2" strokeWidth={2} />
                ))}
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="numbers drawn before saving" value={drawn} min={0} max={100} step={1} onChange={setDrawn} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`location.hash = rng.toJSON()
// "${saved}"
const restored = RNG.fromJSON(location.hash.slice(1))`}
    >
      <P>A generator is completely described by six 32-bit words: its seed (so streams can be derived again), its 64-bit state, and its 64-bit increment. URL-safe base64 packs those 192 bits into exactly 32 characters.</P>
      <P>That fits in a link: put it in the hash, and anyone opening it carries on drawing *exactly* where you left off. It is called `toJSON` so `JSON.stringify` finds it wherever a generator sits inside something larger.</P>
    </SlideFrame>
  )
}

