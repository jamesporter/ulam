import { Link, useParams } from 'react-router'
import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Md } from '@/components/docs/Md'
import { H2, P, PageHeader } from '@/components/docs/Prose'
import { Badge } from '@/components/ui/badge'
import { DistributionExplorer } from '@/components/viz/DistributionExplorer'
import { entry } from '@/content/api'
import { defaults, distributionById, distributions } from '@/content/distributions'
import { NotFound } from './NotFound'

export function DistributionPage() {
  const { id } = useParams()
  const dist = distributionById(id)
  if (!dist) return <NotFound />

  const related = distributions.filter((d) => d.id !== dist.id && d.tags.some((t) => dist.tags.includes(t))).slice(0, 4)

  return (
    <>
      <PageHeader
        eyebrow={dist.kind === 'continuous' ? 'Continuous distribution' : dist.kind === 'discrete' ? 'Discrete distribution' : 'Vector distribution'}
        title={dist.title}
      >
        <Md>{dist.tagline}</Md>
      </PageHeader>
      <div className="-mt-6 mb-8 flex flex-wrap gap-1.5">
        {dist.tags.map((t) => (
          <Badge key={t} variant="secondary" className="font-normal">
            {t}
          </Badge>
        ))}
      </div>

      {dist.description.map((p, i) => (
        <P key={i}>{p}</P>
      ))}

      <DistributionExplorer key={dist.id} dist={dist} />

      <H2 id="api">API</H2>
      <ApiEntryCard entry={entry(dist.method)} hideExample compact toc={false} />
      {dist.algorithm && (
        <P>
          <span className="font-semibold">How it is drawn: </span>
          <Md>{dist.algorithm}</Md>
        </P>
      )}

      <H2 id="standalone">Standalone</H2>
      <P>{`Every distribution is exported as a function too, taking any source of uniform randomness first — \`rng.random\`, \`Math.random\`, or your own.`}</P>
      <CodeBlock
        code={`import { ${dist.method}, RNG } from "ulam-prng"

const rng = new RNG("sunflower")
${standaloneCall(dist.call(defaults(dist)), 'rng.random')}
${standaloneCall(dist.call(defaults(dist)), 'Math.random')} // Or any () => number`}
      />
      <p className="text-sm text-muted-foreground">
        Signature: <code className="font-mono text-xs">{dist.standalone}</code>
      </p>

      {related.length > 0 && (
        <>
          <H2 id="related">Related</H2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((d) => (
              <Link key={d.id} to={`/docs/distributions/${d.id}`} className="border p-4 transition-colors hover:border-brand/50 hover:bg-accent/40">
                <div className="font-medium">{d.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  <Md>{d.tagline}</Md>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/** `gaussian({ sd: 2 })` as the standalone `gaussian(source, { sd: 2 })`. */
function standaloneCall(call: string, source: string) {
  return call.replace(/^(\w+)\((\)?)/, (_, name: string, close: string) => (close ? `${name}(${source})` : `${name}(${source}, `))
}
