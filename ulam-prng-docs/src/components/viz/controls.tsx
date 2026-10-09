import { Dices } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function SeedControl({
  text,
  setText,
  reroll,
  className,
}: {
  text: string
  setText: (s: string) => void
  reroll: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="seed-input">
        seed
      </label>
      <div className="flex gap-1.5">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-8 font-mono text-sm"
          spellCheck={false}
          aria-label="Seed"
        />
        <Button variant="outline" size="icon" onClick={reroll} aria-label="New seed" title="New seed">
          <Dices />
        </Button>
      </div>
    </div>
  )
}

export function ParamSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  className,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  format?: (v: number) => string
  className?: string
}) {
  const shown = format ? format(value) : String(Number(value.toFixed(4)))
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-mono font-medium">{label}</span>
        <span className="font-mono text-brand tabular-nums">{shown}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  )
}

export function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-xs">
      <span className="font-mono font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <div className="inline-flex w-fit rounded-lg bg-muted p-0.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md px-2.5 py-1 font-mono text-xs transition-colors',
              o.value === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** The frame around every interactive example: the picture, then its controls. */
export function Demo({
  title,
  caption,
  controls,
  children,
  footer,
  className,
}: {
  title?: string
  caption?: ReactNode
  controls?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <figure className={cn('not-prose my-8 overflow-hidden border bg-card shadow-xs', className)}>
      {(title || caption) && (
        <figcaption className="flex flex-col gap-0.5 border-b px-5 py-3">
          {title && (
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="size-1.5 rounded-full brand-gradient" />
              {title}
            </span>
          )}
          {caption && <span className="text-xs leading-5 text-muted-foreground">{caption}</span>}
        </figcaption>
      )}
      <div className="viz-surface relative">{children}</div>
      {controls && <div className="grid gap-x-6 gap-y-4 border-t bg-muted/30 px-5 py-4 sm:grid-cols-2">{controls}</div>}
      {footer && <div className="border-t px-5 py-3 text-xs text-muted-foreground">{footer}</div>}
    </figure>
  )
}
