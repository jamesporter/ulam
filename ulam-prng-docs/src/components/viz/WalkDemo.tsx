import { useState } from 'react'
import { RNG } from 'ulam-prng'
import { Demo, ParamSlider, SeedControl } from './controls'
import { useSeed } from './seed'

export function WalkDemo() {
  const { text, setText, seed, reroll } = useSeed('wander')
  const [steps, setSteps] = useState(300)
  const [stepSize, setStepSize] = useState(0.008)
  const [momentum, setMomentum] = useState(0.9)
  const [driftX, setDriftX] = useState(0)
  const [driftY, setDriftY] = useState(0)
  const [walkers, setWalkers] = useState(5)

  const rng = new RNG(seed)
  const paths = rng.split(walkers).map((r) =>
    r.walk({ steps, stepSize, momentum, drift: [driftX, driftY], start: [0.5, 0.5] }),
  )

  const drift = driftX || driftY ? `, drift: [${driftX}, ${driftY}]` : ''

  return (
    <Demo
      title={`walk({ steps: ${steps}, stepSize: ${stepSize}, momentum: ${momentum}${drift} })`}
      caption="Each walker is its own fork, starting from the centre. Momentum 0 is Brownian motion; near 1 the line turns slowly and keeps going."
      controls={
        <>
          <ParamSlider label="momentum" value={momentum} min={0} max={1} step={0.01} onChange={setMomentum} />
          <ParamSlider label="steps" value={steps} min={10} max={1500} step={10} onChange={setSteps} />
          <ParamSlider label="stepSize" value={stepSize} min={0.001} max={0.03} step={0.001} onChange={setStepSize} />
          <ParamSlider label="walkers (split)" value={walkers} min={1} max={12} step={1} onChange={setWalkers} />
          <ParamSlider label="drift x" value={driftX} min={-0.004} max={0.004} step={0.0002} onChange={setDriftX} />
          <ParamSlider label="drift y" value={driftY} min={-0.004} max={0.004} step={0.0002} onChange={setDriftY} />
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="p-5">
        <svg viewBox="0 0 1 1" className="mx-auto aspect-square w-full max-w-md rounded-xl border bg-card" role="img" aria-label="Random walks">
          <defs>
            <clipPath id="walk-clip">
              <rect width="1" height="1" />
            </clipPath>
          </defs>
          <g clipPath="url(#walk-clip)">
            {paths.map((p, i) => (
              <path
                key={i}
                d={p.map(([x, y], j) => `${j ? 'L' : 'M'}${x.toFixed(4)},${y.toFixed(4)}`).join('')}
                fill="none"
                style={{ stroke: `color-mix(in oklch, var(--brand) ${Math.round(100 - (i / Math.max(1, walkers - 1)) * 100)}%, var(--brand-2))` }}
                strokeWidth={0.004}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.9}
              />
            ))}
            {paths.map((p, i) => (
              <circle key={i} cx={p[p.length - 1][0]} cy={p[p.length - 1][1]} r={0.008} className="fill-foreground" />
            ))}
            <circle cx={0.5} cy={0.5} r={0.01} className="fill-card stroke-foreground" strokeWidth={0.003} />
          </g>
        </svg>
      </div>
    </Demo>
  )
}
