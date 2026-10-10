import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Callout, H2, H3, P, PageHeader } from '@/components/docs/Prose'
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
      <H3 id="skip">Jumping ahead</H3>
      <P>
        `skip(n)` moves a generator `n` draws along its sequence without making them — in time proportional to `log n`,
        so a billion costs no more than a few dozen multiplications. A negative `n` moves it back. It is exact, so
        `skip(n)` then `skip(-n)` is right back where it started.
      </P>
      <CodeBlock
        code={`rng.skip(1_000_000) // As if next() had been called a million times
rng.skip(-2).next() // The draw before last, again

// Start at frame 500 of an animation that takes 1000 number()s per frame,
// without drawing frames 0 to 499 first
const frame = new RNG("sunflower").skip(500 * 1000 * 2)`}
      />
      <P>
        A draw here is one call to `next()`. `number()` takes two, so skip twice as many as the numbers you want to pass
        over; anything that rejects and retries, like `gaussian` or `poissonDiskPoints`, takes a varying number, so for
        those it is simpler to give each part of a sketch its own [stream](/docs/streams).
      </P>
      <Callout tone="orange" title="State or string?">
        `getState` gives the raw PCG state, enough to rewind. To save a generator somewhere — a URL, a file — prefer
        [`toJSON`](/docs/serialisation), which also carries the seed so that [streams](/docs/streams) come back too.
      </Callout>

      <H2 id="api">API</H2>
      {['constructor', 'seed', 'getState', 'setState', 'skip', 'hashSeed', 'RNGState'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
