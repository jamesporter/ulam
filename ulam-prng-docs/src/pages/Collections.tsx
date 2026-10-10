import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { Callout, H2, H3, P, PageHeader } from '@/components/docs/Prose'
import { BagDemo, ShuffleDemo, WeightedDemo } from '@/components/viz/CollectionsDemos'
import { entry } from '@/content/api'

export function Collections() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Collections">
        Choosing from arrays: one element or several, weighted or not, shuffled in place or copied, drawn with or
        without replacement, and sampled from streams of any length.
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
      <H3 id="weighted-sampler">Drawing from the same weights many times</H3>
      <P>
        `weightedSample` looks through the weights on every call, which is fine for a handful of values. When the weights
        are fixed and you draw from them thousands of times — a palette for every dot, a tile for every cell —
        `weightedSampler` prepares an alias table once, after which every draw is one uniform number and a lookup,
        however many values there are.
      </P>
      <CodeBlock
        code={`const colour = rng.weightedSampler([
  [5, "ink"],
  [3, "rust"],
  [1, "gold"],
])

for (const p of points) drawDot(p, colour()) // Constant time per draw`}
      />

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

      <H2 id="reservoir">From a stream of unknown length</H2>
      <P>
        `reservoirSample(k, items)` chooses `k` items uniformly from anything iterable — an array, a set, a string, a
        generator — in a single pass, never holding more than `k` at once and never needing to know the length up front.
      </P>
      <CodeBlock
        code={`rng.reservoirSample(3, new Set(words)) // Three distinct words
rng.reservoirSample(10, readLines()) // Ten lines from a generator of any length`}
      />
      <P>
        Every set of `k` items is equally likely to be chosen, but they come back in the order the reservoir holds them,
        which is not itself random: `shuffle` the result if order matters.
      </P>

      <H2 id="api">API</H2>
      {[
        'sample',
        'samples',
        'shuffle',
        'shuffled',
        'weightedSample',
        'weightedSampler',
        'sampleWithoutReplacement',
        'samplesWithoutReplacement',
        'sampleWithoutReplacementWithCounts',
        'samplesWithoutReplacementWithCounts',
        'reservoirSample',
      ].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
