import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Callout, H2, P, PageHeader } from '@/components/docs/Prose'
import { ForkDemo, StreamsDemo } from '@/components/viz/StreamsDemo'
import { entry } from '@/content/api'

export function Streams() {
  return (
    <>
      <PageHeader eyebrow="Getting started" title="Streams">
        One seed, several independent generators — so randomness drawn in one place stops disturbing randomness drawn in
        another.
      </PageHeader>

      <P>
        A single generator is a single sequence. Draw one more number for the layout and every colour after it moves
        along by one. Change how many petals you draw, and the palette changes too. Streams fix that.
      </P>

      <StreamsDemo />

      <H2 id="named-streams">Named streams</H2>
      <P>
        `stream(id)` gives a named generator derived from the seed. It depends only on the seed and the name — not on how
        far along the parent happens to be — so the layer you ask for is the same layer however much drawing came before
        it.
      </P>
      <CodeBlock
        code={`const rng = new RNG("sunflower")

const layout = rng.stream("layout")
const colour = rng.stream("colour")
const texture = rng.stream("texture") // Adding this moves neither of the others`}
      />
      <P>Streams nest, so a component handed `layout` can name streams of its own without colliding with anything above it:</P>
      <CodeBlock code={`layout.stream("colour") // Its own generator, unrelated to rng.stream("colour")`} />

      <H2 id="forks">Forks</H2>
      <P>
        `fork()` takes a fresh generator out of this one, advancing it by four draws. Because the child has its own seed
        and its own stream, it can draw as much as it likes without shifting the parent’s sequence — which makes it safe
        to hand to something whose appetite for random numbers you do not control.
      </P>
      <ForkDemo />
      <CodeBlock
        code={`for (const petal of petals) drawPetal(petal, rng.fork()) // Each petal, reproducibly

const [background, foreground] = rng.split(2) // n forks at once`}
      />
      <Callout title="Which to use">
        Reach for `stream` when the parts of a sketch have names, and `fork` when there are simply a lot of them.
      </Callout>

      <H2 id="api">API</H2>
      {['stream', 'fork', 'split'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
