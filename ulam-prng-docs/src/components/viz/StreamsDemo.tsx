import { RNG } from 'ulam-prng'
import { useState } from 'react'
import { Demo, ParamSlider, SeedControl } from './controls'
import { useSeed } from './seed'

type Dot = { x: number; y: number; t: number; r: number }

/** Everything from one generator: layout first, then colour. */
function oneGenerator(seed: number | string, n: number): Dot[] {
  const rng = new RNG(seed)
  const at = Array.from({ length: n }, () => rng.randomPoint())
  return at.map(([x, y]) => ({ x, y, t: rng.number(), r: rng.uniformRandomInt({ from: 3, to: 7 }) }))
}

/** Layout and colour from their own named streams. */
function withStreams(seed: number | string, n: number): Dot[] {
  const rng = new RNG(seed)
  const layout = rng.stream('layout')
  const colour = rng.stream('colour')
  const at = Array.from({ length: n }, () => layout.randomPoint())
  return at.map(([x, y]) => ({ x, y, t: colour.number(), r: colour.uniformRandomInt({ from: 3, to: 7 }) }))
}

function Panel({ title, code, dots }: { title: string; code: string; dots: Dot[] }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <code className="font-mono text-[11px] text-muted-foreground">{code}</code>
      </div>
      <svg viewBox="0 0 100 100" className="aspect-square w-full border bg-card" aria-label={title} role="img">
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={6 + d.x * 88}
            cy={6 + d.y * 88}
            r={d.r}
            style={{ fill: `color-mix(in oklch, var(--brand) ${Math.round(d.t * 100)}%, var(--brand-2))`, transition: 'fill 250ms' }}
            opacity={0.9}
          />
        ))}
      </svg>
    </div>
  )
}

export function StreamsDemo() {
  const { text, setText, seed, reroll } = useSeed('sunflower')
  const [n, setN] = useState(12)

  return (
    <Demo
      title="Change one thing, keep the rest"
      caption="Drag the count. With one generator, every colour shifts because colours are drawn after however many positions there are. With streams, existing dots keep their colours."
      controls={
        <>
          <ParamSlider label="how many dots" value={n} min={3} max={40} step={1} onChange={setN} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <Panel title="One generator" code="rng" dots={oneGenerator(seed, n)} />
        <Panel title="Separate streams" code={'rng.stream("…")'} dots={withStreams(seed, n)} />
      </div>
    </Demo>
  )
}

export function ForkDemo() {
  const { text, setText, seed, reroll } = useSeed('meadow')
  const [appetite, setAppetite] = useState(3)

  const rng = new RNG(seed)
  const flowers = Array.from({ length: 5 }, (_, i) => {
    const child = rng.fork()
    // Each flower draws as many numbers as it likes; the parent never notices
    const petals = Array.from({ length: appetite + i }, () => child.gaussian({ sd: 0.35 }))
    return { petals, hue: child.number() }
  })
  const after = rng.number()

  return (
    <Demo
      title="Forks for subroutines"
      caption="Each flower gets rng.fork() and draws as many petals as it likes. The parent's next number is the same however many that is."
      controls={
        <>
          <ParamSlider label="petals per flower" value={appetite} min={1} max={9} step={1} onChange={setAppetite} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
      footer={
        <span className="font-mono">
          rng.number() after the flowers → <span className="text-brand">{after.toFixed(8)}</span> (try the slider: it never changes)
        </span>
      }
    >
      <div className="grid grid-cols-5 gap-2 p-5">
        {flowers.map((f, i) => (
          <svg key={i} viewBox="-1.2 -1.2 2.4 2.4" className="aspect-square w-full" aria-hidden="true">
            {f.petals.map((p, j) => {
              const a = (j / f.petals.length) * Math.PI * 2 + p
              return (
                <ellipse
                  key={j}
                  cx={Math.cos(a) * 0.55}
                  cy={Math.sin(a) * 0.55}
                  rx={0.42}
                  ry={0.16}
                  transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * 0.55} ${Math.sin(a) * 0.55})`}
                  style={{ fill: `color-mix(in oklch, var(--brand) ${Math.round(f.hue * 100)}%, var(--brand-2))` }}
                  opacity={0.75}
                />
              )
            })}
            <circle r={0.18} className="fill-foreground/80" />
          </svg>
        ))}
      </div>
    </Demo>
  )
}
