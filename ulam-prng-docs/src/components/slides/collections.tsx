import { Shuffle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RNG } from 'ulam-prng'
import { Button } from '@/components/ui/button'
import { ParamSlider, SeedControl, Segmented, ToggleControl } from '@/components/viz/controls'
import { useSeed, type Seed } from '@/components/viz/seed'
import { rampAt } from '@/components/viz/useColours'
import { fmt } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { BarsChart, Chart, linePath } from './charts'
import { ArtCanvas, Measure, P, SlideFrame, square, Stat, Stats, type Draw } from './kit'

const TAU = Math.PI * 2
const chartVars = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

// ---------------------------------------------------------------------------
// Shuffling

type ShuffleMethod = 'fisher-yates' | 'naive' | 'sort'

function shuffleWith(rng: RNG, items: number[], method: ShuffleMethod): number[] {
  const a = items.slice()
  if (method === 'fisher-yates') return rng.shuffle(a)
  if (method === 'sort') return a.sort(() => rng.number() - 0.5)
  // Swap each place with any place at all: n^n outcomes, which n! cannot divide evenly
  for (let i = 0; i < a.length; i++) {
    const j = rng.integer(a.length)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const methodNames: Record<ShuffleMethod, string> = {
  'fisher-yates': 'rng.shuffle(items)',
  naive: 'swap each with any',
  sort: 'sort(() => rng.number() − 0.5)',
}

const SHUFFLE_N = 8

export function ShuffleSlide() {
  const { text, setText, seed, reroll } = useSeed('cards')
  const [method, setMethod] = useState<ShuffleMethod>('naive')
  const [round, setRound] = useState(0)
  const n = SHUFFLE_N
  const matrix = useMemo(() => {
    const rng = new RNG(seed)
    const m = Array.from({ length: n }, () => new Array<number>(n).fill(0))
    const trials = 30000
    const base = Array.from({ length: n }, (_, i) => i)
    for (let t = 0; t < trials; t++) shuffleWith(rng, base, method).forEach((item, pos) => m[item][pos]++)
    return m.map((row) => row.map((c) => c / trials))
  }, [seed, method])
  const worst = Math.max(...matrix.flat().map((p) => Math.abs(p * n - 1)))

  const draw: Draw = (ctx, size, c) => {
    const rng = new RNG(seed).stream(`round ${round}`)
    const cards = 12
    const rows = 14
    const cw = (size.width - 40) / cards
    const ch = (size.height - 40) / rows
    for (let r = 0; r < rows; r++) {
      const order = shuffleWith(rng, Array.from({ length: cards }, (_, i) => i), method)
      order.forEach((item, pos) => {
        ctx.fillStyle = rampAt(c.ramp, item / (cards - 1))
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.roundRect(20 + pos * cw + 2, 20 + r * ch + 2, cw - 4, ch - 4, 4)
        ctx.fill()
      })
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Collections"
      title="Shuffling fairly: Fisher–Yates"
      visual={{ label: `Fourteen shuffles of twelve cards, by ${methodNames[method]}`, node: <ArtCanvas draw={draw} label="Rows of shuffled cards" /> }}
      graph={{
        label: 'How often card i ends up in place j',
        note: '30,000 shuffles of 8',
        node: (
          <Measure>
            {({ width, height }) => {
              const cell = Math.min((width - 90) / n, (height - 70) / n)
              const x0 = (width - cell * n) / 2 + 20
              const y0 = (height - cell * n) / 2
              return (
                <svg width={width} height={height} role="img" aria-label="Position frequency matrix">
                  {matrix.map((row, i) =>
                    row.map((p, j) => {
                      const dev = Math.max(-1, Math.min(1, (p * n - 1) / 0.35))
                      const fill = dev >= 0 ? `color-mix(in oklch, var(--brand) ${Math.round(dev * 100)}%, var(--card))` : `color-mix(in oklch, var(--brand-2) ${Math.round(-dev * 100)}%, var(--card))`
                      return (
                        <g key={`${i}-${j}`}>
                          <rect x={x0 + j * cell + 1} y={y0 + i * cell + 1} width={cell - 2} height={cell - 2} rx={3} style={{ fill }} className="stroke-foreground/10" />
                          {cell > 34 && (
                            <text x={x0 + (j + 0.5) * cell} y={y0 + (i + 0.5) * cell} dy="0.35em" textAnchor="middle" className="fill-foreground font-mono text-[10px]">
                              {(p * 100).toFixed(1)}
                            </text>
                          )}
                        </g>
                      )
                    }),
                  )}
                  <text x={x0 - 10} y={y0 + (cell * n) / 2} textAnchor="middle" transform={`rotate(-90 ${x0 - 10} ${y0 + (cell * n) / 2})`} className="fill-muted-foreground text-[11px]">
                    card
                  </text>
                  <text x={x0 + (cell * n) / 2} y={y0 + cell * n + 18} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                    place it ends up in — % of shuffles; fair is {(100 / n).toFixed(1)}%
                  </text>
                </svg>
              )
            }}
          </Measure>
        ),
      }}
      controls={
        <>
          <Segmented
            label="method"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'naive', label: 'swap with any' },
              { value: 'sort', label: 'sort by random' },
              { value: 'fisher-yates', label: 'rng.shuffle' },
            ]}
          />
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={() => setRound((r) => r + 1)}>
              <Shuffle /> Shuffle again
            </Button>
          </div>
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.shuffle(items)   // in place
rng.shuffled(items)  // a copy
// for i from n−1 down: swap a[i] with a[integer(i + 1)]`}
    >
      <P>Fisher–Yates walks the array from the end, swapping each place with a uniformly chosen place *at or before it*. That makes exactly n! equally likely sequences of choices, one for each ordering.</P>
      <P>Two popular shortcuts are biased. Swapping every place with *any* place makes nⁿ outcomes, which n! does not divide evenly; sorting with a random comparator depends on the sort algorithm and is much worse. In the matrix, pink cells are too common, orange too rare.</P>
      <Stats>
        <Stat label="worst cell, off fair by" value={`${(worst * 100).toFixed(0)}%`} />
      </Stats>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Sampling, with and without replacement

const marbles = Array.from({ length: 24 }, (_, i) => i)

export function SamplingSlide() {
  const { text, setText, seed, reroll } = useSeed('marbles')
  const [k, setK] = useState(16)
  const [replace, setReplace] = useState(true)
  const n = marbles.length
  const picks = useMemo(() => {
    const rng = new RNG(seed)
    return replace ? rng.samples(k, marbles) : rng.samplesWithoutReplacement(Math.min(k, n), marbles.slice())
  }, [seed, k, replace])
  const counts = new Array<number>(n).fill(0)
  for (const p of picks) counts[p]++
  const distinct = counts.filter(Boolean).length

  const simulated = useMemo(() => {
    const rng = new RNG(seed).stream('simulation')
    return Array.from({ length: 49 }, (_, kk) => {
      let total = 0
      for (let t = 0; t < 200; t++) total += new Set(rng.samples(kk, marbles)).size
      return [kk, total / 200] as [number, number]
    })
  }, [seed])

  const draw: Draw = (ctx, size, c) => {
    const cols = 6
    const rows = n / cols
    const cell = Math.min((size.width - 40) / cols, (size.height - 40) / rows)
    const x0 = (size.width - cell * cols) / 2
    const y0 = (size.height - cell * rows) / 2
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i % cols) * cell + cell / 2
      const cy = y0 + Math.floor(i / cols) * cell + cell / 2
      const r = cell * 0.36
      const colour = rampAt(c.ramp, i / (n - 1))
      ctx.globalAlpha = counts[i] ? 0.95 : 0.15
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, TAU)
      ctx.fill()
      if (counts[i] > 1) {
        ctx.globalAlpha = 1
        ctx.fillStyle = c.fg
        ctx.beginPath()
        ctx.arc(cx + r * 0.75, cy - r * 0.75, r * 0.38, 0, TAU)
        ctx.fill()
        ctx.fillStyle = c.bg
        ctx.font = `${Math.round(r * 0.45)}px "JetBrains Mono Variable", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`×${counts[i]}`, cx + r * 0.75, cy - r * 0.75)
        ctx.textBaseline = 'alphabetic'
      }
    }
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Collections"
      title="Sampling, with and without replacement"
      visual={{ label: replace ? `rng.samples(${k}, marbles)` : `rng.samplesWithoutReplacement(${Math.min(k, n)}, marbles)`, note: `${distinct} different of ${n}`, node: <ArtCanvas draw={draw} label="Marbles, the drawn ones lit" /> }}
      graph={{
        label: 'Different marbles seen after k draws',
        node: (
          <Chart
            x={[0, 48]}
            y={[0, n]}
            label="Distinct items against draws"
            xLabel="draws, k"
            keyItems={[
              { label: 'with replacement, simulated', className: 'bg-brand', line: true },
              { label: 'n(1 − (1 − 1/n)ᵏ)', className: 'bg-brand-2', line: true },
              { label: 'without', className: 'bg-foreground/50', line: true },
            ]}
          >
            {({ x, y }) => (
              <>
                <path d={linePath([[0, 0], [n, n], [48, n]], x, y)} className="fill-none stroke-foreground/50" strokeDasharray="5 4" strokeWidth={2} />
                <path d={linePath(Array.from({ length: 49 }, (_, kk) => [kk, n * (1 - (1 - 1 / n) ** kk)]), x, y)} className="fill-none stroke-brand-2" strokeWidth={3} />
                <path d={linePath(simulated, x, y)} className="fill-none stroke-brand" strokeWidth={2} />
                <circle cx={x(k)} cy={y(distinct)} r={6} className="fill-brand stroke-card" strokeWidth={2} />
              </>
            )}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="draws, k" value={k} min={1} max={48} step={1} onChange={setK} />
          <ToggleControl label="with replacement" checked={replace} onChange={setReplace} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.sample(items)                     // one
rng.samples(5, items)                 // five, repeats allowed
rng.samplesWithoutReplacement(5, bag) // five distinct, taken out of bag`}
    >
      <P>`sample` and `samples` put each marble back before the next draw, so repeats are allowed — and they come sooner than intuition says: by the birthday paradox, a repeat is more likely than not after only about `√n` draws.</P>
      <P>The without-replacement methods take what they draw *out of the array you pass*, so the array itself is the record of what is left, the way `shuffle` works in place. Ask for more than is there and they throw.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Weighted sampling and the alias method

/** Vose's alias table, built as the library builds it, so it can be drawn. */
function aliasTable(weights: number[]) {
  const n = weights.length
  const total = weights.reduce((a, b) => a + b, 0)
  const probability = new Array<number>(n).fill(1)
  const alias = Array.from({ length: n }, (_, i) => i)
  const scaled = weights.map((w) => (w * n) / total)
  const small: number[] = []
  const large: number[] = []
  for (let i = n - 1; i >= 0; i--) (scaled[i] < 1 ? small : large).push(i)
  while (small.length && large.length) {
    const s = small.pop()!
    const l = large.pop()!
    probability[s] = scaled[s]
    alias[s] = l
    scaled[l] = scaled[l] + scaled[s] - 1
    ;(scaled[l] < 1 ? small : large).push(l)
  }
  return { probability, alias }
}

export function WeightedSlide() {
  const { text, setText, seed, reroll } = useSeed('alias')
  const [w, setW] = useState([5, 3, 1.5, 0.5, 2])
  const total = w.reduce((a, b) => a + b, 0)
  const names = ['ink', 'rust', 'gold', 'plum', 'ash']
  const ok = total > 0

  const { table, darts, freq } = useMemo(() => {
    if (!ok) return { table: undefined, darts: [], freq: w.map(() => 0) }
    const cases = w.map((weight, i) => [weight, i] as [number, number])
    const sampler = new RNG(seed).weightedSampler(cases)
    const freq = new Array<number>(w.length).fill(0)
    for (let i = 0; i < 20000; i++) {
      // Not freq[sampler()]++, which the React compiler turns into two calls
      const v = sampler()
      freq[v] += 1
    }
    // The sampler draws one number() per call: replay those on a twin
    const twin = new RNG(seed)
    const darts = Array.from({ length: 400 }, () => twin.number() * w.length)
    return { table: aliasTable(w), darts, freq: freq.map((f) => f / 20000) }
  }, [seed, w, ok])

  return (
    <SlideFrame
      kicker="Collections"
      title="Weighted choices in constant time: the alias method"
      visual={{
        label: 'The alias table, with 400 draws landing in it',
        note: 'column = ⌊u·n⌋, height = the fraction left over',
        node: (
          <Measure>
            {({ width, height }) => {
              if (!table) return null
              const n = w.length
              const colW = Math.min((width - 60) / n, 120)
              const x0 = (width - colW * n) / 2
              const top = 30
              const h = height - 80
              return (
                <svg width={width} height={height} role="img" aria-label="Alias table">
                  {Array.from({ length: n }, (_, i) => {
                    const p = table.probability[i]
                    return (
                      <g key={i}>
                        <rect x={x0 + i * colW + 4} y={top + (1 - p) * h} width={colW - 8} height={p * h} rx={3} style={{ fill: chartVars[i], opacity: 0.75 }} />
                        {p < 1 && <rect x={x0 + i * colW + 4} y={top} width={colW - 8} height={(1 - p) * h} rx={3} style={{ fill: chartVars[table.alias[i]], opacity: 0.4 }} strokeDasharray="4 3" className="stroke-foreground/30" />}
                        <text x={x0 + (i + 0.5) * colW} y={top + h + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
                          {names[i]}
                        </text>
                        {p < 1 && (
                          <text x={x0 + (i + 0.5) * colW} y={top + ((1 - p) * h) / 2} dy="0.35em" textAnchor="middle" className="fill-foreground font-mono text-[10px]">
                            → {names[table.alias[i]]}
                          </text>
                        )}
                      </g>
                    )
                  })}
                  {darts.map((u, i) => {
                    const col = Math.min(w.length - 1, Math.floor(u))
                    const frac = u - col
                    const hit = frac < table.probability[col] ? col : table.alias[col]
                    return <circle key={i} cx={x0 + col * colW + 10 + ((i * 37) % 100) / 100 * (colW - 20)} cy={top + (1 - frac) * h} r={2.4} style={{ fill: chartVars[hit] }} className="stroke-card" strokeWidth={0.8} />
                  })}
                </svg>
              )
            }}
          </Measure>
        ),
      }}
      graph={{
        label: '20,000 draws from weightedSampler',
        node: ok ? (
          <BarsChart labels={names} observed={freq} expected={w.map((x) => x / total)} colours={chartVars} expectedLabel="weight / total" label="Frequency of each value" />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center font-mono text-sm text-destructive">Error: Must be positive total</p>
        ),
      }}
      controls={
        <>
          {w.map((x, i) => (
            <ParamSlider key={i} label={`weight of ${names[i]}`} value={x} min={0} max={10} step={0.5} onChange={(v) => setW((ws) => ws.map((y, j) => (j === i ? v : y)))} />
          ))}
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.weightedSample([[5, "ink"], [3, "rust"]]) // walks the weights
const colour = rng.weightedSampler(cases)     // builds a table once
colour() // then one number() and a lookup`}
    >
      <P>`weightedSample` and `categorical` walk the list of weights on every draw: fine for a handful, slow for thousands of draws from hundreds of options.</P>
      <P>`weightedSampler` builds **Vose’s alias table** once. Every column is filled to exactly one unit — part with its own value, topped up from one larger “alias” — so a single uniform number picks a column with its whole part and a value with its fraction. Constant time however many values there are.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Counts without replacement

export function CountsSlide() {
  const { text, setText, seed, reroll } = useSeed('mosaic')
  const [counts, setCounts] = useState([40, 30, 20, 10])
  const total = counts.reduce((a, b) => a + b, 0)
  const names = ['circle', 'square', 'triangle', 'diamond']

  const { weighted, exact } = useMemo(() => {
    const rng = new RNG(seed)
    const cases = counts.map((cnt, i) => [cnt, i] as [number, number])
    const weighted = total ? Array.from({ length: total }, () => rng.weightedSample(cases)) : []
    const bag = cases.map(([cnt, v]) => [cnt, v] as [number, number])
    const exact = total ? rng.samplesWithoutReplacementWithCounts(total, bag) : []
    return { weighted, exact }
  }, [seed, counts, total])

  const tally = (xs: number[]) => counts.map((_, i) => xs.filter((x) => x === i).length)

  const draw: Draw = (ctx, size, c) => {
    const half = { width: size.width, height: (size.height - 40) / 2 }
    ;[weighted, exact].forEach((items, row) => {
      const cols = Math.ceil(Math.sqrt((items.length * half.width) / half.height)) || 1
      const rows = Math.ceil(items.length / cols) || 1
      const cell = Math.min((half.width - 30) / cols, (half.height - 30) / rows)
      const x0 = (half.width - cell * cols) / 2
      const y0 = 30 + row * (half.height + 20) + (half.height - 30 - cell * rows) / 2
      ctx.fillStyle = c.muted
      ctx.font = '11px "JetBrains Mono Variable", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(row ? 'samplesWithoutReplacementWithCounts(total, bag)' : 'weightedSample(cases), total times', 16, 20 + row * (half.height + 20))
      items.forEach((k, i) => {
        const cx = x0 + (i % cols) * cell + cell / 2
        const cy = y0 + Math.floor(i / cols) * cell + cell / 2
        const r = cell * 0.38
        ctx.fillStyle = c.chart[k]
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        if (k === 0) ctx.arc(cx, cy, r, 0, TAU)
        else if (k === 1) ctx.rect(cx - r, cy - r, r * 2, r * 2)
        else if (k === 2) {
          ctx.moveTo(cx, cy - r)
          ctx.lineTo(cx + r, cy + r * 0.8)
          ctx.lineTo(cx - r, cy + r * 0.8)
        } else {
          ctx.moveTo(cx, cy - r)
          ctx.lineTo(cx + r, cy)
          ctx.lineTo(cx, cy + r)
          ctx.lineTo(cx - r, cy)
        }
        ctx.fill()
      })
    })
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Collections"
      title="Exactly so many of each: drawing from counts"
      visual={{ label: `${total} tiles, two ways`, node: <ArtCanvas draw={draw} label="Two mosaics of shapes" /> }}
      graph={{
        label: 'How many of each shape came out',
        node: (
          <BarsChart
            labels={names}
            observed={tally(weighted)}
            expected={tally(exact)}
            colours={chartVars}
            observedLabel="weightedSample"
            expectedLabel="WithCounts: exactly the counts"
            label="Counts of each shape, two methods"
          />
        ),
      }}
      controls={
        <>
          {counts.map((x, i) => (
            <ParamSlider key={i} label={`${names[i]}s`} value={x} min={0} max={60} step={1} onChange={(v) => setCounts((cs) => cs.map((y, j) => (j === i ? v : y)))} />
          ))}
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`const bag = [[40, "circle"], [30, "square"], [20, "triangle"]]
rng.sampleWithoutReplacementWithCounts(bag)     // one; bag is decremented
rng.samplesWithoutReplacementWithCounts(90, bag) // all of them, shuffled`}
    >
      <P>Weights give proportions *on average*: ask `weightedSample` for a hundred tiles from weights 40:30:20:10 and you might get 37 circles, or 44. Sometimes you need exactly 40 — a palette budget, a deck of cards, a fixed set of pieces.</P>
      <P>The `WithCounts` methods treat the pairs as a bag of how many of each thing there is, and decrement the count they drew from. Draw everything and you get exactly the counts, in a random order.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Reservoir sampling

export function ReservoirSlide() {
  const { text, setText, seed, reroll } = useSeed('stream')
  const [k, setK] = useState(8)
  const [total, setTotal] = useState(120)
  const kept = useMemo(() => {
    function* items() {
      for (let i = 0; i < total; i++) yield i
    }
    return new RNG(seed).reservoirSample(k, items())
  }, [seed, k, total])
  const inclusion = useMemo(() => {
    const rng = new RNG(seed).stream('trials')
    const hits = new Array<number>(total).fill(0)
    const trials = 3000
    for (let t = 0; t < trials; t++) {
      function* items() {
        for (let i = 0; i < total; i++) yield i
      }
      for (const i of rng.reservoirSample(k, items())) hits[i]++
    }
    return hits.map((h) => h / trials)
  }, [seed, k, total])
  const keptSet = new Set(kept)

  return (
    <SlideFrame
      kicker="Collections"
      title={<>One pass, any length: <code className="font-mono text-[0.8em]">reservoirSample</code></>}
      visual={{
        label: `Items 0 to ${total - 1}, streamed past once`,
        note: `${k} kept`,
        node: (
          <Measure>
            {({ width, height }) => {
              const cols = Math.ceil(Math.sqrt((total * width) / height))
              const rows = Math.ceil(total / cols)
              const cell = Math.min((width - 30) / cols, (height - 30) / rows)
              const x0 = (width - cell * cols) / 2
              const y0 = (height - cell * rows) / 2
              return (
                <svg width={width} height={height} role="img" aria-label="Items, with the reservoir highlighted">
                  {Array.from({ length: total }, (_, i) => {
                    const on = keptSet.has(i)
                    return (
                      <g key={i}>
                        <rect
                          x={x0 + (i % cols) * cell + 1.5}
                          y={y0 + Math.floor(i / cols) * cell + 1.5}
                          width={cell - 3}
                          height={cell - 3}
                          rx={3}
                          className={on ? 'fill-brand' : 'fill-foreground/8'}
                          style={on ? undefined : { fill: `color-mix(in oklch, var(--brand-2) ${Math.round((i / total) * 35)}%, transparent)` }}
                        />
                        {cell > 22 && (
                          <text x={x0 + (i % cols) * cell + cell / 2} y={y0 + Math.floor(i / cols) * cell + cell / 2} dy="0.35em" textAnchor="middle" className={cn('font-mono text-[9px]', on ? 'fill-white' : 'fill-muted-foreground')}>
                            {i}
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
        label: 'How often each position is kept',
        note: '3,000 runs',
        node: (
          <Chart x={[0, total - 1]} y={[0, Math.min(1, (k / total) * 2.2)]} label="Inclusion probability by position" xLabel="position in the stream" yFormat={(t) => fmt(t, 3)} keyItems={[{ label: 'kept', className: 'bg-brand/70' }, { label: 'k / n', className: 'bg-brand-2', line: true }]}>
            {({ x, y, bottom }) => {
              const w = Math.max(1, x(1) - x(0) - 1)
              return (
                <>
                  {inclusion.map((p, i) => (
                    <rect key={i} x={x(i) - w / 2} width={w} y={y(p)} height={bottom - y(p)} className="fill-brand/60" />
                  ))}
                  <line x1={x(0)} x2={x(total - 1)} y1={y(k / total)} y2={y(k / total)} className="stroke-brand-2" strokeWidth={2.5} />
                </>
              )
            }}
          </Chart>
        ),
      }}
      controls={
        <>
          <ParamSlider label="k, kept" value={k} min={1} max={30} step={1} onChange={setK} />
          <ParamSlider label="items in the stream" value={total} min={20} max={300} step={5} onChange={setTotal} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.reservoirSample(10, readLines()) // any iterable
// keep the first k; then item i replaces a random slot
// with probability k / (i + 1)`}
    >
      <P>Sometimes you do not know how many things there are until you have seen them all — lines of a file, events, a generator function. Reservoir sampling (Algorithm R) keeps `k` of them in a single pass and constant memory.</P>
      <P>The first `k` fill the reservoir. Each later item `i` takes a random slot with probability `k/(i+1)`. The early items face more chances of being evicted, the late ones fewer chances to get in, and the two exactly balance: every position ends up kept with probability `k/n`.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Choosing what to do

export function ChoosingSlide() {
  const { text, setText, seed, reroll } = useSeed('motifs')
  const [w, setW] = useState([5, 3, 2, 1])
  const [p, setP] = useState(0.15)
  const names = ['circle', 'square', 'cross', 'nothing']
  const total = w.reduce((a, b) => a + b, 0)

  const { cells, shares, highlighted } = useMemo(() => {
    const rng = new RNG(seed)
    const n = 15
    const cells: { kind: number; glow: boolean }[] = []
    const tally = new Array<number>(4).fill(0)
    let highlighted = 0
    if (total > 0) {
      for (let i = 0; i < n * n; i++) {
        const kind = rng.proportionately(w.map((weight, k) => [weight, () => k] as [number, () => number]))
        tally[kind]++
        const glow = rng.doProportion(p, () => highlighted++)
        cells.push({ kind, glow })
      }
    }
    return { cells, shares: tally.map((t) => t / (n * n)), highlighted }
  }, [seed, w, p, total])

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 16)
    const n = 15
    const cell = s / n
    cells.forEach(({ kind, glow }, i) => {
      const cx = x + (i % n) * cell + cell / 2
      const cy = y + Math.floor(i / n) * cell + cell / 2
      const r = cell * 0.32
      if (glow) {
        ctx.fillStyle = c.brand2
        ctx.globalAlpha = 0.22
        ctx.fillRect(cx - cell / 2 + 1, cy - cell / 2 + 1, cell - 2, cell - 2)
      }
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = glow ? c.brand2 : c.brand
      ctx.fillStyle = glow ? c.brand2 : c.brand
      ctx.lineWidth = Math.max(2, cell * 0.09)
      ctx.lineCap = 'round'
      ctx.beginPath()
      if (kind === 0) {
        ctx.arc(cx, cy, r, 0, TAU)
        ctx.stroke()
      } else if (kind === 1) {
        ctx.fillRect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6)
      } else if (kind === 2) {
        ctx.moveTo(cx - r, cy - r)
        ctx.lineTo(cx + r, cy + r)
        ctx.moveTo(cx + r, cy - r)
        ctx.lineTo(cx - r, cy + r)
        ctx.stroke()
      }
    })
    ctx.globalAlpha = 1
  }

  return (
    <SlideFrame
      kicker="Choosing what to do"
      title={<><code className="font-mono text-[0.8em]">proportionately</code> and <code className="font-mono text-[0.8em]">doProportion</code></>}
      visual={{ label: 'Each cell picks a motif, and sometimes lights up', note: `${highlighted} lit`, node: <ArtCanvas draw={draw} label="A grid of chosen motifs" /> }}
      graph={{
        label: 'Share of cells given each motif',
        node: total > 0 ? <BarsChart labels={names} observed={shares} expected={w.map((x) => x / total)} expectedLabel="weight / total" label="Share of each motif" /> : <p className="absolute inset-0 flex items-center justify-center font-mono text-sm text-destructive">Error: Must be positive total</p>,
      }}
      controls={
        <>
          {w.map((x, i) => (
            <ParamSlider key={i} label={`weight: ${names[i]}`} value={x} min={0} max={10} step={0.5} onChange={(v) => setW((ws) => ws.map((y, j) => (j === i ? v : y)))} />
          ))}
          <ParamSlider label="doProportion p" value={p} min={0} max={1} step={0.01} onChange={setP} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.proportionately([
  [5, () => drawCircle()],
  [3, () => drawSquare()],
  [1, () => {}],          // sometimes nothing
])
rng.doProportion(0.15, () => highlight())`}
    >
      <P>A sketch is a long series of small decisions. `proportionately` takes weighted *functions* and runs one of them, chosen in proportion to its weight; the weights are relative, so they need not sum to anything in particular.</P>
      <P>`doProportion(p, fn)` is the smallest decision of all: run `fn` a fraction `p` of the time, and say whether it ran. Both cost one draw, so they compose with everything else reproducibly.</P>
    </SlideFrame>
  )
}

// ---------------------------------------------------------------------------
// Random order

function forGrid(config: { n: number }, cb: (i: number, j: number) => void) {
  for (let j = 0; j < config.n; j++) for (let i = 0; i < config.n; i++) cb(i, j)
}

function drawOrder(seed: Seed, shuffled: boolean, n: number): [number, number][] {
  const order: [number, number][] = []
  if (shuffled) new RNG(seed).withRandomOrder(forGrid, { n }, (i, j) => order.push([i, j]))
  else forGrid({ n }, (i, j) => order.push([i, j]))
  return order
}

export function RandomOrderSlide() {
  const { text, setText, seed, reroll } = useSeed('weave')
  const [shuffled, setShuffled] = useState(true)
  const [overlap, setOverlap] = useState(1.6)
  const n = 9
  const order = useMemo(() => drawOrder(seed, shuffled, n), [seed, shuffled])

  const draw: Draw = (ctx, size, c) => {
    const { s, x, y } = square(size, 30)
    const cell = s / n
    order.forEach(([i, j]) => {
      const cx = x + (i + 0.5) * cell
      const cy = y + (j + 0.5) * cell
      const r = (cell / 2) * overlap
      ctx.fillStyle = rampAt(c.ramp, (i + j) / (2 * n - 2))
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = c.card
      ctx.lineWidth = 3
      ctx.stroke()
    })
  }

  const rank = new Map(order.map(([i, j], k) => [`${i},${j}`, k]))
  return (
    <SlideFrame
      kicker="Choosing what to do"
      title={<>When order matters: <code className="font-mono text-[0.8em]">withRandomOrder</code></>}
      visual={{ label: shuffled ? 'Drawn in a random order' : 'Drawn row by row', node: <ArtCanvas draw={draw} label="Overlapping discs" /> }}
      graph={{
        label: 'The order each cell was drawn in',
        node: (
          <Measure>
            {({ width, height }) => {
              const cell = Math.min((width - 40) / n, (height - 40) / n)
              const x0 = (width - cell * n) / 2
              const y0 = (height - cell * n) / 2
              return (
                <svg width={width} height={height} role="img" aria-label="Draw order of each cell">
                  {Array.from({ length: n * n }, (_, idx) => {
                    const i = idx % n
                    const j = Math.floor(idx / n)
                    const k = rank.get(`${i},${j}`) ?? 0
                    return (
                      <g key={idx}>
                        <rect x={x0 + i * cell + 2} y={y0 + j * cell + 2} width={cell - 4} height={cell - 4} rx={4} style={{ fill: `color-mix(in oklch, var(--brand) ${Math.round((k / (n * n - 1)) * 100)}%, var(--muted))` }} />
                        <text x={x0 + (i + 0.5) * cell} y={y0 + (j + 0.5) * cell} dy="0.35em" textAnchor="middle" className="fill-foreground font-mono text-[11px]">
                          {k + 1}
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
      controls={
        <>
          <ToggleControl label="withRandomOrder" checked={shuffled} onChange={setShuffled} />
          <ParamSlider label="overlap" value={overlap} min={0.8} max={2.6} step={0.05} onChange={setOverlap} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      code={`rng.withRandomOrder(forTiling, { n: 10 }, ([x, y], [w, h]) => {
  drawTile(x, y, w, h)
})`}
    >
      <P>When shapes overlap, the order they are drawn in *is* the picture. Draw a grid row by row and every disc sits on the one before: a staircase of shadows, unmistakably mechanical.</P>
      <P>{'`withRandomOrder` wraps any iteration function of the shape `(config, callback) => void`: it collects every call, shuffles them with Fisher–Yates, then replays them. The layering becomes a weave, without touching the iteration code.'}</P>
    </SlideFrame>
  )
}
