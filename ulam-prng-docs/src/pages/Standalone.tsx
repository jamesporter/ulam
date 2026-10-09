import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Md } from '@/components/docs/Md'
import { Callout, H2, P, PageHeader } from '@/components/docs/Prose'
import { apiGroups, entry } from '@/content/api'

export function Standalone() {
  const functions = apiGroups.find((g) => g.title === 'Standalone functions')!.entries
  const types = apiGroups.find((g) => g.title === 'Types')!.entries
  const listed = functions.filter((f) => f.kind === 'function' && f.id !== 'fn-poissonDiskPoints')

  return (
    <>
      <PageHeader eyebrow="Reference" title="Standalone functions">
        Every sampler `RNG` offers as a method is also exported as a plain function, taking any source of uniform
        randomness as its first argument.
      </PageHeader>

      <P>
        That source is a `RandomSource`: anything returning numbers in `[0, 1)`. Use `rng.random` to drive them from a
        seeded generator, `Math.random` when reproducibility does not matter, or another library’s generator entirely.
      </P>
      <CodeBlock
        code={`import { gamma, inUnitDisc, perlinNoise, RNG, weibull } from "ulam-prng"

const rng = new RNG("sunflower")

gamma(rng.random, { shape: 2, scale: 0.5 }) // Exactly rng.gamma({ shape: 2, scale: 0.5 })
weibull(Math.random, { shape: 8 })
inUnitDisc(() => myOtherGenerator.next(), { radius: 0.5 })
perlinNoise(rng.random).at(0.5, 0.5)`}
      />
      <Callout title="Same draws, same results">
        A method and its standalone function consume randomness identically, so `rng.gamma(…)` and `gamma(rng.random, …)`
        give the same value from the same state, and leave the generator in the same place.
      </Callout>

      <H2 id="functions">Functions</H2>
      <div className="overflow-hidden border">
        <table className="w-full text-sm">
          <tbody>
            {listed.map((f) => (
              <tr key={f.id} id={f.id} className="scroll-mt-20 border-b last:border-0 target:bg-brand/8">
                <td className="py-2 pr-3 pl-4 align-top">
                  <code className="font-mono text-[13px] font-medium text-brand">{f.name}</code>
                </td>
                <td className="hidden py-2 pr-4 align-top font-mono text-xs text-muted-foreground md:table-cell">
                  {f.signature.replace(f.name, '')}
                </td>
                <td className="py-2 pr-4 align-top text-foreground/85">
                  <Md>{f.summary.replace('The standalone form of ', '')}</Md>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2 id="poisson-disk">Poisson disk sampling</H2>
      <ApiEntryCard entry={entry('fn-poissonDiskPoints')} />
      <ApiEntryCard entry={entry('PoissonDiskSampling')} />

      <H2 id="types">Types</H2>
      <P>All types are exported for use with `import type`.</P>
      {types.map((t) => (
        <ApiEntryCard key={t.id} entry={t} />
      ))}
    </>
  )
}
