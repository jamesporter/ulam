import { distributions, type Option } from './distributions'

/**
 * Every export of ulam-prng, and every method of `RNG`, documented once and
 * rendered both in the guides and on the API reference page.
 */
export type ApiKind = 'constructor' | 'method' | 'static' | 'property' | 'function' | 'class' | 'type'

export type ApiEntry = {
  /** Anchor on its page, and key in {@link api} */
  id: string
  name: string
  kind: ApiKind
  signature: string
  summary: string
  details?: string[]
  params?: Option[]
  returns?: string
  throws?: string[]
  example?: string
  /** The release that introduced it */
  since: string
  /** The guide page that covers it */
  page: string
}

export type ApiGroup = {
  title: string
  page: string
  blurb: string
  entries: ApiEntry[]
}

const m = (e: Omit<ApiEntry, 'kind'> & { kind?: ApiKind }): ApiEntry => ({ kind: 'method', ...e })

const seeding: ApiEntry[] = [
  {
    id: 'constructor',
    name: 'new RNG',
    kind: 'constructor',
    signature: 'new RNG(seed?: number | string, seedLo?: number, incHi?: number, incLo?: number)',
    summary:
      'Creates a seeded PCG generator. The same seed always gives the same sequence, and so the same picture.',
    details: [
      'A string seed is hashed down to 64 bits with [`hashSeed`](#hashSeed), so any word will do. A single number is the low 32 bits of the seed; pass two for the full 64.',
      'Given no seed at all it takes a full 64 bits from `crypto.getRandomValues`, falling back to `Math.random` where there is no cryptographic generator.',
    ],
    params: [
      { name: 'seed', type: 'number | string', default: 'random', description: 'A string, or the high 32 bits of a numeric seed (the low 32 bits if `seedLo` is left out)' },
      { name: 'seedLo', type: 'number', description: 'The low 32 bits of the seed; ignored when `seed` is a string' },
      { name: 'incHi', type: 'number', default: 'PCG default', description: 'High 32 bits of the stream increment; best left alone' },
      { name: 'incLo', type: 'number', default: 'PCG default', description: 'Low 32 bits of the stream increment; best left alone' },
    ],
    example: `new RNG() // Different every run
new RNG(42) // Reproducible
new RNG("sunflower") // Any string will do
new RNG(0x12345678, 0x9abcdef0) // Full 64-bit seed`,
    since: '0.1.0',
    page: '/docs/seeding',
  },
  m({
    id: 'seed',
    name: 'seed',
    signature: 'seed(seed?: number | string, seedLo?: number, incHi?: number, incLo?: number): void',
    summary:
      'Re-seeds the generator in place, discarding its position. The same as constructing a fresh `RNG` with these arguments, but keeps references to this instance valid.',
    example: `rng.seed(42) // Back to a known starting point
rng.seed("sunflower") // Or a memorable one`,
    since: '0.1.0',
    page: '/docs/seeding',
  }),
  m({
    id: 'getState',
    name: 'getState',
    signature: 'getState(): RNGState',
    summary: 'The four 32-bit words that fully describe where the generator is in its sequence.',
    returns: '`[stateHi, stateLo, incHi, incLo]`',
    example: `const state = rng.getState()
rng.number()
rng.setState(state) // Rewind exactly`,
    since: '0.1.0',
    page: '/docs/seeding',
  }),
  m({
    id: 'setState',
    name: 'setState',
    signature: 'setState(state: RNGState): void',
    summary: 'Restores a position saved with `getState`, so the generator repeats exactly what it drew from there.',
    since: '0.1.0',
    page: '/docs/seeding',
  }),
  {
    id: 'hashSeed',
    name: 'hashSeed',
    kind: 'function',
    signature: 'hashSeed(seed: string): [number, number]',
    summary:
      'Hashes a string into the two 32-bit words `[hi, lo]` a generator seeds from — what `new RNG("…")` does internally.',
    details: [
      'Deterministic across runs and platforms, and well mixed: strings as close as `"tree"` and `"tres"` give unrelated seeds. It is a hash for seeding, not for security.',
    ],
    example: `import { hashSeed, RNG } from "ulam-prng"

const [hi, lo] = hashSeed("sunflower") // [98175459, 3357136283]
new RNG(hi, lo) // The same generator as new RNG("sunflower")`,
    since: '0.4.0',
    page: '/docs/seeding',
  },
]

const streams: ApiEntry[] = [
  m({
    id: 'stream',
    name: 'stream',
    signature: 'stream(id: number | string): RNG',
    summary:
      'A named generator derived from this one’s seed: an independent sequence that depends only on the seed and the `id`, not on how far along this generator is.',
    details: [
      'So the layer you ask for is the same layer however much drawing came before it, and adding a stream leaves the others exactly as they were.',
      'Streams nest: `rng.stream("petals").stream("colour")` is unrelated to `rng.stream("colour")`. A numeric `id` is hashed as its decimal string, so `stream(5)` and `stream("5")` are the same.',
    ],
    example: `const rng = new RNG("sunflower")
const layout = rng.stream("layout")
const colour = rng.stream("colour")
// Recolouring now leaves the layout exactly where it was`,
    since: '0.4.0',
    page: '/docs/streams',
  }),
  m({
    id: 'fork',
    name: 'fork',
    signature: 'fork(): RNG',
    summary:
      'A fresh, independent generator seeded from this one, advancing this one by four draws. However much the child draws, the parent’s sequence is unaffected.',
    example: `for (const petal of petals) drawPetal(petal, rng.fork())`,
    since: '0.4.0',
    page: '/docs/streams',
  }),
  m({
    id: 'split',
    name: 'split',
    signature: 'split(n: number): RNG[]',
    summary: '`n` independent generators, by forking this one `n` times.',
    throws: ['if `n` is not a non-negative integer'],
    example: `const [background, foreground] = rng.split(2)`,
    since: '0.4.0',
    page: '/docs/streams',
  }),
]

const serialisation: ApiEntry[] = [
  m({
    id: 'toJSON',
    name: 'toJSON',
    signature: 'toJSON(): string',
    summary:
      'The generator as a 32 character URL safe string, carrying its seed and its exact position. Named so that `JSON.stringify` finds it on its own.',
    example: `location.hash = rng.toJSON() // "BdoJ48gZ1ZtXbRYS2XPecRQFe373Z4FP"`,
    since: '0.4.0',
    page: '/docs/serialisation',
  }),
  {
    id: 'fromJSON',
    name: 'RNG.fromJSON',
    kind: 'static',
    signature: 'static fromJSON(serialised: string): RNG',
    summary:
      'The generator a `toJSON` string came from: the same seed, at the same place in the same sequence, with its streams intact.',
    throws: ['if the string is not one `toJSON` produced'],
    example: `const rng = RNG.fromJSON(location.hash.slice(1))`,
    since: '0.4.0',
    page: '/docs/serialisation',
  },
]

const numbers: ApiEntry[] = [
  m({
    id: 'number',
    name: 'number',
    signature: 'number(): number',
    summary: 'A uniform double in `[0, 1)`, with all 53 mantissa bits randomised.',
    example: `rng.number() // 0.0 to 1.0
rng.number() * 100 + 50 // 50 to 150`,
    since: '0.1.0',
    page: '/docs/numbers',
  }),
  {
    id: 'random',
    name: 'random',
    kind: 'property',
    signature: 'random: () => number',
    summary:
      'A pre-bound alias of `number()`, to hand straight to anything wanting a `() => number` — including every standalone function in this library.',
    example: `someLibrary({ rng: rng.random })
gamma(rng.random, { shape: 2 })`,
    since: '0.1.0',
    page: '/docs/numbers',
  },
  m({
    id: 'integer',
    name: 'integer',
    signature: 'integer(max: number): number',
    summary: 'A uniform integer in `[0, max)`, rejection sampled so it stays unbiased for any `max`.',
    details: ['A `max` of zero (or none) gives the raw 32-bit output of `next()`.'],
    example: `rng.integer(6) + 1 // A dice roll
rng.integer(items.length) // An index`,
    since: '0.1.0',
    page: '/docs/numbers',
  }),
  m({
    id: 'next',
    name: 'next',
    signature: 'next(): number',
    summary: 'The raw PCG output: a uniform 32-bit unsigned integer. Everything else is built on it.',
    returns: 'An integer from 0 to 4294967295',
    since: '0.1.0',
    page: '/docs/numbers',
  }),
  m({
    id: 'uniformRandomInt',
    name: 'uniformRandomInt',
    signature: 'uniformRandomInt(config: { from?: number; to: number; inclusive?: boolean }): number',
    summary: 'A uniform integer between bounds. The lower bound defaults to 0, and the upper bound is inclusive unless you say otherwise.',
    params: [
      { name: 'from', type: 'number', default: '0', description: 'Lower bound, inclusive' },
      { name: 'to', type: 'number', description: 'Upper bound' },
      { name: 'inclusive', type: 'boolean', default: 'true', description: 'Whether `to` can come up' },
    ],
    example: `rng.uniformRandomInt({ to: 6 }) // 0 to 6, inclusive
rng.uniformRandomInt({ from: 1, to: 7, inclusive: false }) // 1 to 6`,
    since: '0.1.0',
    page: '/docs/numbers',
  }),
  m({
    id: 'randomAngle',
    name: 'randomAngle',
    signature: 'randomAngle(): number',
    summary: 'A uniform angle in radians, from 0 up to 2π.',
    since: '0.1.0',
    page: '/docs/numbers',
  }),
  m({
    id: 'randomPolarity',
    name: 'randomPolarity',
    signature: 'randomPolarity(): 1 | -1',
    summary: 'A coin toss that comes up `1` or `-1`, for flipping directions and signs.',
    since: '0.1.0',
    page: '/docs/numbers',
  }),
]

const distributionEntries: ApiEntry[] = distributions.map((d) =>
  m({
    id: d.method,
    name: d.method,
    signature: d.signature,
    summary: d.tagline,
    details: d.description,
    params: d.options,
    returns: d.returns,
    throws: d.throws,
    example: `rng.${d.call(Object.fromEntries(d.controls.map((c) => [c.key, c.default])))}`,
    since: ['gaussian', 'poisson'].includes(d.method)
      ? '0.1.0'
      : ['dirichlet', 'zipf', 'truncatedGaussian'].includes(d.method)
        ? '0.4.0'
        : '0.2.0',
    page: `/docs/distributions/${d.id}`,
  }),
)

const points: ApiEntry[] = [
  m({
    id: 'randomPoint',
    name: 'randomPoint',
    signature: 'randomPoint(config?: { width?: number; height?: number }): Point2D',
    summary: 'A uniform point in a rectangle, by default the unit square.',
    params: [
      { name: 'width', type: 'number', default: '1', description: 'Width of the region' },
      { name: 'height', type: 'number', default: '1', description: 'Height of the region' },
    ],
    example: `rng.randomPoint() // Somewhere in the unit square
rng.randomPoint({ width: 1, height: 0.75 }) // A canvas of that shape`,
    since: '0.1.0',
    page: '/docs/points',
  }),
  m({
    id: 'uniformGridPoint',
    name: 'uniformGridPoint',
    signature: 'uniformGridPoint(config: { minX: number; maxX: number; minY: number; maxY: number }): Point2D',
    summary: 'A random point with integer coordinates; all four bounds are inclusive.',
    example: `rng.uniformGridPoint({ minX: 0, maxX: 9, minY: 0, maxY: 9 })`,
    since: '0.1.0',
    page: '/docs/points',
  }),
  m({
    id: 'perturb',
    name: 'perturb',
    signature: 'perturb(config: { at: Point2D; magnitude?: number }): Point2D',
    summary:
      'Nudges a point by a uniform amount on each axis: by default ±0.05, and generally ±`magnitude / 2`.',
    params: [
      { name: 'at', type: 'Point2D', description: 'The point to move' },
      { name: 'magnitude', type: 'number', default: '0.1', description: 'The width of the window each coordinate can move within' },
    ],
    example: `rng.perturb({ at: [0.5, 0.5] }) // Nudge by ±0.05 on each axis
rng.perturb({ at: [0.5, 0.5], magnitude: 1 }) // Nudge by ±0.5`,
    since: '0.1.0',
    page: '/docs/points',
  }),
  m({
    id: 'poissonDiskPoints',
    name: 'poissonDiskPoints',
    signature: 'poissonDiskPoints(config: { minDist: number; width?: number; height?: number; attempts?: number }): Point2D[]',
    summary:
      'Points scattered at random but never closer together than `minDist`: far more even, and far better looking, than uniform placement.',
    params: [
      { name: 'minDist', type: 'number', description: 'The closest any two points may be' },
      { name: 'width', type: 'number', default: '1', description: 'Width of the region' },
      { name: 'height', type: 'number', default: '1', description: 'Height of the region' },
      { name: 'attempts', type: 'number', default: '30', description: 'Tries to place each new point; higher packs tighter' },
    ],
    throws: ['if the width, height or `minDist` is not positive'],
    example: `for (const [x, y] of rng.poissonDiskPoints({ minDist: 0.05 })) {
  drawDot(x, y)
}`,
    since: '0.1.0',
    page: '/docs/points',
  }),
  m({
    id: 'forPoissonDiskPoints',
    name: 'forPoissonDiskPoints',
    signature:
      'forPoissonDiskPoints(config: { minDist: number; width?: number; height?: number; attempts?: number }, callback: (at: Point2D, i: number) => void): void',
    summary: 'Runs a callback for each Poisson disk point, with its index.',
    example: `rng.forPoissonDiskPoints({ minDist: 0.05, height: 0.75 }, ([x, y], i) => {
  drawDot(x, y, i)
})`,
    since: '0.1.0',
    page: '/docs/points',
  }),
]

const vectors: ApiEntry[] = [
  m({
    id: 'uniformVec2',
    name: 'uniformVec2',
    signature: 'uniformVec2(config?: UniformVecConfig): Vec2',
    summary: 'A uniform `[x, y]`, each component in `[from, to)` — by default the unit square.',
    params: [
      { name: 'from', type: 'number', default: '0', description: 'Lower bound of every component' },
      { name: 'to', type: 'number', default: '1', description: 'Upper bound of every component' },
    ],
    example: `rng.uniformVec2() // In the unit square
rng.uniformVec2({ from: -1, to: 1 })`,
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'uniformVec3',
    name: 'uniformVec3',
    signature: 'uniformVec3(config?: UniformVecConfig): Vec3',
    summary: 'A uniform `[x, y, z]`, by default in the unit cube.',
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'uniformVec4',
    name: 'uniformVec4',
    signature: 'uniformVec4(config?: UniformVecConfig): Vec4',
    summary: 'A uniform `[x, y, z, w]`, by default in the unit hypercube.',
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'gaussianVec2',
    name: 'gaussianVec2',
    signature: 'gaussianVec2(config?: GaussianVecConfig<Vec2>): Vec2',
    summary: 'Independent normal components about `mean`: a round blur.',
    params: [
      { name: 'mean', type: 'Vec2', default: '[0, 0]', description: 'The centre of the blur' },
      { name: 'sd', type: 'number', default: '1', description: 'Standard deviation of every component' },
    ],
    example: `rng.gaussianVec2({ mean: [0.5, 0.5], sd: 0.1 })`,
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'gaussianVec3',
    name: 'gaussianVec3',
    signature: 'gaussianVec3(config?: GaussianVecConfig<Vec3>): Vec3',
    summary: 'Independent normal components about `mean`: a spherical blur.',
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'gaussianVec4',
    name: 'gaussianVec4',
    signature: 'gaussianVec4(config?: GaussianVecConfig<Vec4>): Vec4',
    summary: 'Four independent normal components about `mean`.',
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'onUnitCircle',
    name: 'onUnitCircle',
    signature: 'onUnitCircle(): Vec2',
    summary: 'A uniformly random unit vector: a direction in two dimensions, with no preference for the diagonals.',
    example: `const [dx, dy] = rng.onUnitCircle()`,
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'inUnitDisc',
    name: 'inUnitDisc',
    signature: 'inUnitDisc(config?: { radius?: number }): Vec2',
    summary: 'A uniform point inside a disc centred on the origin. Uniform by area, so no clump in the middle.',
    params: [{ name: 'radius', type: 'number', default: '1', description: 'Radius of the disc' }],
    throws: ['if the radius is negative'],
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'onUnitSphere',
    name: 'onUnitSphere',
    signature: 'onUnitSphere(): Vec3',
    summary:
      'A uniformly random unit vector in three dimensions — uniform over the sphere, rather than over latitude and longitude, which would crowd the poles.',
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'inUnitBall',
    name: 'inUnitBall',
    signature: 'inUnitBall(config?: { radius?: number }): Vec3',
    summary: 'A uniform point inside a ball centred on the origin, uniform by volume.',
    params: [{ name: 'radius', type: 'number', default: '1', description: 'Radius of the ball' }],
    throws: ['if the radius is negative'],
    since: '0.2.0',
    page: '/docs/vectors',
  }),
  m({
    id: 'perturbVec3',
    name: 'perturbVec3',
    signature: 'perturbVec3(config: { at: Vec3; magnitude?: number }): Vec3',
    summary: 'Nudges a three dimensional point, the way `perturb` does in two.',
    example: `rng.perturbVec3({ at: [0.5, 0.5, 0.5], magnitude: 0.2 })`,
    since: '0.2.0',
    page: '/docs/vectors',
  }),
]

const collections: ApiEntry[] = [
  m({
    id: 'sample',
    name: 'sample',
    signature: 'sample<T>(from: T[]): T',
    summary: 'One element, chosen uniformly.',
    throws: ['if the array is empty'],
    example: `rng.sample(["red", "green", "blue"])`,
    since: '0.1.0',
    page: '/docs/collections',
  }),
  m({
    id: 'samples',
    name: 'samples',
    signature: 'samples<T>(n: number, from: T[]): T[]',
    summary: '`n` elements chosen uniformly *with* replacement, so values may repeat.',
    throws: ['if the array is empty and `n` is above 0'],
    since: '0.1.0',
    page: '/docs/collections',
  }),
  m({
    id: 'shuffle',
    name: 'shuffle',
    signature: 'shuffle<T>(items: T[]): T[]',
    summary: 'A Fisher–Yates shuffle **in place**, returning the same array.',
    since: '0.1.0',
    page: '/docs/collections',
  }),
  m({
    id: 'shuffled',
    name: 'shuffled',
    signature: 'shuffled<T>(items: T[]): T[]',
    summary: 'A shuffled copy, leaving the original untouched.',
    since: '0.1.0',
    page: '/docs/collections',
  }),
  m({
    id: 'weightedSample',
    name: 'weightedSample',
    signature: 'weightedSample<T>(cases: [number, T][]): T',
    summary: 'A value from `[weight, value]` pairs, in proportion to the weights.',
    throws: ['if there are no cases, a weight is negative, or the weights do not sum to something positive'],
    example: `rng.weightedSample([
  [5, "circle"],
  [3, "square"],
  [2, "triangle"],
])`,
    since: '0.2.0',
    page: '/docs/collections',
  }),
  m({
    id: 'sampleWithoutReplacement',
    name: 'sampleWithoutReplacement',
    signature: 'sampleWithoutReplacement<T>(from: T[]): T',
    summary:
      'One element, **removed from the array** — so the array is the record of what is left, and repeated draws never repeat. Pass a copy to keep the original.',
    throws: ['if the array is empty'],
    since: '0.4.0',
    page: '/docs/collections',
  }),
  m({
    id: 'samplesWithoutReplacement',
    name: 'samplesWithoutReplacement',
    signature: 'samplesWithoutReplacement<T>(n: number, from: T[]): T[]',
    summary: '`n` distinct elements, each removed from the array as it is drawn.',
    throws: ['if `n` is more than the array holds — checked before anything is drawn, so the array is left alone'],
    example: `const deck = [1, 2, 3, 4, 5, 6]
rng.samplesWithoutReplacement(2, deck) // Two distinct cards; four left
rng.samplesWithoutReplacement(3, [...deck]) // Leaves deck alone`,
    since: '0.4.0',
    page: '/docs/collections',
  }),
  m({
    id: 'sampleWithoutReplacementWithCounts',
    name: 'sampleWithoutReplacementWithCounts',
    signature: 'sampleWithoutReplacementWithCounts<T>(cases: [number, T][]): T',
    summary:
      'One value from `[count, value]` pairs, as likely as its share of the total count, **decrementing that count in place**. The without replacement counterpart of `weightedSample`.',
    throws: ['if a count is not a non-negative integer, or nothing is left'],
    since: '0.4.0',
    page: '/docs/collections',
  }),
  m({
    id: 'samplesWithoutReplacementWithCounts',
    name: 'samplesWithoutReplacementWithCounts',
    signature: 'samplesWithoutReplacementWithCounts<T>(n: number, cases: [number, T][]): T[]',
    summary:
      '`n` values from `[count, value]` pairs, drawing the counts down as it goes. Draw the whole total and you have a shuffled bag of exactly what the counts described.',
    throws: ['if a count is not a non-negative integer, or `n` is more than the counts total'],
    example: `// A row of tiles that is exactly half circles, a third squares
rng.samplesWithoutReplacementWithCounts(6, [
  [3, "circle"],
  [2, "square"],
  [1, "triangle"],
])`,
    since: '0.4.0',
    page: '/docs/collections',
  }),
]

const choosing: ApiEntry[] = [
  m({
    id: 'doProportion',
    name: 'doProportion',
    signature: 'doProportion(p: number, callback: () => void): boolean',
    summary: 'Runs `callback` with probability `p`, and returns whether it ran.',
    example: `rng.doProportion(0.3, () => addHighlight())`,
    since: '0.1.0',
    page: '/docs/choosing',
  }),
  m({
    id: 'proportionately',
    name: 'proportionately',
    signature: 'proportionately<T>(cases: [number, () => T][]): T',
    summary:
      'Picks one of several `[weight, function]` cases in proportion to the weights, runs it, and returns its result. Weights need not sum to anything in particular.',
    throws: ['if the weights do not sum to something positive'],
    example: `const shape = rng.proportionately([
  [5, () => "circle"], // 50%
  [3, () => "square"], // 30%
  [2, () => "triangle"], // 20%
])`,
    since: '0.1.0',
    page: '/docs/choosing',
  }),
  m({
    id: 'withRandomOrder',
    name: 'withRandomOrder',
    signature:
      'withRandomOrder<C, T extends unknown[]>(iterFn: (config: C, callback: (...args: T) => void) => void, config: C, cb: (...args: T) => void): void',
    summary:
      'Wraps any iteration function so its callbacks fire in a shuffled order: the arguments are collected, shuffled, then replayed.',
    example: `rng.withRandomOrder(forTiling, { n: 10 }, ([x, y], [w, h]) => {
  drawTile(x, y, w, h)
})`,
    since: '0.1.0',
    page: '/docs/choosing',
  }),
]

const noise: ApiEntry[] = [
  m({
    id: 'perlinNoise',
    name: 'perlinNoise',
    signature: 'perlinNoise(): NoiseField',
    summary:
      'A seeded field of gradient (Perlin) noise: a random direction at every lattice point, falling to zero at each of them. The classic.',
    details: ['Building the field draws a few hundred numbers; sampling it draws none, so the same point always gives the same value.'],
    example: `const noise = rng.perlinNoise()
noise.at(x * 3, y * 3) // A landscape
noise.at(x * 3, y * 3, t) // The third dimension as time`,
    since: '0.4.0',
    page: '/docs/noise',
  }),
  m({
    id: 'valueNoise',
    name: 'valueNoise',
    signature: 'valueNoise(): NoiseField',
    summary:
      'A seeded field of value noise: a random value at every lattice point, smoothly interpolated. Softer and blobbier than Perlin, and cheaper.',
    since: '0.4.0',
    page: '/docs/noise',
  }),
  {
    id: 'NoiseField.at',
    name: 'NoiseField.at',
    kind: 'method',
    signature: 'at(x: number, y?: number, z?: number): number',
    summary:
      'The value of the field at a point, in `[-1, 1]`, in one, two or three dimensions depending on how many coordinates you pass. Points a whole unit apart are unrelated; multiply coordinates to zoom.',
    since: '0.4.0',
    page: '/docs/noise',
  },
  {
    id: 'NoiseField.fbm',
    name: 'NoiseField.fbm',
    kind: 'method',
    signature: 'fbm(config?: FbmConfig): NoiseField',
    summary:
      'Fractal Brownian motion: octaves of this field summed, each finer and fainter than the last. Returns another field, sampled the same way, so the configuring is done once.',
    params: [
      { name: 'octaves', type: 'number', default: '4', description: 'How many layers to add up' },
      { name: 'lacunarity', type: 'number', default: '2', description: 'How much finer each layer is than the last' },
      { name: 'gain', type: 'number', default: '0.5', description: 'How much fainter each layer is than the last' },
    ],
    throws: ['if `octaves` is not a positive integer', 'if `lacunarity` or `gain` is not positive'],
    example: `const hills = noise.fbm({ octaves: 6, lacunarity: 2, gain: 0.5 })
hills.at(x, y) // Detail at every scale, still -1 to 1`,
    since: '0.4.0',
    page: '/docs/noise',
  },
]

const walks: ApiEntry[] = [
  m({
    id: 'walk',
    name: 'walk',
    signature: 'walk(config: WalkConfig): Vec2[]',
    summary:
      'A random walk: a path whose every step blends the direction of the last with a fresh random heading.',
    params: [
      { name: 'steps', type: 'number', description: 'How many steps; the path is one point longer' },
      { name: 'start', type: 'Vec2', default: '[0, 0]', description: 'Where it begins' },
      { name: 'stepSize', type: 'number', default: '1', description: 'How far each step travels' },
      { name: 'momentum', type: 'number', default: '0', description: 'How much of the last direction each step keeps, from 0 (Brownian) to 1 (a straight line)' },
      { name: 'drift', type: 'Vec2', default: '[0, 0]', description: 'A constant nudge added to every step' },
      { name: 'heading', type: 'number', default: 'random', description: 'Direction of the first step, in radians' },
    ],
    returns: 'The path, starting with `start`, so `steps + 1` points long.',
    throws: ['if `steps` is not a non-negative integer', 'if `momentum` is outside `[0, 1]`', 'if `stepSize` is negative'],
    example: `for (const [x, y] of rng.walk({ steps: 200, stepSize: 0.01, momentum: 0.9 })) {
  lineTo(x, y)
}`,
    since: '0.4.0',
    page: '/docs/walks',
  }),
]

const fn = (
  id: string,
  signature: string,
  summary: string,
  since: string,
  extra: Partial<ApiEntry> = {},
): ApiEntry => ({
  id: `fn-${id}`,
  name: id,
  kind: 'function',
  signature,
  summary,
  since,
  page: '/docs/standalone',
  ...extra,
})

const standalone: ApiEntry[] = [
  ...distributions.map((d) =>
    fn(d.method, d.standalone, `The standalone form of [\`rng.${d.method}\`](/docs/distributions/${d.id}).`, distributionEntries.find((e) => e.id === d.method)!.since),
  ),
  fn('uniformVec2', 'uniformVec2(rng: RandomSource, config?: UniformVecConfig): Vec2', 'The standalone form of [`rng.uniformVec2`](/docs/vectors#uniformVec2).', '0.2.0'),
  fn('uniformVec3', 'uniformVec3(rng: RandomSource, config?: UniformVecConfig): Vec3', 'The standalone form of [`rng.uniformVec3`](/docs/vectors#uniformVec3).', '0.2.0'),
  fn('uniformVec4', 'uniformVec4(rng: RandomSource, config?: UniformVecConfig): Vec4', 'The standalone form of [`rng.uniformVec4`](/docs/vectors#uniformVec4).', '0.2.0'),
  fn('gaussianVec2', 'gaussianVec2(rng: RandomSource, config?: GaussianVecConfig<Vec2>): Vec2', 'The standalone form of [`rng.gaussianVec2`](/docs/vectors#gaussianVec2).', '0.2.0'),
  fn('gaussianVec3', 'gaussianVec3(rng: RandomSource, config?: GaussianVecConfig<Vec3>): Vec3', 'The standalone form of [`rng.gaussianVec3`](/docs/vectors#gaussianVec3).', '0.2.0'),
  fn('gaussianVec4', 'gaussianVec4(rng: RandomSource, config?: GaussianVecConfig<Vec4>): Vec4', 'The standalone form of [`rng.gaussianVec4`](/docs/vectors#gaussianVec4).', '0.2.0'),
  fn('onUnitCircle', 'onUnitCircle(rng: RandomSource): Vec2', 'The standalone form of [`rng.onUnitCircle`](/docs/vectors#onUnitCircle).', '0.2.0'),
  fn('inUnitDisc', 'inUnitDisc(rng: RandomSource, config?: { radius?: number }): Vec2', 'The standalone form of [`rng.inUnitDisc`](/docs/vectors#inUnitDisc).', '0.2.0'),
  fn('onUnitSphere', 'onUnitSphere(rng: RandomSource): Vec3', 'The standalone form of [`rng.onUnitSphere`](/docs/vectors#onUnitSphere).', '0.2.0'),
  fn('inUnitBall', 'inUnitBall(rng: RandomSource, config?: { radius?: number }): Vec3', 'The standalone form of [`rng.inUnitBall`](/docs/vectors#inUnitBall).', '0.2.0'),
  fn('perturbVec2', 'perturbVec2(rng: RandomSource, config: { at: Vec2; magnitude?: number }): Vec2', 'The standalone form of [`rng.perturb`](/docs/points#perturb).', '0.2.0'),
  fn('perturbVec3', 'perturbVec3(rng: RandomSource, config: { at: Vec3; magnitude?: number }): Vec3', 'The standalone form of [`rng.perturbVec3`](/docs/vectors#perturbVec3).', '0.2.0'),
  fn('perlinNoise', 'perlinNoise(rng: RandomSource): NoiseField', 'The standalone form of [`rng.perlinNoise`](/docs/noise#perlinNoise).', '0.4.0'),
  fn('valueNoise', 'valueNoise(rng: RandomSource): NoiseField', 'The standalone form of [`rng.valueNoise`](/docs/noise#valueNoise).', '0.4.0'),
  fn('walk', 'walk(rng: RandomSource, config: WalkConfig): Vec2[]', 'The standalone form of [`rng.walk`](/docs/walks#walk).', '0.4.0'),
  fn(
    'poissonDiskPoints',
    'poissonDiskPoints(config: { width: number; height: number; minDist: number; rng: () => number; k?: number }): Point2D[]',
    'Bridson’s Poisson disk sampling over a `width` × `height` region, driven by any `rng`. The standalone form of [`rng.poissonDiskPoints`](/docs/points#poissonDiskPoints); note that `k` is what the method calls `attempts`.',
    '0.1.0',
    {
      example: `import { poissonDiskPoints } from "ulam-prng"

poissonDiskPoints({ width: 1, height: 1, minDist: 0.05, rng: Math.random, k: 30 })`,
    },
  ),
  {
    id: 'PoissonDiskSampling',
    name: 'PoissonDiskSampling',
    kind: 'class',
    signature: 'new PoissonDiskSampling(width: number, height: number, minDist: number, k: number)',
    summary:
      'The sampler behind `poissonDiskPoints`: Bridson’s algorithm with a background grid for fast neighbour checks. Call `generatePoints(rng)` to fill it; the result is also kept on `.points`.',
    throws: ['if the width or height is not positive', 'if `minDist` is not positive'],
    example: `const sampler = new PoissonDiskSampling(1, 1, 0.05, 30)
const points = sampler.generatePoints(rng.random)`,
    since: '0.1.0',
    page: '/docs/standalone',
  },
]

const t = (id: string, signature: string, summary: string, since: string, page = '/docs/standalone'): ApiEntry => ({
  id,
  name: id,
  kind: 'type',
  signature,
  summary,
  since,
  page,
})

const types: ApiEntry[] = [
  t('RandomSource', 'type RandomSource = () => number', 'Any source of uniform randomness in `[0, 1)`: `rng.random`, `Math.random`, or your own. What every standalone function takes first.', '0.2.0'),
  t('RNGState', 'type RNGState = [number, number, number, number]', 'A generator’s exact position: `[stateHi, stateLo, incHi, incLo]`, from `getState`.', '0.1.0', '/docs/seeding'),
  t('Vec2', 'type Vec2 = [number, number]', 'A vector or point in two dimensions. A plain tuple, so it drops into whatever geometry you already use.', '0.2.0', '/docs/vectors'),
  t('Vec3', 'type Vec3 = [number, number, number]', 'A vector or point in three dimensions.', '0.2.0', '/docs/vectors'),
  t('Vec4', 'type Vec4 = [number, number, number, number]', 'A vector or point in four dimensions.', '0.2.0', '/docs/vectors'),
  t('Point2D', 'type Point2D = Vec2', 'A point in two dimensions; an alias of `Vec2`.', '0.1.0', '/docs/vectors'),
  t('Vector2D', 'type Vector2D = Vec2', 'A vector in two dimensions; an alias of `Vec2`.', '0.1.0', '/docs/vectors'),
  t('UniformVecConfig', 'type UniformVecConfig = { from?: number; to?: number }', 'Bounds for the uniform vectors, applied to every component.', '0.2.0', '/docs/vectors'),
  t('GaussianVecConfig', 'type GaussianVecConfig<V> = { mean?: V; sd?: number }', 'Centre and spread for the gaussian vectors.', '0.2.0', '/docs/vectors'),
  t('NoiseField', 'type NoiseField = {\n  at(x: number, y?: number, z?: number): number\n  fbm(config?: FbmConfig): NoiseField\n}', 'A seeded noise field, sampled in one, two or three dimensions.', '0.4.0', '/docs/noise'),
  t('FbmConfig', 'type FbmConfig = { octaves?: number; lacunarity?: number; gain?: number }', 'How an fbm field stacks its octaves.', '0.4.0', '/docs/noise'),
  t('WalkConfig', 'type WalkConfig = {\n  steps: number\n  start?: Vec2\n  stepSize?: number\n  momentum?: number\n  drift?: Vec2\n  heading?: number\n}', 'How a walk wanders.', '0.4.0', '/docs/walks'),
]

export const apiGroups: ApiGroup[] = [
  { title: 'Construction and state', page: '/docs/seeding', blurb: 'Making a generator, re-seeding it, and saving its place.', entries: seeding },
  { title: 'Streams', page: '/docs/streams', blurb: 'Independent generators from one seed.', entries: streams },
  { title: 'Serialisation', page: '/docs/serialisation', blurb: 'A generator as a short string, and back.', entries: serialisation },
  { title: 'Numbers', page: '/docs/numbers', blurb: 'The uniform core everything is built on.', entries: numbers },
  { title: 'Distributions', page: '/docs/distributions', blurb: 'Twenty shapes of randomness, continuous and discrete.', entries: distributionEntries },
  { title: 'Points', page: '/docs/points', blurb: 'Places on a canvas.', entries: points },
  { title: 'Vectors', page: '/docs/vectors', blurb: 'Vectors, directions, discs and balls.', entries: vectors },
  { title: 'Collections', page: '/docs/collections', blurb: 'Sampling, shuffling and drawing from arrays.', entries: collections },
  { title: 'Choosing what to do', page: '/docs/choosing', blurb: 'Randomness that runs code.', entries: choosing },
  { title: 'Noise', page: '/docs/noise', blurb: 'Smooth, seeded fields.', entries: noise },
  { title: 'Random walks', page: '/docs/walks', blurb: 'Paths with momentum.', entries: walks },
  { title: 'Standalone functions', page: '/docs/standalone', blurb: 'Every sampler as a function of any random source.', entries: standalone },
  { title: 'Types', page: '/docs/standalone', blurb: 'The exported TypeScript types.', entries: types },
]

export const api: Record<string, ApiEntry> = Object.fromEntries(
  apiGroups.flatMap((g) => g.entries).map((e) => [e.id, e]),
)

export function entry(id: string): ApiEntry {
  const e = api[id]
  if (!e) throw new Error(`No API entry ${id}`)
  return e
}
