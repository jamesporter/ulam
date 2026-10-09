import { useMemo, useState } from 'react'
import { RNG } from 'ulam-prng'
import { Bars } from './Bars'
import { Demo, ParamSlider, SeedControl, Segmented } from './controls'
import { useSeed } from './seed'

export function BitsDemo() {
  const { text, setText, seed, reroll } = useSeed(12345)
  const rng = new RNG(seed)
  const rows = Array.from({ length: 12 }, () => rng.next())

  return (
    <Demo
      title="rng.next(): 32 random bits at a time"
      caption="The raw PCG output, one row per call. Every other method is built from these."
      controls={<SeedControl text={text} setText={setText} reroll={reroll} className="sm:col-span-2" />}
    >
      <div className="overflow-x-auto p-5">
        <div className="mx-auto w-fit space-y-1 font-mono text-[11px]">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex gap-[2px]">
                {Array.from({ length: 32 }, (_, b) => {
                  const on = (r >>> (31 - b)) & 1
                  return <span key={b} className={on ? 'size-2.5 rounded-[2px] brand-gradient sm:size-3' : 'size-2.5 rounded-[2px] bg-muted sm:size-3'} />
                })}
              </div>
              <span className="w-20 text-right text-muted-foreground tabular-nums">0x{r.toString(16).padStart(8, '0')}</span>
              <span className="hidden w-24 text-right tabular-nums sm:inline">{r}</span>
            </div>
          ))}
        </div>
      </div>
    </Demo>
  )
}

const sizes = [
  { value: 200, label: '200' },
  { value: 5000, label: '5k' },
  { value: 100000, label: '100k' },
]

export function UniformDemo() {
  const { text, setText, seed, reroll } = useSeed('sunflower')
  const [n, setN] = useState(5000)
  const [mode, setMode] = useState<'number' | 'integer'>('number')
  const [max, setMax] = useState(6)

  const { values, expected, labels } = useMemo(() => {
    const rng = new RNG(seed)
    const bins = mode === 'number' ? 20 : max
    const counts = new Array<number>(bins).fill(0)
    for (let i = 0; i < n; i++) {
      const k = mode === 'number' ? Math.floor(rng.number() * bins) : rng.integer(max)
      counts[k]++
    }
    return {
      values: counts.map((c) => c / n),
      expected: counts.map(() => 1 / bins),
      labels: mode === 'number' ? counts.map((_, i) => (i / bins).toFixed(2)) : counts.map((_, i) => String(i)),
    }
  }, [seed, n, mode, max])

  return (
    <Demo
      title={mode === 'number' ? 'rng.number() in twenty bins' : `rng.integer(${max})`}
      caption="Uniform means every bin is equally likely. With few draws the bars are ragged; with many they settle onto the line."
      controls={
        <>
          <Segmented
            label="method"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'number', label: 'number()' },
              { value: 'integer', label: 'integer(max)' },
            ]}
          />
          <Segmented label="draws" value={n} options={sizes} onChange={setN} />
          {mode === 'integer' && <ParamSlider label="max" value={max} min={2} max={20} step={1} onChange={setMax} />}
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="p-2">
        <Bars values={values} expected={expected} labels={labels} label="Uniform draws" />
      </div>
    </Demo>
  )
}

export function AnglesDemo() {
  const { text, setText, seed, reroll } = useSeed('compass')
  const [n, setN] = useState(60)
  const rng = new RNG(seed)
  const angles = Array.from({ length: n }, () => rng.randomAngle())
  const signs = Array.from({ length: 32 }, () => rng.randomPolarity())

  return (
    <Demo
      title="randomAngle() and randomPolarity()"
      caption="Angles anywhere round the circle, and a stream of ±1."
      controls={
        <>
          <ParamSlider label="angles" value={n} min={1} max={300} step={1} onChange={setN} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="grid items-center gap-4 p-5 sm:grid-cols-[220px_1fr]">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="mx-auto w-full max-w-52" aria-label="Random angles" role="img">
          <circle r={1} className="fill-none stroke-foreground/15" strokeWidth={0.01} />
          {angles.map((a, i) => (
            <line key={i} x2={Math.cos(a)} y2={Math.sin(a)} className="stroke-brand" strokeWidth={0.012} opacity={0.6} />
          ))}
          {angles.map((a, i) => (
            <circle key={i} cx={Math.cos(a)} cy={Math.sin(a)} r={0.03} className="fill-brand-2" />
          ))}
        </svg>
        <div className="flex flex-wrap gap-1.5">
          {signs.map((s, i) => (
            <span
              key={i}
              className={
                s === 1
                  ? 'flex size-7 items-center justify-center rounded-md bg-brand/15 font-mono text-xs text-brand'
                  : 'flex size-7 items-center justify-center rounded-md bg-brand-2/15 font-mono text-xs text-brand-2'
              }
            >
              {s === 1 ? '+1' : '−1'}
            </span>
          ))}
        </div>
      </div>
    </Demo>
  )
}
