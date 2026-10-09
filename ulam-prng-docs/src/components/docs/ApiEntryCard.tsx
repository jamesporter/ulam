import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import type { ApiEntry } from '@/content/api'
import { cn } from '@/lib/utils'
import { CodeBlock } from './CodeBlock'
import { Md } from './Md'

const kindLabel: Record<ApiEntry['kind'], string> = {
  constructor: 'constructor',
  method: 'method',
  static: 'static',
  property: 'property',
  function: 'function',
  class: 'class',
  type: 'type',
}

export function KindBadge({ kind }: { kind: ApiEntry['kind'] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono text-[10px] font-normal',
        kind === 'function' || kind === 'class' ? 'border-brand-2/40 text-brand-2' : 'border-brand/40 text-brand',
        kind === 'type' && 'border-border text-muted-foreground',
      )}
    >
      {kindLabel[kind]}
    </Badge>
  )
}

export function SinceBadge({ since, link = true }: { since: string; link?: boolean }) {
  const className = 'rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground'
  if (!link) return <span className={className}>since {since}</span>
  return (
    <Link to={`/releases#v${since}`} className={`${className} transition-colors hover:text-foreground`} title={`Added in ${since}`}>
      since {since}
    </Link>
  )
}

/** One documented method, function or type: signature, prose, options and an example. */
export function ApiEntryCard({
  entry,
  children,
  hideExample,
  compact,
  toc = true,
}: {
  entry: ApiEntry
  children?: ReactNode
  hideExample?: boolean
  /** Leave out the longer paragraphs, for listings */
  compact?: boolean
  /** List it in the page's table of contents */
  toc?: boolean
}) {
  const label = entry.kind === 'method' || entry.kind === 'property' ? (entry.name.includes('.') ? entry.name : `rng.${entry.name}`) : entry.name

  return (
    <section className="my-10">
      <h3
        id={entry.id}
        data-toc={toc ? '' : undefined}
        data-toc-label={entry.name}
        className="flex scroll-mt-20 flex-wrap items-center gap-2"
      >
        <a href={`#${entry.id}`} className="font-mono text-lg font-semibold tracking-tight hover:text-brand">
          {label}
        </a>
        <KindBadge kind={entry.kind} />
        <SinceBadge since={entry.since} />
      </h3>
      <CodeBlock code={entry.signature} noCopy className="my-3" />
      <p className="leading-7 text-foreground/90">
        <Md>{entry.summary}</Md>
      </p>
      {!compact &&
        entry.details?.map((d, i) => (
          <p key={i} className="mt-3 leading-7 text-foreground/90">
            <Md>{d}</Md>
          </p>
        ))}
      {entry.params && entry.params.length > 0 && <OptionsTable options={entry.params} />}
      {entry.returns && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">Returns </span>
          <span className="text-muted-foreground">
            <Md>{entry.returns}</Md>
          </span>
        </p>
      )}
      {entry.throws && entry.throws.length > 0 && (
        <div className="mt-2 text-sm">
          <span className="font-semibold">Throws </span>
          <span className="text-muted-foreground">
            {entry.throws.map((t, i) => (
              <span key={i}>
                {i > 0 && '; '}
                <Md>{t}</Md>
              </span>
            ))}
          </span>
        </div>
      )}
      {children}
      {!hideExample && entry.example && <CodeBlock code={entry.example} />}
    </section>
  )
}

export function OptionsTable({ options }: { options: { name: string; type: string; default?: string; description: string }[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Option</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Default</th>
            <th className="px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {options.map((o) => (
            <tr key={o.name} className="border-t align-top">
              <td className="px-3 py-2 font-mono text-[13px] whitespace-nowrap text-brand">{o.name}</td>
              <td className="px-3 py-2 font-mono text-[13px] whitespace-nowrap text-muted-foreground">{o.type}</td>
              <td className="px-3 py-2 font-mono text-[13px] whitespace-nowrap">{o.default ?? <span className="text-muted-foreground">required</span>}</td>
              <td className="px-3 py-2 text-foreground/85">
                <Md>{o.description}</Md>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
