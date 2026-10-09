import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { H2, P, PageHeader } from '@/components/docs/Prose'
import { SerialiseDemo } from '@/components/viz/SerialiseDemo'
import { entry } from '@/content/api'

export function Serialisation() {
  return (
    <>
      <PageHeader eyebrow="Getting started" title="Saving where you are">
        A generator serialises to a 32 character URL safe string carrying its seed and its exact position, so a picture
        can be saved, linked to, or picked up again later.
      </PageHeader>

      <CodeBlock
        code={`location.hash = rng.toJSON() // "BdoJ48gZ1ZtXbRYS2XPecRQFe373Z4FP"

const restored = RNG.fromJSON(location.hash.slice(1)) // Carries on where it left off`}
      />

      <SerialiseDemo />

      <H2 id="json">Inside larger state</H2>
      <P>
        It is called `toJSON` so `JSON.stringify` finds it on its own, wherever a generator sits inside something larger
        being saved. Streams come back with it: a restored generator’s `stream("colour")` is the one it always was.
      </P>
      <CodeBlock
        code={`const saved = JSON.stringify({ title: "Sunflowers", rng })
// '{"title":"Sunflowers","rng":"BdoJ48gZ1ZtXbRYS2XPecRQFe373Z4FP"}'

const { title, rng: s } = JSON.parse(saved)
const rng = RNG.fromJSON(s)
rng.stream("colour") // The same colour stream as before`}
      />

      <H2 id="api">API</H2>
      {['toJSON', 'fromJSON'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
