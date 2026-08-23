# ulam-prng

Seeded random number generation for generative art.

A PCG generator with excellent statistical properties, plus the higher level
randomness you actually reach for when drawing: weighted choices, sampling,
shuffling, gaussians, perturbed points, and Poisson disk distributions — all
from one seed, so the same seed always draws the same picture.

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
rng.poissonDiskPoints({ minDist: 0.05 }); // 266 evenly-spread points
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
rng.gaussian(); // Standard normal
rng.gaussian({ mean: 100, sd: 15 });
rng.poisson(3); // Count with mean and variance 3
```

## Points

```ts
rng.randomPoint(); // Somewhere in the unit square
rng.randomPoint({ width: 1, height: 0.75 }); // A canvas of that shape
rng.uniformGridPoint({ minX: 0, maxX: 9, minY: 0, maxY: 9 }); // Integer coordinates
rng.perturb({ at: [0.5, 0.5] }); // Nudge by ±0.05 on each axis
rng.perturb({ at: [0.5, 0.5], magnitude: 1 }); // Nudge by ±0.5
```

## Collections

```ts
rng.sample(items); // One element — throws on an empty array
rng.samples(5, items); // Five, with replacement
rng.shuffle(items); // Fisher-Yates, in place
rng.shuffled(items); // A shuffled copy, original untouched
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
