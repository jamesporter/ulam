# ulam-prng

Seeded random number generation for generative art.

A PCG generator with excellent statistical properties, plus the higher level
randomness you actually reach for when drawing: weighted choices, sampling,
shuffling, a shelf of distributions from gaussian to Pareto, random vectors
and directions, perturbed points, and Poisson disk distributions — all from
one seed, so the same seed always draws the same picture.

Initially extracted from [solandra](https://github.com/jamesporter/solandra) though may diverge in future.

Named for Stanisław Ulam, who invented the Monte Carlo method while playing
solitaire in a hospital bed and wondering what the odds actually were.

```ts
import { RNG } from "ulam-prng";

const rng = new RNG(12345);

rng.number(); // 0.0327... — uniform in [0, 1)
rng.randomAngle(); // 0.5008... — radians, 0 to 2π
rng.sample(["red", "green", "blue"]); // "green"
rng.gaussian({ mean: 10, sd: 2 }); // 9.0601...
rng.onUnitCircle(); // [0.3717..., 0.9284...] — a random direction
rng.poissonDiskPoints({ minDist: 0.05 }); // 271 evenly-spread points
```

## Install

```sh
pnpm add ulam-prng
```

TypeScript types are included. ESM only.

## Seeding

`RNG` takes a seed; give it the same one twice and you get the same sequence
twice. Leave it out and it seeds itself from `Math.random()`.

```ts
new RNG(); // Different every run
new RNG(42); // Reproducible
new RNG(0x12345678, 0x9abcdef0); // Full 64-bit seed
```

You can move a generator around its stream after construction:

```ts
rng.seed(42); // Re-seed in place, keeping references valid

const state = rng.getState(); // [number, number, number, number]
rng.number();
rng.setState(state); // Rewind exactly
```

## The core

| Method         |                                                                       |
| -------------- | --------------------------------------------------------------------- |
| `number()`     | Uniform double in `[0, 1)`, with all 53 mantissa bits randomised      |
| `random`       | Pre-bound alias of `number()`, for passing as a `() => number`        |
| `integer(max)` | Uniform integer in `[0, max)`, rejection sampled so it stays unbiased |
| `next()`       | The raw PCG output: a uniform 32-bit unsigned integer                 |

## Numbers

```ts
rng.uniformRandomInt({ to: 6 }); // 0 to 6, inclusive
rng.uniformRandomInt({ from: 1, to: 7, inclusive: false }); // 1 to 6
rng.randomPolarity(); // 1 or -1
rng.bernoulli(0.3); // true 30% of the time
```

## Distributions

The continuous ones:

| Method                           |                                                      |
| -------------------------------- | ---------------------------------------------------- |
| `gaussian({ mean, sd })`         | Normal; the default is standard normal               |
| `logNormal({ mu, sigma })`       | Positive and right skewed; good for sizes            |
| `exponential({ rate })`          | Waiting time between events, mean `1 / rate`         |
| `laplace({ mean, scale })`       | A sharp peak with fatter tails than a gaussian       |
| `cauchy({ median, scale })`      | Heavy tailed enough to have no mean at all           |
| `pareto({ shape, scale })`       | A power law: at least `scale`, occasionally enormous |
| `weibull({ shape, scale })`      | Exponential at `shape` 1, a hump above it            |
| `triangular({ min, max, mode })` | Bounded, peaking at `mode`                           |
| `gamma({ shape, scale })`        | Positive, mean `shape * scale`                       |
| `beta({ alpha, beta })`          | A proportion in `[0, 1]`                             |
| `chiSquared(df)`                 | Sum of `df` squared normals                          |
| `studentT(df)`                   | A gaussian with heavier tails                        |

And the discrete ones:

| Method                 |                                         |
| ---------------------- | --------------------------------------- |
| `bernoulli(p)`         | `true` with probability `p`             |
| `binomial({ n, p })`   | How many of `n` trials succeed          |
| `geometric(p)`         | Failures before the first success       |
| `poisson(lambda)`      | A count with mean and variance `lambda` |
| `categorical(weights)` | An index, in proportion to the weights  |

```ts
rng.gaussian({ mean: 100, sd: 15 }); // 103.39...
rng.logNormal({ sigma: 0.4 }); // 1.08... — mostly small, sometimes large
rng.beta({ alpha: 2, beta: 5 }); // 0.38... — usually a smallish fraction
rng.poisson(3); // 1
rng.binomial({ n: 10, p: 0.5 }); // 3
rng.categorical([5, 3, 2]); // 0 half the time, 1 a third, 2 a fifth
```

Every one of these is exported as a standalone function too, taking any source
of uniform randomness as its first argument:

```ts
import { gamma, weibull } from "ulam-prng";

gamma(Math.random, { shape: 2, scale: 0.5 });
weibull(rng.random, { shape: 8 });
```

## Points

```ts
rng.randomPoint(); // Somewhere in the unit square
rng.randomPoint({ width: 1, height: 0.75 }); // A canvas of that shape
rng.uniformGridPoint({ minX: 0, maxX: 9, minY: 0, maxY: 9 }); // Integer coordinates
rng.perturb({ at: [0.5, 0.5] }); // Nudge by ±0.05 on each axis
rng.perturb({ at: [0.5, 0.5], magnitude: 1 }); // Nudge by ±0.5
```

## Vectors

`Vec2`, `Vec3` and `Vec4` are plain tuples — `[number, number]` and friends —
so they drop straight into whatever you already use for geometry. `Point2D`
is an alias of `Vec2`.

```ts
import type { Vec2, Vec3, Vec4 } from "ulam-prng";

rng.uniformVec2(); // In the unit square
rng.uniformVec3({ from: -1, to: 1 }); // In a cube around the origin
rng.uniformVec4(); // Four independent components

rng.gaussianVec2({ mean: [0.5, 0.5], sd: 0.1 }); // A round blur
rng.gaussianVec3({ sd: 2 }); // A spherical one
rng.gaussianVec4();

rng.perturbVec3({ at: [0.5, 0.5, 0.5], magnitude: 0.2 });
```

Directions and interiors, sampled evenly — not by normalising a point from a
square (which favours the diagonals), and not by latitude and longitude (which
crowds the poles):

```ts
rng.onUnitCircle(); // A direction: [0.9789..., 0.2042...]
rng.inUnitDisc({ radius: 3 }); // Uniform by area, so no clump in the middle
rng.onUnitSphere(); // A direction in three dimensions
rng.inUnitBall(); // Uniform by volume
```

These are all exported standalone as well, taking a source of randomness
first:

```ts
import { inUnitDisc, onUnitSphere } from "ulam-prng";

inUnitDisc(Math.random, { radius: 0.5 });
onUnitSphere(rng.random);
```

## Collections

```ts
rng.sample(items); // One element — throws on an empty array
rng.samples(5, items); // Five, with replacement
rng.shuffle(items); // Fisher-Yates, in place
rng.shuffled(items); // A shuffled copy, original untouched

rng.weightedSample([
  [5, "circle"],
  [3, "square"],
  [2, "triangle"],
]); // Values in proportion to their weights
```

## Choosing what to do

`doProportion` runs something a fraction of the time, and returns whether it
ran:

```ts
rng.doProportion(0.3, () => addHighlight());
```

`proportionately` picks one of several weighted options and runs it. Weights
are relative, so they need not sum to anything in particular:

```ts
const shape = rng.proportionately([
  [5, () => "circle"], // 50%
  [3, () => "square"], // 30%
  [2, () => "triangle"], // 20%
]);
```

`withRandomOrder` wraps any iteration function so its callbacks fire in a
shuffled order — useful when the drawing order itself is doing visual work:

```ts
rng.withRandomOrder(forTiling, { n: 10 }, ([x, y], [w, h]) => {
  drawTile(x, y, w, h);
});
```

It works with any function of the shape
`(config, callback: (...args) => void) => void`; arguments are collected,
shuffled, then replayed.

## Poisson disk points

Points scattered at random but never closer together than `minDist`. Far more
even, and far better looking, than uniformly random placement — this is what
you want for stipples, dots, and seed points.

```ts
for (const [x, y] of rng.poissonDiskPoints({ minDist: 0.05 })) {
  drawDot(x, y);
}

rng.forPoissonDiskPoints({ minDist: 0.05, height: 0.75 }, ([x, y], i) => {
  drawDot(x, y, i);
});
```

`width` and `height` default to 1, and `attempts` (how hard the sampler tries
to place each point, so how tightly it packs) defaults to 30.

The underlying implementation of Bridson's algorithm is exported too, if you
want to drive it from some other source of randomness:

```ts
import { poissonDiskPoints, PoissonDiskSampling } from "ulam-prng";

poissonDiskPoints({
  width: 1,
  height: 1,
  minDist: 0.05,
  rng: () => Math.random(),
  k: 30,
});
```

## Development

```sh
pnpm install
pnpm test # vitest
pnpm typecheck
pnpm lint # oxlint
pnpm format # oxfmt
pnpm build # tsc -> dist/
```

## License

MIT
