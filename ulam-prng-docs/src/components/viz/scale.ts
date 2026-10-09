/** Round numbers to label an axis with, about `count` of them. */
export function niceTicks(lo: number, hi: number, count = 6): number[] {
  if (!(hi > lo)) return [lo]
  const raw = (hi - lo) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) ticks.push(Number(t.toFixed(10)))
  return ticks
}

export const plotSize = { width: 640, height: 280, left: 16, right: 16, top: 16, bottom: 30 }

export type Scale = (v: number) => number

export function linear(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  return (v) => r0 + (v - d0) * k
}
