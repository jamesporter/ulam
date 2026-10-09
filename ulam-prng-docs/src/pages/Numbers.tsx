import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Callout, H2, P, PageHeader } from '@/components/docs/Prose'
import { AnglesDemo, BitsDemo, UniformDemo } from '@/components/viz/NumbersDemos'
import { entry } from '@/content/api'

export function Numbers() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Numbers">
        The uniform core that everything else is built on: raw bits, doubles, unbiased integers, angles and signs.
      </PageHeader>

      <H2 id="core">The core</H2>
      <P>
        Underneath is PCG32, a permuted congruential generator: a 64-bit linear congruential state, scrambled on the way
        out by an xorshift and a random rotation. It is small and fast and passes the standard statistical test batteries
        that simpler generators — including many `Math.random` implementations — fail.
      </P>
      <BitsDemo />
      <P>
        `number()` takes two of those outputs to fill all 53 bits of a double’s mantissa, so every representable step in
        `[0, 1)` can come up. `integer(max)` uses rejection sampling, so it is exactly uniform for any `max` rather than
        slightly favouring small values, as `Math.floor(Math.random() * max)` can.
      </P>
      <UniformDemo />
      <Callout title="Passing it around">
        `rng.random` is `number()` pre-bound to its generator, for anything that wants a `() =&gt; number` — including every
        [standalone function](/docs/standalone) in this library.
      </Callout>

      <H2 id="helpers">Integers, angles and signs</H2>
      <CodeBlock
        code={`rng.uniformRandomInt({ to: 6 }) // 0 to 6, inclusive
rng.uniformRandomInt({ from: 1, to: 7, inclusive: false }) // 1 to 6
rng.randomAngle() // 0 to 2π
rng.randomPolarity() // 1 or -1
rng.bernoulli(0.3) // true 30% of the time`}
      />
      <AnglesDemo />

      <H2 id="api">API</H2>
      {['number', 'random', 'integer', 'next', 'uniformRandomInt', 'randomAngle', 'randomPolarity'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
