import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { H2, P, PageHeader } from '@/components/docs/Prose'
import { DoProportionDemo, ProportionatelyDemo, RandomOrderDemo } from '@/components/viz/ChoosingDemos'
import { entry } from '@/content/api'

export function Choosing() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Choosing what to do">
        Randomness that runs code: do something some of the time, pick one of several things to do, or do everything in a
        random order.
      </PageHeader>

      <H2 id="sometimes">Sometimes</H2>
      <P>`doProportion` runs something a fraction of the time, and returns whether it ran:</P>
      <CodeBlock code={`rng.doProportion(0.3, () => addHighlight())`} />
      <DoProportionDemo />

      <H2 id="one-of">One of several</H2>
      <P>
        `proportionately` picks one of several weighted options and runs it. Weights are relative, so they need not sum to
        anything in particular. Only the chosen function runs, so each case can draw randomness of its own.
      </P>
      <CodeBlock
        code={`const shape = rng.proportionately([
  [5, () => "circle"], // 50%
  [3, () => "square"], // 30%
  [2, () => "triangle"], // 20%
])`}
      />
      <ProportionatelyDemo />

      <H2 id="random-order">In a random order</H2>
      <P>
        `withRandomOrder` wraps any iteration function so its callbacks fire in a shuffled order. It works with any function
        of the shape `(config, callback: (...args) =&gt; void) =&gt; void`: arguments are collected, shuffled, then replayed.
      </P>
      <CodeBlock
        code={`rng.withRandomOrder(forTiling, { n: 10 }, ([x, y], [w, h]) => {
  drawTile(x, y, w, h)
})`}
      />
      <RandomOrderDemo />

      <H2 id="api">API</H2>
      {['doProportion', 'proportionately', 'withRandomOrder'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
