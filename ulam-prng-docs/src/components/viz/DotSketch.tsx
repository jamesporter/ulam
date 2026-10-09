import { RNG } from 'ulam-prng'
import { cn } from '@/lib/utils'

/** A tiny seeded picture: proof by eye that a seed determines what is drawn. */
export function DotSketch({ seed, className }: { seed: number | string; className?: string }) {
  const rng = new RNG(seed)
  const dots = Array.from({ length: 26 }, () => ({
    at: rng.gaussianVec2({ mean: [50, 50], sd: 20 }),
    r: rng.logNormal({ mu: 1.1, sigma: 0.5 }),
    t: rng.number(),
  }))
  return (
    <svg viewBox="0 0 100 100" className={cn('aspect-square w-full', className)} aria-hidden="true">
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.at[0]}
          cy={d.at[1]}
          r={Math.min(d.r, 14)}
          style={{ fill: `color-mix(in oklch, var(--brand) ${Math.round(d.t * 100)}%, var(--brand-2))` }}
          opacity={0.85}
        />
      ))}
    </svg>
  )
}
