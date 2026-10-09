import { History, Plus, Save } from 'lucide-react'
import { useRef, useState } from 'react'
import { hashSeed, RNG, type RNGState } from 'ulam-prng'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Demo, SeedControl } from './controls'
import { seedLiteral, useSeed } from './seed'
import { DotSketch } from './DotSketch'

export function SeedDemo() {
  const { text, setText, seed, reroll } = useSeed('sunflower')
  const rng = new RNG(seed)
  const draws = Array.from({ length: 6 }, () => rng.number())
  const words = typeof seed === 'string' ? hashSeed(seed) : ([0, seed >>> 0] as const)

  return (
    <Demo
      title="One seed, one sequence"
      caption="Type anything. The same seed always gives the same numbers, and so the same picture."
      controls={<SeedControl text={text} setText={setText} reroll={reroll} className="sm:col-span-2" />}
    >
      <div className="grid items-center gap-6 p-5 sm:grid-cols-[180px_1fr]">
        <DotSketch seed={seed} className="mx-auto max-w-44 border bg-card" />
        <div className="space-y-3 font-mono text-sm">
          <div className="text-muted-foreground">
            const rng = new RNG(<span className="text-brand">{seedLiteral(seed)}</span>)
          </div>
          <div className="text-xs text-muted-foreground">
            seed words{' '}
            <span className="text-brand-2">
              [{words[0]}, {words[1]}]
            </span>
            {typeof seed === 'number' && <span> (a single number is the low word)</span>}
          </div>
          <ol className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {draws.map((d, i) => (
              <li key={i} className="flex justify-between gap-2 rounded bg-muted/60 px-2 py-1">
                <span className="text-muted-foreground">rng.number()</span>
                <span className="tabular-nums">{d.toFixed(6)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Demo>
  )
}

export function NeighboursDemo() {
  const [a, setA] = useState('tree')
  const [b, setB] = useState('tres')

  return (
    <Demo title="Near neighbours, unrelated seeds" caption="Strings a character apart hash to completely different seeds.">
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {[
          [a, setA],
          [b, setB],
        ].map(([value, set], i) => (
          <div key={i} className="space-y-3">
            <Input value={value as string} onChange={(e) => (set as (s: string) => void)(e.target.value)} className="font-mono" aria-label={`Seed ${i + 1}`} />
            <DotSketch seed={value as string} className="border bg-card" />
            <p className="text-center font-mono text-xs text-muted-foreground">
              hashSeed → [{hashSeed(value as string).join(', ')}]
            </p>
          </div>
        ))}
      </div>
    </Demo>
  )
}

export function StateDemo() {
  const rng = useRef(new RNG(42))
  const [log, setLog] = useState<{ kind: 'draw' | 'save' | 'restore'; text: string }[]>([])
  const [saved, setSaved] = useState<RNGState | null>(null)

  const draw = () => setLog((l) => [...l, { kind: 'draw', text: rng.current.number().toFixed(6) }])
  const save = () => {
    const s = rng.current.getState()
    setSaved(s)
    setLog((l) => [...l, { kind: 'save', text: 'getState()' }])
  }
  const restore = () => {
    if (!saved) return
    rng.current.setState(saved)
    setLog((l) => [...l, { kind: 'restore', text: 'setState(saved)' }])
  }
  const reset = () => {
    rng.current = new RNG(42)
    setSaved(null)
    setLog([])
  }

  return (
    <Demo
      title="Rewinding with getState and setState"
      caption="Draw a few, save, draw some more, then restore: the numbers after the restore repeat exactly."
      footer={saved && <span className="font-mono">saved = [{saved.join(', ')}]</span>}
    >
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={draw}>
            <Plus /> rng.number()
          </Button>
          <Button size="sm" variant="outline" onClick={save}>
            <Save /> Save state
          </Button>
          <Button size="sm" variant="outline" onClick={restore} disabled={!saved}>
            <History /> Restore
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} className="ml-auto">
            Reset
          </Button>
        </div>
        <div className="flex min-h-10 flex-wrap gap-1.5 font-mono text-xs">
          {log.length === 0 && <span className="text-muted-foreground">new RNG(42) — nothing drawn yet</span>}
          {log.map((e, i) =>
            e.kind === 'draw' ? (
              <span key={i} className="rounded bg-muted px-2 py-1 tabular-nums">
                {e.text}
              </span>
            ) : (
              <span key={i} className={e.kind === 'save' ? 'rounded bg-brand/15 px-2 py-1 text-brand' : 'rounded bg-brand-2/15 px-2 py-1 text-brand-2'}>
                {e.text}
              </span>
            ),
          )}
        </div>
      </div>
    </Demo>
  )
}
