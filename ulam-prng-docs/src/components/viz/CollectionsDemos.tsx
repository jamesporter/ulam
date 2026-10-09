import { Plus, RotateCcw, Shuffle as ShuffleIcon } from 'lucide-react'
import { useState } from 'react'
import { RNG } from 'ulam-prng'
import { Button } from '@/components/ui/button'
import { Bars } from './Bars'
import { Demo, ParamSlider, SeedControl } from './controls'
import { useSeed } from './seed'
import { Shape, ShapeIcon, type ShapeName } from './Shape'

const tiles = Array.from({ length: 12 }, (_, i) => i + 1)

export function ShuffleDemo() {
  const { text, setText, seed, reroll } = useSeed('deck')
  const [times, setTimes] = useState(1)

  const rng = new RNG(seed)
  let order = [...tiles]
  for (let i = 0; i < times; i++) order = rng.shuffled(order)
  const position = new Map(order.map((v, i) => [v, i]))

  return (
    <Demo
      title="shuffled(items)"
      caption="A Fisher–Yates shuffle: every ordering equally likely. Each press shuffles the last result again, from the same seeded generator."
      controls={
        <>
          <SeedControl text={text} setText={setText} reroll={reroll} />
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={() => setTimes((t) => t + 1)}>
              <ShuffleIcon /> Shuffle again
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setTimes(0)}>
              <RotateCcw /> Unshuffle
            </Button>
          </div>
        </>
      }
      footer={<span className="font-mono">shuffles: {times} · [{order.join(', ')}]</span>}
    >
      <div className="p-5">
        <div className="relative mx-auto h-12 max-w-xl">
          {tiles.map((v) => (
            <div
              key={v}
              className="absolute top-0 flex h-12 items-center justify-center rounded-lg font-mono text-sm font-semibold text-white shadow-sm transition-[left] duration-500 ease-out"
              style={{
                width: `calc(${100 / tiles.length}% - 4px)`,
                left: `calc(${(position.get(v)! * 100) / tiles.length}% + 2px)`,
                background: `color-mix(in oklch, var(--brand) ${Math.round(100 - ((v - 1) / (tiles.length - 1)) * 100)}%, var(--brand-2))`,
              }}
            >
              {v}
            </div>
          ))}
        </div>
      </div>
    </Demo>
  )
}

const shapes: ShapeName[] = ['circle', 'square', 'triangle']

export function WeightedDemo() {
  const { text, setText, seed, reroll } = useSeed('tally')
  const [w, setW] = useState([5, 3, 2])
  const n = 400

  const rng = new RNG(seed)
  const cases = shapes.map((s, i) => [w[i], s] as [number, ShapeName])
  let drawn: ShapeName[] = []
  let error: string | null = null
  try {
    drawn = Array.from({ length: n }, () => rng.weightedSample(cases))
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }
  const total = w.reduce((a, b) => a + b, 0)
  const counts = shapes.map((s) => drawn.filter((d) => d === s).length / n)

  return (
    <Demo
      title="weightedSample([[weight, value], …])"
      caption={`${n} draws. Weights are relative: only their proportions matter.`}
      controls={
        <>
          {shapes.map((s, i) => (
            <ParamSlider
              key={s}
              label={`weight of ${s}`}
              value={w[i]}
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => setW((old) => old.map((o, j) => (j === i ? v : o)))}
            />
          ))}
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      {error ? (
        <p className="p-10 text-center font-mono text-sm text-destructive">Error: {error}</p>
      ) : (
        <div className="grid items-center gap-4 p-5 sm:grid-cols-[1fr_240px]">
          <svg viewBox="0 0 40 10" className="w-full" role="img" aria-label="Weighted samples">
            {drawn.map((s, i) => (
              <Shape key={i} shape={s} x={(i % 40) + 0.5} y={Math.floor(i / 40) + 0.5} size={0.8} />
            ))}
          </svg>
          <Bars
            values={counts}
            expected={w.map((x) => x / total)}
            labels={shapes}
            label="Weighted sample frequencies"
            width={260}
            height={200}
          />
        </div>
      )}
    </Demo>
  )
}

type Bag = [number, ShapeName][]
const startingBag = (): Bag => [
  [3, 'circle'],
  [2, 'square'],
  [1, 'triangle'],
]

export function BagDemo() {
  const { text, setText, seed, reroll } = useSeed('bag')
  const [pulls, setPulls] = useState(0)

  // Replay the pulls from scratch so the demo is a pure function of the seed
  const rng = new RNG(seed)
  const bag = startingBag()
  const drawn: ShapeName[] = []
  for (let i = 0; i < pulls; i++) drawn.push(rng.sampleWithoutReplacementWithCounts(bag))
  const left = bag.reduce((a, [c]) => a + c, 0)

  return (
    <Demo
      title="sampleWithoutReplacementWithCounts(bag)"
      caption="Three circles, two squares, one triangle. Every draw takes one out of the bag, so after six draws you have exactly what the counts described, in a random order."
      controls={
        <>
          <SeedControl text={text} setText={setText} reroll={reroll} />
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={() => setPulls((p) => p + 1)} disabled={left === 0}>
              <Plus /> Draw one
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPulls(6)} disabled={left === 0}>
              Draw the rest
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPulls(0)}>
              <RotateCcw /> Refill
            </Button>
          </div>
        </>
      }
      footer={
        <span className="font-mono">
          bag is now [{bag.map(([c, s]) => `[${c}, "${s}"]`).join(', ')}]
          {left === 0 && ' — the next draw would throw "Nothing left to sample"'}
        </span>
      }
    >
      <div className="grid gap-6 p-5 sm:grid-cols-[180px_1fr]">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">In the bag</p>
          <div className="space-y-1.5">
            {bag.map(([c, s]) => (
              <div key={s} className="flex items-center gap-2 font-mono text-sm">
                <ShapeIcon shape={s} />
                <span className="w-16">{s}</span>
                <span className="flex gap-1">
                  {Array.from({ length: c }, (_, i) => (
                    <span key={i} className="size-2 rounded-full bg-foreground/50" />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Drawn, in order</p>
          <div className="flex min-h-14 flex-wrap gap-2">
            {drawn.map((s, i) => (
              <svg key={i} viewBox="-0.6 -0.6 1.2 1.2" className="size-12 rounded-lg border bg-card animate-in zoom-in-50 fade-in" aria-label={s}>
                <Shape shape={s} />
              </svg>
            ))}
            {drawn.length === 0 && <span className="text-sm text-muted-foreground">Nothing yet</span>}
          </div>
        </div>
      </div>
    </Demo>
  )
}
