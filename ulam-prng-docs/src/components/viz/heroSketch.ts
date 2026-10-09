import { RNG } from 'ulam-prng'

/** The code the hero picture is drawn by, shown alongside it. */
export const heroCode = (seed: string) => `const rng = new RNG(${JSON.stringify(seed)})

const field = rng.stream("field").perlinNoise().fbm({ octaves: 3 })
const starts = rng.stream("layout").poissonDiskPoints({ minDist: 0.034 })
const style = rng.stream("style")

for (const [x, y] of starts) {
  const hue = style.beta({ alpha: 2, beta: 2 })
  const width = style.logNormal({ mu: 0.1, sigma: 0.45 })
  let [px, py] = [x, y]
  for (let i = 0; i < 36; i++) {
    const angle = field.at(px * 2.4, py * 2.4) * Math.PI * 2
    px += Math.cos(angle) * 0.006
    py += Math.sin(angle) * 0.006
    lineTo(px, py)
  }
}`

type Stroke = { path: [number, number][]; t: number; width: number }

export function strokesFor(seed: string): Stroke[] {
  const rng = new RNG(seed)
  const field = rng.stream('field').perlinNoise().fbm({ octaves: 3 })
  const starts = rng.stream('layout').poissonDiskPoints({ minDist: 0.034 })
  const style = rng.stream('style')
  return starts.map(([x, y]) => {
    const t = style.beta({ alpha: 2, beta: 2 })
    const width = style.logNormal({ mu: 0.1, sigma: 0.45 })
    let px = x
    let py = y
    const path: [number, number][] = [[px, py]]
    for (let i = 0; i < 36; i++) {
      const angle = field.at(px * 2.4, py * 2.4) * Math.PI * 2
      px += Math.cos(angle) * 0.006
      py += Math.sin(angle) * 0.006
      path.push([px, py])
    }
    return { path, t, width }
  })
}
