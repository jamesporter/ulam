import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Callout, H2, P, PageHeader } from '@/components/docs/Prose'
import { BagDemo, ShuffleDemo, WeightedDemo } from '@/components/viz/CollectionsDemos'
import { entry } from '@/content/api'

export function Collections() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Collections">
        Choosing from arrays: one element or several, weighted or not, shuffled in place or copied, and drawn with or
        without replacement.
      </PageHeader>

      <CodeBlock
        code={`rng.sample(items) // One element — throws on an empty array
rng.samples(5, items) // Five, with replacement
rng.shuffle(items) // Fisher-Yates, in place
rng.shuffled(items) // A shuffled copy, original untouched

rng.weightedSample([
  [5, "circle"],
  [3, "square"],
  [2, "triangle"],
]) // Values in proportion to their weights`}
      />

      <H2 id="shuffling">Shuffling</H2>
      <ShuffleDemo />

      <H2 id="weighted">Weighted choices</H2>
      <P>
        `weightedSample` takes `[weight, value]` pairs. If you want the index instead, use
        [`categorical`](/docs/distributions/categorical); to run a function, [`proportionately`](/docs/choosing#proportionately).
      </P>
      <WeightedDemo />

      <H2 id="without-replacement">Without replacement</H2>
      <P>
        These draw from the collection you hand them and **take what they draw out of it**, so that collection is the
        record of what is left — the way `shuffle` works in place. Pass a copy if you want to keep the original:
      </P>
      <CodeBlock
        code={`const deck = [1, 2, 3, 4, 5, 6]

rng.sampleWithoutReplacement(deck) // One element, now gone from deck
rng.samplesWithoutReplacement(2, deck) // Two more, all distinct; three left
rng.samplesWithoutReplacement(3, [...deck]) // Leaves deck alone`}
      />
      <P>
        The `WithCounts` pair is the same idea over `[count, value]` pairs: the without replacement counterpart of
        `weightedSample`. Counts say how many of each thing there are, so unlike weights they must be non-negative
        integers, and every draw decrements the count it came from.
      </P>
      <BagDemo />
      <Callout tone="orange" title="Validated up front">
        Both plural forms throw if you ask for more than is left — and check before drawing anything, so a throw leaves
        your collection untouched.
      </Callout>

      <H2 id="api">API</H2>
      {[
        'sample',
        'samples',
        'shuffle',
        'shuffled',
        'weightedSample',
        'sampleWithoutReplacement',
        'samplesWithoutReplacement',
        'sampleWithoutReplacementWithCounts',
        'samplesWithoutReplacementWithCounts',
      ].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
