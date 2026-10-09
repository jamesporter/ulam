import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { H2, P, PageHeader } from '@/components/docs/Prose'
import { WalkDemo } from '@/components/viz/WalkDemo'
import { entry } from '@/content/api'

export function Walks() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Random walks">
        A path whose steps remember where the last one went.
      </PageHeader>

      <CodeBlock
        code={`for (const [x, y] of rng.walk({ steps: 200, stepSize: 0.01, momentum: 0.9 })) {
  lineTo(x, y)
}`}
      />
      <WalkDemo />

      <H2 id="momentum">Momentum and drift</H2>
      <P>
        `momentum` is what makes it a walk rather than a scatter: at 0 every step heads off independently, giving the
        jagged path of Brownian motion, and nearer 1 the line turns slowly and keeps going the way it was going. `drift`
        adds a constant nudge on top, for a current the walk is carried along by, and `heading` points the first step;
        `start` and `stepSize` do what they say.
      </P>
      <CodeBlock
        code={`rng.walk({ steps: 500, momentum: 0.97, drift: [0.5, 0] }) // A wandering current
rng.walk({ steps: 50, heading: 0 }) // Sets off due east`}
      />
      <P>The path comes back one point longer than the number of steps, since it includes where it began.</P>

      <H2 id="api">API</H2>
      {['walk', 'WalkConfig'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
