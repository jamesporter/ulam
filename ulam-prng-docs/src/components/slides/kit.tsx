import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Md } from '@/components/docs/Md'
import { cn } from '@/lib/utils'
import { prepareCanvas, useColours, type Colours } from '@/components/viz/useColours'

export type Size = { width: number; height: number }

/** The size of an element, kept up to date as it changes. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((s) => (Math.abs(s.width - width) < 0.5 && Math.abs(s.height - height) < 0.5 ? s : { width, height }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

/** Fills its parent, and hands its children the space it has. */
export function Measure({ children, className }: { children: (size: Size) => ReactNode; className?: string }) {
  const [ref, size] = useSize<HTMLDivElement>()
  return (
    <div ref={ref} className={cn('absolute inset-0', className)}>
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  )
}

/**
 * What a canvas is drawn with. Return a function to animate: it is called
 * once a frame with the frame number until it returns false.
 */
export type Draw = (ctx: CanvasRenderingContext2D, size: Size, colours: Colours) => void | ((frame: number) => boolean | void)

/** A canvas that fills its panel, redrawn when the picture, its size or the theme changes. */
export function ArtCanvas({ draw, label, className }: { draw: Draw; label: string; className?: string }) {
  const [wrap, size] = useSize<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const colours = useColours()

  useEffect(() => {
    const c = canvas.current
    if (!c || size.width === 0 || size.height === 0) return
    const ctx = prepareCanvas(c, size.width, size.height)
    const animate = draw(ctx, size, colours)
    if (!animate) return
    let raf = 0
    let frame = 0
    const tick = () => {
      if (animate(frame++) !== false) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [draw, size, colours])

  return (
    <div ref={wrap} className={cn('absolute inset-0', className)}>
      <canvas ref={canvas} className="block size-full" role="img" aria-label={label} />
    </div>
  )
}

/** The largest centred square that fits, for pictures that should not stretch. */
export function square({ width, height }: Size, pad = 0) {
  const s = Math.min(width, height) - pad * 2
  return { s, x: (width - s) / 2, y: (height - s) / 2 }
}

/** Inline markdown, for slide prose. */
export function P({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn('text-[15px] leading-relaxed text-muted-foreground xl:text-base 2xl:text-lg', className)}>
      <Md noLinks>{children}</Md>
    </p>
  )
}

export function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-code px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed text-foreground/90 2xl:text-sm">
      <code>{children.replace(/^\n+|\s+$/g, '')}</code>
    </pre>
  )
}

/** One panel of a slide: a picture or a chart, with a label above it. */
export function Panel({
  label,
  note,
  children,
  className,
}: {
  label: string
  note?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex min-h-[18rem] flex-col border bg-card shadow-xs lg:min-h-0', className)}>
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2 text-xs">
        <span className="flex items-center gap-2 font-semibold">
          <span className="size-1.5 rounded-full brand-gradient" />
          {label}
        </span>
        {note && <span className="min-w-0 truncate font-mono text-muted-foreground">{note}</span>}
      </header>
      <div className="viz-surface relative min-h-0 flex-1">{children}</div>
    </section>
  )
}

/**
 * The usual slide: words and controls down the left, a picture and a chart on
 * the right. Either panel can be left out.
 */
export function SlideFrame({
  kicker,
  title,
  children,
  code,
  controls,
  visual,
  graph,
  stack,
}: {
  kicker: string
  title: ReactNode
  children?: ReactNode
  code?: string
  controls?: ReactNode
  visual?: { label: string; note?: ReactNode; node: ReactNode }
  graph?: { label: string; note?: ReactNode; node: ReactNode }
  /** Put the panels one above the other rather than side by side */
  stack?: boolean
}) {
  const panels = [visual, graph].filter((p) => p !== undefined)
  return (
    <div className="grid min-h-full grid-cols-1 gap-6 px-4 pt-18 pb-20 sm:px-8 lg:h-full lg:pb-16 lg:grid-cols-[minmax(19rem,25rem)_minmax(0,1fr)] lg:gap-8 lg:px-10 2xl:grid-cols-[minmax(22rem,30rem)_minmax(0,1fr)] 2xl:gap-12 2xl:px-14">
      <div className="flex min-h-0 min-w-0 flex-col gap-4 *:shrink-0 lg:overflow-y-auto lg:pr-1">
        <div>
          <p className="font-mono text-xs font-medium tracking-wide text-brand uppercase">{kicker}</p>
          <h2 className="mt-2 text-3xl leading-[1.05] font-bold xl:text-4xl 2xl:text-5xl">{title}</h2>
        </div>
        {children}
        {code && <Code>{code}</Code>}
        {controls && <Controls>{controls}</Controls>}
      </div>
      {panels.length > 0 && (
        <div
          className={cn(
            'grid min-h-0 min-w-0 grid-cols-1 gap-4',
            panels.length > 1 && !stack && 'xl:grid-cols-2',
            panels.length > 1 && 'lg:grid-rows-2',
            panels.length > 1 && !stack && 'xl:grid-rows-1',
          )}
        >
          {panels.map((p) => (
            <Panel key={p.label} label={p.label} note={p.note}>
              {p.node}
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The controls for a slide. A slider let go of after dragging gives up focus,
 * so the arrow keys go back to moving between slides.
 */
export function Controls({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid gap-x-5 gap-y-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
      onPointerUp={() =>
        setTimeout(() => {
          const el = document.activeElement
          if (el instanceof HTMLElement && el.getAttribute('role') === 'slider') el.blur()
        })
      }
    >
      {children}
    </div>
  )
}

/** A small figure for the left column: a value and what it is. */
export function Stat({ label, value, tone = 'brand' }: { label: string; value: ReactNode; tone?: 'brand' | 'brand-2' | 'muted' }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span
        className={cn(
          'font-mono text-xl tabular-nums 2xl:text-2xl',
          tone === 'brand' && 'text-brand',
          tone === 'brand-2' && 'text-brand-2',
          tone === 'muted' && 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function Stats({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-x-8 gap-y-2">{children}</div>
}

/** A swatch and a name, for chart keys. */
export function Key({ items }: { items: { label: string; className: string; line?: boolean }[] }) {
  return (
    <div className="pointer-events-none absolute top-2.5 right-3 z-10 flex flex-wrap justify-end gap-3 rounded-md bg-card/85 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
      {items.map((i, k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={cn(i.line ? 'h-0.5 w-3 rounded' : 'size-2.5 rounded-sm', i.className)} />
          {i.label}
        </span>
      ))}
    </div>
  )
}
