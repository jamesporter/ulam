export type ShapeName = 'circle' | 'square' | 'triangle'

const shapeColour: Record<ShapeName, string> = {
  circle: 'var(--brand)',
  square: 'var(--brand-2)',
  triangle: 'var(--chart-3)',
}

/** A unit shape centred on (0, 0), scaled by `size`. */
export function Shape({ shape, x = 0, y = 0, size = 1, opacity = 1 }: { shape: ShapeName; x?: number; y?: number; size?: number; opacity?: number }) {
  const fill = shapeColour[shape]
  if (shape === 'circle') return <circle cx={x} cy={y} r={size * 0.42} style={{ fill }} opacity={opacity} />
  if (shape === 'square') return <rect x={x - size * 0.36} y={y - size * 0.36} width={size * 0.72} height={size * 0.72} rx={size * 0.08} style={{ fill }} opacity={opacity} />
  const h = size * 0.8
  return <polygon points={`${x},${y - h / 2} ${x + h * 0.55},${y + h / 2} ${x - h * 0.55},${y + h / 2}`} style={{ fill }} opacity={opacity} />
}

export function ShapeIcon({ shape }: { shape: ShapeName }) {
  return (
    <svg viewBox="-0.5 -0.5 1 1" className="inline-block size-3.5 align-[-2px]" aria-hidden="true">
      <Shape shape={shape} />
    </svg>
  )
}
