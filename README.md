# ulam-prng

Seeded random number generation for generative art.

**[Documentation →](https://ulam-prng.pages.dev/)** — guides, live
visualisations of every distribution, and the full API reference.

A PCG generator with excellent statistical properties, plus the higher level
randomness you actually reach for when drawing: weighted choices, sampling,
shuffling, a shelf of distributions from gaussian to Pareto, random vectors
and directions, points inside shapes, Poisson disk and quasi-random spreads,
coherent noise and random walks — all from one seed, so the same seed always
draws the same picture. Seed it with a string, split it into independent
streams so the parts of a sketch stop disturbing each other, jump around its
sequence, and save its exact position in a URL.

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
twice. Leave it out and it seeds itself with a full 64 bits from the platform's
cryptographic generator, falling back to `Math.random()` where there is not
one.

```ts
new RNG(); // Different every run
new RNG(42); // Reproducible
new RNG("sunflower"); // Any string will do
new RNG(0x12345678, 0x9abcdef0); // Full 64-bit seed
```

A string seed is hashed down to 64 bits, so a sketch can be named rather than
numbered — and the same name always draws the same picture. The hash is
exported if you want the words themselves:

```ts
import { hashSeed } from "ulam-prng";

hashSeed("sunflower"); // [98175459, 3357136283]
```

It is well mixed, so near neighbours are not: `"tree"` and `"tres"` give
unrelated seeds, and unrelated pictures.

You can move a generator around its sequence after construction:

```ts
rng.seed(42); // Re-seed in place, keeping references valid

const state = rng.getState(); // [number, number, number, number]
rng.number();
rng.setState(state); // Rewind exactly
```

`skip(n)` jumps `n` draws along the sequence without making them, in time
proportional to `log n`, and a negative `n` jumps back. A draw is one call to
`next()`; `number()` takes two.

```ts
rng.skip(1_000_000); // As if next() had been called a million times
rng.skip(-2).next(); // The draw before last, again
```

## Streams

One seed, several independent generators. The point is that randomness drawn
in one place stops disturbing randomness drawn in another: change how many
petals you draw, and the palette stays exactly where it was.

`stream(id)` gives a named generator derived from the seed. It depends only on
the seed and the name — not on how far along the parent happens to be — so the
layer you ask for is the same layer however much drawing came before it:

```ts
const rng = new RNG("sunflower");

const layout = rng.stream("layout");
const colour = rng.stream("colour");
const texture = rng.stream("texture"); // Adding this moves neither of the others
```

Streams nest, so a component handed `layout` can name streams of its own
without colliding with anything above it:

```ts
layout.stream("colour"); // Its own generator, unrelated to rng.stream("colour")
```

`fork()` takes a fresh generator out of this one, advancing it by four draws.
Because the child has its own seed and its own stream, it can draw as much as
it likes without shifting the parent's sequence — which is what makes it safe
to hand one to something whose appetite for random numbers you do not control:

```ts
for (const petal of petals) drawPetal(petal, rng.fork()); // Each petal, reproducibly

const [background, foreground] = rng.split(2); // n forks at once
```

Reach for `stream` when the parts of a sketch have names, and `fork` when
there are simply a lot of them.

## Saving where you are

A generator serialises to a 32 character URL safe string carrying its seed and
its exact position in the stream, so a picture can be saved, linked to, or
picked up again later:

```ts
location.hash = rng.toJSON(); // "BdoJ48gZ1ZtXbRYS2XPecRQFe373Z4FP"

const restored = RNG.fromJSON(location.hash.slice(1)); // Carries on where it left off
```

It is called `toJSON` so `JSON.stringify` finds it on its own, wherever a
generator sits inside something larger being saved. Streams come back with it:
a restored generator's `stream("colour")` is the one it always was.

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

| Method                            |                                                          |
| --------------------------------- | -------------------------------------------------------- |
| `gaussian({ mean, sd })`          | Normal; the default is standard normal                   |
| `logNormal({ mu, sigma })`        | Positive and right skewed; good for sizes                |
| `exponential({ rate })`           | Waiting time between events, mean `1 / rate`             |
| `laplace({ mean, scale })`        | A sharp peak with fatter tails than a gaussian           |
| `cauchy({ median, scale })`       | Heavy tailed enough to have no mean at all               |
| `pareto({ shape, scale })`        | A power law: at least `scale`, occasionally enormous     |
| `weibull({ shape, scale })`       | Exponential at `shape` 1, a hump above it                |
| `triangular({ min, max, mode })`  | Bounded, peaking at `mode`                               |
| `gamma({ shape, scale })`         | Positive, mean `shape * scale`                           |
| `beta({ alpha, beta })`           | A proportion in `[0, 1]`                                 |
| `chiSquared(df)`                  | Sum of `df` squared normals                              |
| `studentT(df)`                    | A gaussian with heavier tails                            |
| `truncatedGaussian({ min, max })` | Normal, confined to bounds rather than clamped to them   |
| `vonMises({ mean, kappa })`       | An angle clustered about a heading; a circular gaussian  |
| `dirichlet(alpha)`                | Shares of a whole, one per concentration, summing to one |

And the discrete ones:

| Method                  |                                         |
| ----------------------- | --------------------------------------- |
| `bernoulli(p)`          | `true` with probability `p`             |
| `binomial({ n, p })`    | How many of `n` trials succeed          |
| `geometric(p)`          | Failures before the first success       |
| `poisson(lambda)`       | A count with mean and variance `lambda` |
| `categorical(weights)`  | An index, in proportion to the weights  |
| `zipf({ n, exponent })` | A rank from 1 to `n`, by a power law    |

```ts
rng.gaussian({ mean: 100, sd: 15 }); // 103.39...
rng.logNormal({ sigma: 0.4 }); // 1.08... — mostly small, sometimes large
rng.beta({ alpha: 2, beta: 5 }); // 0.38... — usually a smallish fraction
rng.poisson(3); // 1
rng.binomial({ n: 10, p: 0.5 }); // 3
rng.categorical([5, 3, 2]); // 0 half the time, 1 a third, 2 a fifth
```

`truncatedGaussian` draws from the part of the bell inside the bounds, rather
than drawing wide and clamping — which would pile values up on the ends. It
costs one draw however narrow the window, so it still works far out in the
tail, where rejecting until something lands would never finish:

```ts
rng.truncatedGaussian({ mean: 0.5, sd: 0.2, min: 0, max: 1 }); // 0.61...
rng.truncatedGaussian({ min: 0 }); // The positive half of a standard normal
```

`dirichlet` splits one thing into random parts — an area, a palette, a budget.
Concentrations below one usually give most of it to a single share, above one
even the shares out:

```ts
rng.dirichlet([1, 1, 1]); // [0.17..., 0.56..., 0.27...] — sums to 1
rng.dirichlet([8, 8, 8]); // Three near equal thirds
```

`zipf` gives a rank, where the first is the most likely, the second about half
as likely, and the tail is long but bounded — how sizes tend to fall when they
follow an order:

```ts
rng.zipf({ n: 100 }); // Mostly 1 and 2, occasionally far down the list
rng.zipf({ n: 100, exponent: 2 }); // Falls away faster still
```

`vonMises` is the gaussian for things that wrap round: headings, orientations,
hue offsets. `kappa` is the concentration — 0 gives any direction at all, and
larger values bunch the angles ever tighter about `mean`:

```ts
rng.vonMises({ mean: Math.PI / 2, kappa: 4 }); // Mostly pointing up
rng.vonMises({ kappa: 0 }); // Any direction
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

Uniformly random points inside shapes, all uniform by area:

```ts
rng.inTriangle([0, 0], [1, 0], [0.5, 1]); // Always two draws
rng.inPolygon([
  [0, 0],
  [1, 0],
  [1, 1],
  [0.5, 0.4],
  [0, 1],
]); // Convex or not
rng.inAnnulus({ inner: 0.8 }); // A ring just inside the unit circle
```

`pointInPolygon(point, vertices)` is exported alongside them, as the test to
hand Poisson disk sampling when it should fill a shape.

## Vectors

`Vec2`, `Vec3` and `Vec4` are plain tuples — `[number, number]` and friends —
so they drop straight into whatever you already use for geometry.

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

rng.reservoirSample(10, readLines()); // Ten items from any iterable, in one pass
```

When the weights are fixed and you draw from them thousands of times,
`weightedSampler` builds an alias table once, after which each draw costs the
same however many values there are:

```ts
const colour = rng.weightedSampler([
  [5, "ink"],
  [3, "rust"],
  [1, "gold"],
]);
for (const p of points) drawDot(p, colour());
```

### Without replacement

These draw from the collection you hand them and **take what they draw out of
it**, so that collection is the record of what is left — the way `shuffle`
works in place. Pass a copy if you want to keep the original:

```ts
const deck = [1, 2, 3, 4, 5, 6];

rng.sampleWithoutReplacement(deck); // One element, now gone from deck
rng.samplesWithoutReplacement(2, deck); // Two more, all distinct; three left
rng.samplesWithoutReplacement(3, [...deck]); // Leaves deck alone
```

The `WithCounts` pair is the same idea over `[count, value]` pairs: the
without replacement counterpart of `weightedSample`. Counts say how many of
each thing there are, so unlike weights they must be non-negative integers,
and every draw decrements the count it came from:

```ts
const bag: [number, string][] = [
  [3, "circle"],
  [2, "square"],
  [1, "triangle"],
];

rng.sampleWithoutReplacementWithCounts(bag); // "square", so bag is now [[3, "circle"], [1, "square"], [1, "triangle"]]
rng.samplesWithoutReplacementWithCounts(5, bag); // The other five, in a random order
```

Both throw if you ask for more than is left.

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

`minDist` can be a function of position, for density that varies across the
canvas: neighbours keep the average of their two spacings apart, and `maxDist`
says how large the function can get. `contains` confines the points to a
shape, including shapes in several separate pieces:

```ts
const noise = rng.simplexNoise();

rng.poissonDiskPoints({
  minDist: ([x, y]) => 0.01 + 0.02 * (noise.at(x * 3, y * 3) + 1),
  maxDist: 0.05,
});

rng.poissonDiskPoints({
  minDist: 0.02,
  contains: (p) => pointInPolygon(p, outline),
});
```

For cheaper even spreads, a jittered grid puts one random point in every cell,
and a quasi-random (low discrepancy) sequence fills the region in an order that
never leaves a gap:

```ts
rng.jitteredGridPoints({ columns: 20 }); // 400 points, one per cell
rng.jitteredGridPoints({ columns: 20, jitter: 0.3 }); // A grid, roughened
rng.quasiRandomPoints({ n: 400 }); // Roberts' R2 sequence
rng.quasiRandomPoints({ n: 400, sequence: "halton" }); // The classic
```

The quasi-random sequences are fixed, randomised by one offset shared by every
point, so they cost two draws however many points you take.

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

## Noise

Coherent noise: a field that varies smoothly from place to place, so
neighbouring points get related values rather than independent ones. This is
what you want when something should drift across the canvas rather than jump —
a height, a hue, an angle, a width.

```ts
const noise = rng.perlinNoise(); // Gradient noise, the classic
const even = rng.simplexNoise(); // Perlin's successor: no grid-aligned streaks
const soft = rng.valueNoise(); // Blobbier, and cheaper

noise.at(x * 4); // -1 to 1
noise.at(x * 4, y * 4); // Two dimensions
noise.at(x * 4, y * 4, t); // Three, the last one often time
```

Building a field draws a few hundred numbers from the generator; sampling it
draws none. It is a fixed landscape, so the same point always gives the same
value, and multiplying the coordinates is how you zoom in and out of it.

`fbm` stacks octaves of a field — each one finer and fainter than the last —
into another field, sampled exactly the same way, so the configuring is done
once rather than at every point:

```ts
const hills = noise.fbm({ octaves: 6, lacunarity: 2, gain: 0.5 });
hills.at(x, y); // Detail at every scale, still -1 to 1
```

All three are exported standalone as well, taking a source of randomness first:

```ts
import { perlinNoise, simplexNoise, valueNoise } from "ulam-prng";

simplexNoise(Math.random).at(0.5, 0.5);
```

## Random walks

A path whose steps remember where the last one went.

```ts
for (const [x, y] of rng.walk({ steps: 200, stepSize: 0.01, momentum: 0.9 })) {
  lineTo(x, y);
}
```

`momentum` is what makes it a walk rather than a scatter: at 0 every step heads
off independently, giving the jagged path of Brownian motion, and nearer 1 the
line turns slowly and keeps going the way it was going. `drift` adds a constant
nudge on top, for a current the walk is carried along by, and `heading` points
the first step; `start` and `stepSize` do what they say. The path comes back
one point longer than the number of steps, since it includes where it began.

```ts
rng.walk({ steps: 500, momentum: 0.97, drift: [0.5, 0] }); // A wandering current
rng.walk({ steps: 50, heading: 0 }); // Sets off due east
```

## Documentation

The full documentation lives at
**[ulam-prng.pages.dev](https://ulam-prng.pages.dev/)**: a guide to each part of
the library with interactive examples, an explorer for every distribution, the
[API reference](https://ulam-prng.pages.dev/api) and the
[release notes](https://ulam-prng.pages.dev/releases).

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
