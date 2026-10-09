import { useMemo, useState } from 'react'
import { RNG } from 'ulam-prng'
import { Demo, ParamSlider, SeedControl } from './controls'
import { useSeed } from './seed'

function Scatter({ points, title, r = 0.8, note }: { points: [number, number][]; title: string; r?: number; note?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold">{title}</span>
        <span className="font-mono text-xs text-muted-foreground">{note}</span>
      </div>
      <svg viewBox="-2 -2 104 104" className="aspect-square w-full rounded-xl border bg-card" role="img" aria-label={title}>
        {points.map(([x, y], i) => (
          <circle key={i} cx={x * 100} cy={y * 100} r={r} className="fill-brand" />
        ))}
      </svg>
    </div>
  )
}

export function PoissonDemo() {
  const { text, setText, seed, reroll } = useSeed('stipple')
  const [minDist, setMinDist] = useState(0.045)

  const { poisson, uniform } = useMemo(() => {
    const rng = new RNG(seed)
    const poisson = rng.stream('poisson').poissonDiskPoints({ minDist })
    const u = rng.stream('uniform')
    const uniform = Array.from({ length: poisson.length }, () => u.randomPoint())
    return { poisson, uniform }
  }, [seed, minDist])

  return (
    <Demo
      title="Uniform points against Poisson disk points"
      caption="The same number of points each side. Uniform placement clumps and leaves gaps; Poisson disk sampling keeps every pair at least minDist apart."
      controls={
        <>
          <ParamSlider label="minDist" value={minDist} min={0.025} max={0.12} step={0.005} onChange={setMinDist} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <Scatter points={uniform} title="randomPoint()" note={`${uniform.length} points`} r={minDist * 18} />
        <Scatter points={poisson} title="poissonDiskPoints()" note={`${poisson.length} points`} r={minDist * 18} />
      </div>
    </Demo>
  )
}

export function PerturbDemo() {
  const { text, setText, seed, reroll } = useSeed('wobble')
  const [magnitude, setMagnitude] = useState(0.1)
  const n = 9
  const rng = new RNG(seed)
  const grid: [number, number][] = []
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) grid.push([(i + 0.5) / n, (j + 0.5) / n])
  const moved = grid.map((at) => rng.perturb({ at, magnitude }))

  return (
    <Demo
      title="perturb({ at, magnitude })"
      caption={`Each grid point moves by up to ±${(magnitude / 2).toFixed(3)} on each axis: magnitude is the width of the window it can land in.`}
      controls={
        <>
          <ParamSlider label="magnitude" value={magnitude} min={0} max={0.3} step={0.005} onChange={setMagnitude} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="p-5">
        <svg viewBox="0 0 100 100" className="mx-auto aspect-square w-full max-w-sm rounded-xl border bg-card" role="img" aria-label="Perturbed grid">
          {grid.map(([x, y], i) => (
            <g key={i}>
              <rect
                x={(x - magnitude / 2) * 100}
                y={(y - magnitude / 2) * 100}
                width={magnitude * 100}
                height={magnitude * 100}
                className="fill-brand-2/10 stroke-brand-2/30"
                strokeWidth={0.2}
              />
              <line x1={x * 100} y1={y * 100} x2={moved[i][0] * 100} y2={moved[i][1] * 100} className="stroke-foreground/30" strokeWidth={0.3} />
              <circle cx={moved[i][0] * 100} cy={moved[i][1] * 100} r={1.3} className="fill-brand" />
            </g>
          ))}
        </svg>
      </div>
    </Demo>
  )
}
