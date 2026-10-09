import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { RNG } from 'ulam-prng'
import { Button } from '@/components/ui/button'
import { Demo, ParamSlider, SeedControl, ToggleControl } from './controls'
import { useSeed } from './seed'
import { Shape, type ShapeName } from './Shape'

export function DoProportionDemo() {
  const { text, setText, seed, reroll } = useSeed('highlight')
  const [p, setP] = useState(0.3)
  const rng = new RNG(seed)
  const cols = 24
  const rows = 8
  let hits = 0
  const cells = Array.from({ length: cols * rows }, () => {
    let lit = false
    if (rng.doProportion(p, () => (lit = true))) hits++
    return lit
  })

  return (
    <Demo
      title="doProportion(p, callback)"
      caption="Each dot runs the callback that lights it with probability p."
      controls={
        <>
          <ParamSlider label="p" value={p} min={0} max={1} step={0.01} onChange={setP} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      footer={
        <span className="font-mono">
          ran {hits} of {cells.length} times ({((hits / cells.length) * 100).toFixed(1)}%)
        </span>
      }
    >
      <svg viewBox={`0 0 ${cols} ${rows}`} className="block w-full p-5" role="img" aria-label="Highlighted dots">
        {cells.map((lit, i) => (
          <circle
            key={i}
            cx={(i % cols) + 0.5}
            cy={Math.floor(i / cols) + 0.5}
            r={lit ? 0.36 : 0.16}
            className={lit ? 'fill-brand' : 'fill-foreground/20'}
            style={{ transition: 'r 200ms' }}
          />
        ))}
      </svg>
    </Demo>
  )
}

export function ProportionatelyDemo() {
  const { text, setText, seed, reroll } = useSeed('mosaic')
  const [w, setW] = useState([5, 3, 2])
  const rng = new RNG(seed)
  const cols = 16
  const rows = 6
  let cells: { shape: ShapeName; size: number }[] = []
  let error: string | null = null
  try {
    cells = Array.from({ length: cols * rows }, () =>
      rng.proportionately<{ shape: ShapeName; size: number }>([
        [w[0], () => ({ shape: 'circle', size: rng.uniformRandomInt({ from: 5, to: 9 }) / 10 })],
        [w[1], () => ({ shape: 'square', size: 0.85 })],
        [w[2], () => ({ shape: 'triangle', size: rng.triangular({ min: 0.5, max: 1, mode: 0.9 }) })],
      ]),
    )
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <Demo
      title="proportionately([[weight, () => …], …])"
      caption="Each cell picks a case by weight and runs it. The circle and triangle cases draw their own sizes; only the chosen function runs."
      controls={
        <>
          {(['circle', 'square', 'triangle'] as const).map((s, i) => (
            <ParamSlider key={s} label={`weight of ${s}`} value={w[i]} min={0} max={10} step={0.5} onChange={(v) => setW((o) => o.map((x, j) => (j === i ? v : x)))} />
          ))}
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      {error ? (
        <p className="p-10 text-center font-mono text-sm text-destructive">Error: {error}</p>
      ) : (
        <svg viewBox={`0 0 ${cols} ${rows}`} className="block w-full p-5" role="img" aria-label="Mosaic of shapes">
          {cells.map((c, i) => (
            <Shape key={i} shape={c.shape} x={(i % cols) + 0.5} y={Math.floor(i / cols) + 0.5} size={c.size} />
          ))}
        </svg>
      )}
    </Demo>
  )
}

/** An iteration function of the shape withRandomOrder wraps: visits each tile of a grid. */
function forTiling({ n }: { n: number }, cb: (at: [number, number], i: number) => void) {
  let i = 0
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cb([x, y], i++)
}

export function RandomOrderDemo() {
  const { text, setText, seed, reroll } = useSeed('scales')
  const [random, setRandom] = useState(true)
  const [shown, setShown] = useState(Infinity)
  const n = 9

  const order: { at: [number, number]; i: number; t: number }[] = []
  const rng = new RNG(seed)
  const tint = rng.stream('tint')
  const visit = (at: [number, number], i: number) => order.push({ at, i, t: tint.number() })
  if (random) rng.withRandomOrder(forTiling, { n }, visit)
  else forTiling({ n }, visit)

  useEffect(() => {
    if (shown >= order.length) return
    const t = setTimeout(() => setShown((s) => s + 1), 28)
    return () => clearTimeout(t)
  }, [shown, order.length])

  return (
    <Demo
      title="withRandomOrder(forTiling, config, callback)"
      caption="Overlapping discs drawn in grid order stack the same way every time, like scales. Shuffle the order and the overlaps become irregular — the drawing order is doing visual work."
      controls={
        <>
          <ToggleControl label="random order" checked={random} onChange={setRandom} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
          <Button size="sm" variant="outline" onClick={() => setShown(0)} className="w-fit">
            <Play /> Replay drawing
          </Button>
        </>
      }
    >
      <svg viewBox={`-0.5 -0.5 ${n + 1} ${n + 1}`} className="mx-auto block w-full max-w-md p-5" role="img" aria-label="Overlapping discs">
        {order.slice(0, shown).map(({ at: [x, y], i, t }) => (
          <g key={i}>
            <circle
              cx={x + 0.5}
              cy={y + 0.5}
              r={0.85}
              style={{ fill: `color-mix(in oklch, var(--brand) ${Math.round(t * 100)}%, var(--brand-2))` }}
              className="stroke-card"
              strokeWidth={0.06}
            />
          </g>
        ))}
      </svg>
    </Demo>
  )
}
