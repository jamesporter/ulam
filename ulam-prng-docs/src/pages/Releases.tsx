import { ExternalLink } from 'lucide-react'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Md } from '@/components/docs/Md'
import { PageHeader } from '@/components/docs/Prose'
import { Badge } from '@/components/ui/badge'
import { releases } from '@/content/releases'
import { cn } from '@/lib/utils'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function Releases() {
  return (
    <>
      <PageHeader eyebrow="Reference" title="Release notes">
        The history of ulam-prng. The output sequence for a given seed is pinned by golden tests, so any release that
        changes what an existing seed draws will say so here, loudly.
      </PageHeader>

      <ol className="relative space-y-14 border-l pl-8">
        {releases.map((r, i) => (
          <li key={r.version} className="relative">
            <span
              className={cn(
                'absolute top-1.5 -left-[41px] size-4 rounded-full border-4 border-background',
                r.unpublished ? 'bg-muted-foreground/40' : i === 0 ? 'brand-gradient' : 'bg-brand',
              )}
            />
            <div className="flex flex-wrap items-center gap-3">
              <h2 id={`v${r.version}`} className="scroll-mt-20 font-mono text-2xl font-semibold" data-toc-label={r.version}>
                {r.version}
              </h2>
              {i === 0 && <Badge className="brand-gradient border-0 text-white">Latest</Badge>}
              {r.unpublished && <Badge variant="outline">Not published</Badge>}
              <time dateTime={r.date} className="text-sm text-muted-foreground">
                {dateFormat.format(new Date(r.date))}
              </time>
              {!r.unpublished && (
                <a
                  href={`https://www.npmjs.com/package/ulam-prng/v/${r.version}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
                >
                  npm <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <p className="mt-2 text-lg font-semibold">{r.headline}</p>
            <p className="mt-2 leading-7 text-muted-foreground">
              <Md>{r.summary}</Md>
            </p>
            {r.highlight && <CodeBlock code={r.highlight} />}
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {r.sections.map((s) => (
                <div key={s.title}>
                  <h3 className="mb-2 text-sm font-semibold tracking-wide text-brand uppercase">{s.title}</h3>
                  <ul className="space-y-2 text-sm leading-6">
                    {s.items.map((item, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="mt-2.5 size-1 shrink-0 rounded-full bg-brand-2" />
                        <span className="text-foreground/85">
                          <Md>{item}</Md>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
