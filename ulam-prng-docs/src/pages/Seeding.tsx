import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Callout, H2, P, PageHeader } from '@/components/docs/Prose'
import { NeighboursDemo, SeedDemo, StateDemo } from '@/components/viz/SeedingDemos'
import { entry } from '@/content/api'

export function Seeding() {
  return (
    <>
      <PageHeader eyebrow="Getting started" title="Seeding">
        `RNG` takes a seed. Give it the same one twice and you get the same sequence twice.
      </PageHeader>

      <CodeBlock
        code={`new RNG() // Different every run
new RNG(42) // Reproducible
new RNG("sunflower") // Any string will do
new RNG(0x12345678, 0x9abcdef0) // Full 64-bit seed`}
      />
      <P>
        Leave the seed out and the generator seeds itself with a full 64 bits from the platform’s cryptographic generator,
        falling back to `Math.random()` where there is not one.
      </P>

      <SeedDemo />

      <H2 id="strings">String seeds</H2>
      <P>
        A string seed is hashed down to 64 bits, so a sketch can be named rather than numbered — and the same name always
        draws the same picture. The hash is well mixed, so near neighbours are not: `"tree"` and `"tres"` give unrelated
        seeds, and unrelated pictures.
      </P>
      <NeighboursDemo />

      <H2 id="state">Moving around the sequence</H2>
      <P>
        `seed` re-seeds a generator in place, keeping references to it valid. `getState` and `setState` save and restore
        its exact position.
      </P>
      <StateDemo />
      <Callout tone="orange" title="State or string?">
        `getState` gives the raw PCG state, enough to rewind. To save a generator somewhere — a URL, a file — prefer
        [`toJSON`](/docs/serialisation), which also carries the seed so that [streams](/docs/streams) come back too.
      </Callout>

      <H2 id="api">API</H2>
      {['constructor', 'seed', 'getState', 'setState', 'hashSeed', 'RNGState'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
