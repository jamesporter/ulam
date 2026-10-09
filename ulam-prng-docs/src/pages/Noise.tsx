import { ApiEntryCard } from '@/components/docs/ApiEntryCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { H2, P, PageHeader } from '@/components/docs/Prose'
import { NoiseDemo, OctavesDemo } from '@/components/viz/NoiseDemos'
import { entry } from '@/content/api'

export function Noise() {
  return (
    <>
      <PageHeader eyebrow="Randomness" title="Noise">
        Coherent noise: a field that varies smoothly from place to place, so neighbouring points get related values rather
        than independent ones.
      </PageHeader>

      <P>
        This is what you want when something should drift across the canvas rather than jump — a height, a hue, an angle,
        a width.
      </P>
      <CodeBlock
        code={`const noise = rng.perlinNoise() // Gradient noise, the classic
const soft = rng.valueNoise() // Blobbier, and cheaper

noise.at(x * 4) // -1 to 1
noise.at(x * 4, y * 4) // Two dimensions
noise.at(x * 4, y * 4, t) // Three, the last one often time`}
      />
      <NoiseDemo />
      <P>
        Building a field draws a few hundred numbers from the generator; sampling it draws none. It is a fixed landscape,
        so the same point always gives the same value, and multiplying the coordinates is how you zoom in and out of it.
        Points a whole unit apart are unrelated.
      </P>

      <H2 id="fbm">Fractal noise</H2>
      <P>
        `fbm` stacks octaves of a field — each one finer and fainter than the last — into another field, sampled exactly the
        same way, so the configuring is done once rather than at every point:
      </P>
      <CodeBlock
        code={`const hills = noise.fbm({ octaves: 6, lacunarity: 2, gain: 0.5 })
hills.at(x, y) // Detail at every scale, still -1 to 1`}
      />
      <OctavesDemo />

      <H2 id="standalone">Standalone</H2>
      <P>Both are exported standalone as well, taking a source of randomness first:</P>
      <CodeBlock
        code={`import { perlinNoise, valueNoise } from "ulam-prng"

perlinNoise(Math.random).at(0.5, 0.5)`}
      />

      <H2 id="api">API</H2>
      {['perlinNoise', 'valueNoise', 'NoiseField.at', 'NoiseField.fbm', 'NoiseField', 'FbmConfig'].map((id) => (
        <ApiEntryCard key={id} entry={entry(id)} />
      ))}
    </>
  )
}
