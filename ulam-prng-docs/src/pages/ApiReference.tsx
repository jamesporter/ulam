import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { KindBadge, SinceBadge } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Md } from '@/components/docs/Md'
import { PageHeader } from '@/components/docs/Prose'
import { Input } from '@/components/ui/input'
import { apiGroups, apiHref as href } from '@/content/api'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-')

export function ApiReference() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const groups = apiGroups
    .map((g) => ({
      ...g,
      entries: q
        ? g.entries.filter((e) => e.name.toLowerCase().includes(q) || e.signature.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q))
        : g.entries,
    }))
    .filter((g) => g.entries.length > 0)
  const count = apiGroups.reduce((n, g) => n + g.entries.length, 0)

  return (
    <>
      <PageHeader eyebrow="Reference" title="API reference">
        {`Every export of ulam-prng and every method of \`RNG\` — ${count} entries — on one page. Each links to the guide that covers it, with live examples.`}
      </PageHeader>

      <CodeBlock
        code={`import {
  RNG, hashSeed,
  // Distributions, as functions of any random source
  gaussian, logNormal, exponential, laplace, cauchy, pareto, weibull, triangular,
  gamma, beta, chiSquared, studentT, truncatedGaussian, dirichlet,
  bernoulli, binomial, geometric, poisson, categorical, zipf,
  // Vectors
  uniformVec2, uniformVec3, uniformVec4, gaussianVec2, gaussianVec3, gaussianVec4,
  onUnitCircle, inUnitDisc, onUnitSphere, inUnitBall, perturbVec2, perturbVec3,
  // Points, noise and walks
  poissonDiskPoints, PoissonDiskSampling, perlinNoise, valueNoise, walk,
} from "ulam-prng"

import type {
  RNGState, RandomSource, Vec2, Vec3, Vec4, Point2D, Vector2D,
  UniformVecConfig, GaussianVecConfig, NoiseField, FbmConfig, WalkConfig,
} from "ulam-prng"`}
      />

      <div className="sticky top-14 z-10 -mx-2 mb-6 bg-background/90 px-2 py-3 backdrop-blur">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name, type or description…" className="h-10 pl-9" aria-label="Filter the API" />
        </div>
      </div>

      {groups.length === 0 && <p className="py-10 text-center text-muted-foreground">Nothing matches “{query}”.</p>}

      {groups.map((g) => (
        <section key={g.title} className="mb-10">
          <h2 id={slug(g.title)} data-toc-label={g.title} className="flex scroll-mt-32 items-baseline justify-between gap-3 border-b pb-2 text-xl font-semibold">
            {g.title}
            <Link to={g.page} className="font-sans text-xs font-normal text-brand hover:underline">
              Guide →
            </Link>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{g.blurb}</p>
          <div className="mt-3 divide-y">
            {g.entries.map((e) => (
              <Link key={e.id} to={href(e)} className="group -mx-3 block rounded-lg px-3 py-3 transition-colors hover:bg-accent/50">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-mono text-sm font-semibold group-hover:text-brand">
                    {e.kind === 'method' || e.kind === 'property' ? (e.name.includes('.') ? e.name : `rng.${e.name}`) : e.name}
                  </code>
                  <KindBadge kind={e.kind} />
                  <SinceBadge since={e.since} link={false} />
                </div>
                <code className="mt-1 block overflow-x-auto font-mono text-xs whitespace-pre text-muted-foreground">{e.signature}</code>
                <p className="mt-1.5 text-sm text-foreground/85">
                  <Md noLinks>{e.summary}</Md>
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
