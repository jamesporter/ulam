import { useEffect, useMemo, useRef, useState } from 'react'
import { RNG, type NoiseField } from 'ulam-prng'
import { Demo, ParamSlider, SeedControl, Segmented, ToggleControl } from './controls'
import { useSeed } from './seed'
import { linear, plotSize } from './scale'
import { useColours, type Colours } from './useColours'

type Rgb = [number, number, number]

/** Any colour a canvas understands, as RGB bytes. */
function toRgb(colour: string): Rgb {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = colour
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

/** A 256 step colour map from the page background through pink to orange. */
function colourMap(colours: Colours): Uint8ClampedArray {
  const stops: Rgb[] = [toRgb(colours.bg), toRgb(colours.brand), toRgb(colours.brand2), toRgb(colours.fg)]
  const positions = [0, 0.5, 0.82, 1]
  const map = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let s = 0
    while (s < stops.length - 2 && t > positions[s + 1]) s++
    const u = (t - positions[s]) / (positions[s + 1] - positions[s])
    for (let k = 0; k < 3; k++) map[i * 3 + k] = stops[s][k] + (stops[s + 1][k] - stops[s][k]) * u
  }
  return map
}

type Kind = 'perlin' | 'value'

export function NoiseDemo() {
  const { text, setText, seed, reroll } = useSeed('landscape')
  const [kind, setKind] = useState<Kind>('perlin')
  const [scale, setScale] = useState(4)
  const [useFbm, setUseFbm] = useState(true)
  const [octaves, setOctaves] = useState(5)
  const [lacunarity, setLacunarity] = useState(2)
  const [gain, setGain] = useState(0.5)
  const [animate, setAnimate] = useState(false)
  const ref = useRef<HTMLCanvasElement>(null)
  const colours = useColours()

  const field = useMemo<NoiseField>(() => {
    const rng = new RNG(seed)
    const base = kind === 'perlin' ? rng.perlinNoise() : rng.valueNoise()
    return useFbm ? base.fbm({ octaves, lacunarity, gain }) : base
  }, [seed, kind, useFbm, octaves, lacunarity, gain])

  const map = useMemo(() => colourMap(colours), [colours])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const res = animate ? 120 : 220
    canvas.width = res
    canvas.height = res
    const ctx = canvas.getContext('2d')!
    const image = ctx.createImageData(res, res)
    let raf = 0
    let z = 0
    const values = new Float32Array(res * res)
    const paint = () => {
      const d = image.data
      let lo = Infinity
      let hi = -Infinity
      for (let j = 0; j < res; j++) {
        for (let i = 0; i < res; i++) {
          const v = field.at((i / res) * scale, (j / res) * scale, z)
          values[j * res + i] = v
          if (v < lo) lo = v
          if (v > hi) hi = v
        }
      }
      // Stretch the colours over the values actually present, for contrast
      const span = hi - lo || 1
      for (let p = 0; p < values.length; p++) {
        const c = Math.max(0, Math.min(255, Math.round(((values[p] - lo) / span) * 255))) * 3
        d[p * 4] = map[c]
        d[p * 4 + 1] = map[c + 1]
        d[p * 4 + 2] = map[c + 2]
        d[p * 4 + 3] = 255
      }
      ctx.putImageData(image, 0, 0)
      if (animate) {
        z += 0.012
        raf = requestAnimationFrame(paint)
      }
    }
    paint()
    return () => cancelAnimationFrame(raf)
  }, [field, scale, map, animate])

  // A slice along the middle row, as a line
  const slice = useMemo(() => {
    const pts: [number, number][] = []
    for (let i = 0; i <= 200; i++) pts.push([i / 200, field.at((i / 200) * scale, scale / 2, 0)])
    return pts
  }, [field, scale])
  const x = linear([0, 1], [plotSize.left, plotSize.width - plotSize.right])
  const y = linear([-1, 1], [110, 10])

  return (
    <Demo
      title={`rng.${kind}Noise()${useFbm ? '.fbm({ … })' : ''}`}
      caption="Every pixel is field.at(x × scale, y × scale), coloured from the lowest value on screen to the highest. Turn on animation to move through the third dimension, the way a sketch might use time."
      controls={
        <>
          <Segmented
            label="noise"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'perlin', label: 'perlinNoise' },
              { value: 'value', label: 'valueNoise' },
            ]}
          />
          <ParamSlider label="scale (zoom out)" value={scale} min={0.5} max={16} step={0.25} onChange={setScale} />
          <ToggleControl label="fbm" checked={useFbm} onChange={setUseFbm} />
          <ToggleControl label="animate z" checked={animate} onChange={setAnimate} />
          {useFbm && (
            <>
              <ParamSlider label="octaves" value={octaves} min={1} max={8} step={1} onChange={setOctaves} />
              <ParamSlider label="lacunarity" value={lacunarity} min={1.2} max={3.5} step={0.05} onChange={setLacunarity} />
              <ParamSlider label="gain" value={gain} min={0.1} max={0.9} step={0.01} onChange={setGain} />
            </>
          )}
          <SeedControl text={text} setText={setText} reroll={reroll} />
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
        <canvas ref={ref} className="aspect-square w-full border" style={{ imageRendering: 'auto' }} aria-label="Noise field" role="img" />
        <div>
          <p className="mb-1 text-xs text-muted-foreground">A slice through the middle: the same field in one dimension</p>
          <svg viewBox={`0 0 ${plotSize.width} 120`} className="w-full" role="img" aria-label="Noise slice">
            <line x1={x(0)} x2={x(1)} y1={y(0)} y2={y(0)} className="stroke-foreground/20" strokeDasharray="4 4" />
            <path
              d={slice.map(([a, b], i) => `${i ? 'L' : 'M'}${x(a).toFixed(1)},${y(b).toFixed(1)}`).join('')}
              className="fill-none stroke-brand"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <text x={x(0)} y={8} className="fill-muted-foreground font-mono text-[10px]">1</text>
            <text x={x(0)} y={118} className="fill-muted-foreground font-mono text-[10px]">−1</text>
          </svg>
        </div>
      </div>
    </Demo>
  )
}

export function OctavesDemo() {
  const { seed } = useSeed('ridges')
  const field = useMemo(() => new RNG(seed).perlinNoise(), [seed])
  const rows = [1, 2, 4, 8]
  const x = linear([0, 1], [plotSize.left, plotSize.width - plotSize.right])

  return (
    <Demo title="Octaves, one at a time" caption="Each octave is finer (×lacunarity) and fainter (×gain) than the last; fbm adds them up and rescales back into [−1, 1].">
      <div className="space-y-1 p-5">
        {rows.map((o) => {
          const f = field.fbm({ octaves: o })
          const y = linear([-1, 1], [56, 4])
          const d = Array.from({ length: 301 }, (_, i) => `${i ? 'L' : 'M'}${x(i / 300).toFixed(1)},${y(f.at((i / 300) * 5)).toFixed(1)}`).join('')
          return (
            <div key={o} className="flex items-center gap-3">
              <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">octaves: {o}</span>
              <svg viewBox={`0 0 ${plotSize.width} 60`} className="w-full" aria-hidden="true">
                <path d={d} className="fill-none stroke-brand-2" strokeWidth={2} />
              </svg>
            </div>
          )
        })}
      </div>
    </Demo>
  )
}
