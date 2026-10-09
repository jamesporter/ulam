import { Link as LinkIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Md } from './Md'

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-10">
      {eyebrow && <p className="mb-2 text-sm font-medium text-brand">{eyebrow}</p>}
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {children && (
        <div className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {typeof children === 'string' ? <Md>{children}</Md> : children}
        </div>
      )}
    </header>
  )
}

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="group mt-14 mb-4 scroll-mt-20 border-b pb-2 text-2xl font-semibold">
      <a href={`#${id}`} className="inline-flex items-center gap-2">
        {children}
        <LinkIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    </h2>
  )
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-8 mb-3 scroll-mt-20 text-lg font-semibold">
      {children}
    </h3>
  )
}

/** A paragraph of prose; plain strings get inline markdown. */
export function P({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('my-4 leading-7 text-foreground/90', className)}>
      {typeof children === 'string' ? <Md>{children}</Md> : children}
    </p>
  )
}

export function Callout({
  tone = 'brand',
  title,
  children,
}: {
  tone?: 'brand' | 'orange'
  title?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'my-6 rounded-xl border-l-4 px-5 py-4 text-sm leading-6',
        tone === 'brand' ? 'border-brand bg-brand/6' : 'border-brand-2 bg-brand-2/8',
      )}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-foreground/85">{typeof children === 'string' ? <Md>{children}</Md> : children}</div>
    </div>
  )
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
}
