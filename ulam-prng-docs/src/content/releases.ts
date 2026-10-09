export type ReleaseSection = {
  title: string
  items: string[]
}

export type Release = {
  version: string
  date: string
  headline: string
  summary: string
  sections: ReleaseSection[]
  /** Not on npm, but worth a word */
  unpublished?: boolean
  highlight?: string
}

/** The history of ulam-prng, newest first. */
export const releases: Release[] = [
  {
    version: '0.4.0',
    date: '2026-08-25',
    headline: 'Seeds with names, streams, noise and walks',
    summary:
      'The biggest release yet: sketches can be named rather than numbered, split into independent streams, saved in a URL, and given smooth noise and wandering paths. Also includes sampling without replacement, which was prepared as 0.3.0.',
    highlight: `const rng = new RNG("sunflower")
const layout = rng.stream("layout")
const colour = rng.stream("colour") // Recolouring leaves the layout alone

const hills = rng.perlinNoise().fbm({ octaves: 6 })
const path = rng.walk({ steps: 200, stepSize: 0.01, momentum: 0.9 })

location.hash = rng.toJSON() // Pick up exactly here later`,
    sections: [
      {
        title: 'Seeding',
        items: [
          'String seeds: `new RNG("sunflower")` hashes the string down to the 64 bits a generator seeds from, so the same name always draws the same picture.',
          '`hashSeed` is exported for anyone who wants the two seed words themselves.',
          'An unseeded generator now takes a full 64 bits from `crypto.getRandomValues` where there is one, rather than 32 from `Math.random`.',
        ],
      },
      {
        title: 'Streams',
        items: [
          '`stream(id)` gives a named generator that depends only on the seed and the name, so adding a layer to a sketch no longer moves the others.',
          '`fork()` takes a fresh, independent generator out of this one, and `split(n)` forks `n` at once.',
        ],
      },
      {
        title: 'Serialisation',
        items: [
          '`toJSON()` gives a 32 character URL safe string carrying the seed and exact position; `RNG.fromJSON()` gives the generator back, streams and all.',
        ],
      },
      {
        title: 'Noise and walks',
        items: [
          '`valueNoise()` and `perlinNoise()` give seeded fields in one, two or three dimensions, bounded to `[-1, 1]`.',
          '`fbm()` on any field stacks octaves into another field of the same shape.',
          '`walk()` makes paths with `momentum`, `drift`, `heading`, `start` and `stepSize`.',
        ],
      },
      {
        title: 'Distributions',
        items: [
          '`dirichlet` for random shares of a whole.',
          '`zipf` for ranks that fall away by a power law, by rejection inversion so the cost does not grow with `n`.',
          '`truncatedGaussian`, sampled by inversion so it costs one draw however narrow the window.',
        ],
      },
      {
        title: 'Collections',
        items: [
          '`sampleWithoutReplacement` and `samplesWithoutReplacement` draw from an array and remove what they draw.',
          '`sampleWithoutReplacementWithCounts` and `samplesWithoutReplacementWithCounts` do the same over `[count, value]` pairs, decrementing the counts.',
          'The plural forms validate before drawing, so a throw leaves the collection untouched.',
        ],
      },
      {
        title: 'Reliability',
        items: [
          'Golden test vectors, checked against an independent BigInt PCG32 over a thousand draws for six seedings, now pin the output sequence. Any change to what an existing seed draws will have to be a deliberate, breaking release.',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-08-24',
    unpublished: true,
    headline: 'Sampling without replacement',
    summary:
      'Prepared on its own branch, but merged alongside the work for 0.4.0 and never published to npm on its own. Everything here shipped in 0.4.0.',
    sections: [
      {
        title: 'Collections',
        items: [
          'Four methods that draw from a collection and take what they draw out of it, so the collection you pass in is the record of what is left.',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-24',
    headline: 'A shelf of distributions, and vectors',
    summary:
      'Expanded the library well beyond gaussian and poisson, and added vector valued randomness. Existing sequences for a given seed were left untouched.',
    highlight: `rng.beta({ alpha: 2, beta: 5 })
rng.logNormal({ sigma: 0.4 })
rng.weightedSample([[5, "circle"], [3, "square"], [2, "triangle"]])

rng.onUnitSphere() // A direction in three dimensions
rng.inUnitDisc({ radius: 3 }) // Uniform by area

import { gamma } from "ulam-prng"
gamma(Math.random, { shape: 2 }) // Any source of randomness`,
    sections: [
      {
        title: 'Distributions',
        items: [
          '`bernoulli`, `exponential`, `logNormal`, `cauchy`, `laplace`, `pareto`, `weibull`, `triangular`, `gamma` (Marsaglia–Tsang), `beta`, `chiSquared`, `studentT`, `binomial`, `geometric` and `categorical`.',
          '`gaussian` and `poisson` moved alongside them unchanged, so sequences for a given seed were not affected.',
        ],
      },
      {
        title: 'Vectors',
        items: [
          '`uniformVec2/3/4` and `gaussianVec2/3/4`.',
          '`onUnitCircle`, `inUnitDisc`, `onUnitSphere` and `inUnitBall`, sampled evenly rather than by normalising a square or by latitude and longitude.',
          '`perturbVec3`, the three dimensional counterpart of `perturb`.',
        ],
      },
      {
        title: 'API',
        items: [
          '`weightedSample`, the value flavoured counterpart of `proportionately`.',
          'Every distribution and vector sampler exported as a standalone function taking any `() => number` source first.',
          'New types: `Vec2`, `Vec3`, `Vec4` and `RandomSource`; `Point2D` and `Vector2D` became aliases of `Vec2`.',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-23',
    headline: 'First release',
    summary:
      'Extracted from solandra: a PCG generator with the higher level helpers generative art reaches for.',
    highlight: `import { RNG } from "ulam-prng"

const rng = new RNG(12345)
rng.number() // Uniform in [0, 1)
rng.sample(["red", "green", "blue"])
rng.gaussian({ mean: 10, sd: 2 })
rng.poissonDiskPoints({ minDist: 0.05 })`,
    sections: [
      {
        title: 'Core',
        items: [
          'A PCG32 generator with 64-bit state: `next`, `number` (53 random bits), unbiased `integer`, and a pre-bound `random`.',
          '`seed`, `getState` and `setState` for moving around the sequence.',
        ],
      },
      {
        title: 'Helpers',
        items: [
          '`uniformRandomInt`, `uniformGridPoint`, `randomPoint`, `randomAngle`, `randomPolarity` and `perturb`.',
          '`sample`, `samples`, `shuffle` and `shuffled`.',
          '`gaussian` and `poisson`.',
          '`doProportion`, `proportionately` and `withRandomOrder`.',
          '`poissonDiskPoints` and `forPoissonDiskPoints`, with the standalone `poissonDiskPoints` and `PoissonDiskSampling` exported too.',
        ],
      },
    ],
  },
]
