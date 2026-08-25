/**
 * A seedable random number generator, plus the higher level randomness helpers
 * that generative art actually reaches for.
 *
 * The core is a PCG (Permuted Congruential Generator): fast, small, and with
 * excellent statistical properties. Based on https://github.com/thomcc/pcg-random
 * See also http://www.pcg-random.org/
 * @module rng
 */

import { decodeWords, encodeWords } from "./codec.js";
import * as dist from "./distributions.js";
import { randomSeedWords } from "./entropy.js";
import { hashSeed } from "./hash.js";
import {
  add64,
  BIT_27,
  BIT_53,
  DEFAULT_INC_HI,
  DEFAULT_INC_LO,
  mul64,
  MUL_HI,
  MUL_LO,
} from "./pcg.js";
import type { NoiseField } from "./noise.js";
import { perlinNoise, valueNoise } from "./noise.js";
import { poissonDiskPoints } from "./poissonDisk.js";
import type { Point2D, Vec2, Vec3, Vec4 } from "./types.js";
import * as vectors from "./vectors.js";
import type { WalkConfig } from "./walk.js";
import { walk } from "./walk.js";

/**
 * The four 32-bit words that fully describe a generator's position in its
 * stream: `[stateHi, stateLo, incHi, incLo]`.
 */
export type RNGState = [number, number, number, number];

/**
 * The total of the counts in `[count, value]` pairs, checking as it goes that
 * every one of them really is a count.
 */
const totalOfCounts = <T>(cases: [number, T][]): number => {
  let total = 0;
  for (const [count] of cases) {
    if (!Number.isInteger(count)) throw new Error("Counts must be integers");
    if (count < 0) throw new Error("Counts must not be negative");
    total += count;
  }
  return total;
};

/**
 * A seedable pseudo-random number generator with excellent statistical
 * properties, and a library of derived randomness on top of it.
 *
 * Everything an instance produces is determined by its seed, so a sketch given
 * the same seed draws exactly the same picture.
 *
 * @example
 * ```ts
 * const rng = new RNG(12345)
 *
 * rng.number() // 0.0 to 1.0
 * rng.integer(100) // 0 to 99
 * rng.randomAngle() // 0 to 2π
 * rng.sample(["a", "b", "c"])
 * rng.gaussian({ mean: 10, sd: 2 })
 * ```
 */
export class RNG {
  private state: Int32Array;
  /** The seed words this generator was last seeded with; what streams branch from. */
  private seedHi = 0;
  private seedLo = 0;

  /**
   * A uniform random number in `[0, 1)`.
   *
   * An alias for {@link RNG.number} that is pre-bound, so it can be handed
   * straight to anything wanting a `() => number`.
   *
   * @example
   * ```ts
   * const points = someLibrary({ rng: rng.random })
   * ```
   */
  random = (): number => this.number();

  /**
   * Creates a new PCG random number generator.
   *
   * A string seed is hashed down to 64 bits, so any word will do: the same
   * word always gives the same sketch.
   *
   * Given no seed at all it takes a full 64 bits from the platform's
   * cryptographic generator, falling back to `Math.random` where there is not
   * one.
   *
   * @param seed - The seed: a string, or the high 32 bits of a numeric seed
   * (optional, defaults to random). Ignores `seedLo` when a string.
   * @param seedLo - Low 32 bits of the seed (optional)
   * @param incHi - High 32 bits of the increment (optional, use default for best results)
   * @param incLo - Low 32 bits of the increment (optional, use default for best results)
   * @example
   * ```ts
   * const rng1 = new RNG() // Random seed
   * const rng2 = new RNG(42) // Seeded with 42
   * const rng3 = new RNG("sunflower") // Seeded with a string
   * const rng4 = new RNG(0x12345678, 0x9abcdef0) // Full 64-bit seed
   * ```
   */
  constructor(
    seed?: number | string,
    seedLo?: number,
    incHi: number = DEFAULT_INC_HI,
    incLo: number = DEFAULT_INC_LO,
  ) {
    this.state = new Int32Array(4);
    this.seed(seed, seedLo, incHi, incLo);
  }

  /**
   * Re-seeds this generator in place, discarding its current position in the
   * stream. Equivalent to constructing a fresh `RNG` with the same arguments,
   * but keeps any references to this instance valid.
   *
   * @param seed - The seed: a string, or the high 32 bits of a numeric seed
   * (optional, defaults to random). Ignores `seedLo` when a string.
   * @param seedLo - Low 32 bits of the seed (optional)
   * @param incHi - High 32 bits of the increment (optional)
   * @param incLo - Low 32 bits of the increment (optional)
   * @example
   * ```ts
   * rng.seed(42) // Back to a known starting point
   * rng.seed("sunflower") // Or a memorable one
   * ```
   */
  seed(
    seed?: number | string,
    seedLo?: number,
    incHi: number = DEFAULT_INC_HI,
    incLo: number = DEFAULT_INC_LO,
  ): void {
    let hi: number;
    let lo: number;

    if (typeof seed === "string") {
      [hi, lo] = hashSeed(seed);
    } else if (seedLo === undefined && seed === undefined) {
      [hi, lo] = randomSeedWords();
    } else if (seedLo === undefined) {
      lo = seed as number;
      hi = 0;
    } else {
      lo = seedLo;
      hi = seed as number;
    }

    this.seedHi = hi >>> 0;
    this.seedLo = lo >>> 0;

    this.state[0] = 0;
    this.state[1] = 0;
    this.state[2] = incHi >>> 0;
    this.state[3] = (incLo | 1) >>> 0;
    this.next();
    add64(this.state, this.state[0], this.state[1], hi >>> 0, lo >>> 0);
    this.next();
  }

  /**
   * Gets the current internal state of the generator.
   * Can be used with {@link RNG.setState} to save and restore the generator state.
   *
   * @returns A tuple of four 32-bit integers representing the internal state
   * @example
   * ```ts
   * const state = rng.getState()
   * // ... generate some numbers ...
   * rng.setState(state) // Restore to saved state
   * ```
   */
  getState(): RNGState {
    return [this.state[0], this.state[1], this.state[2], this.state[3]];
  }

  /**
   * Restores the internal state of the generator.
   * Use with {@link RNG.getState} to save and restore the generator state for
   * reproducibility.
   *
   * @param state - A tuple of four 32-bit integers from a previous getState() call
   * @example
   * ```ts
   * const state = rng.getState()
   * const num1 = rng.number()
   * rng.setState(state) // Reset state
   * const num2 = rng.number() // num2 === num1
   * ```
   */
  setState(state: RNGState): void {
    this.state[0] = state[0];
    this.state[1] = state[1];
    this.state[2] = state[2];
    this.state[3] = state[3] | 1;
  }

  /**
   * This generator as a short URL safe string: 32 characters carrying its
   * seed and its exact position in the stream.
   *
   * Named `toJSON` so that `JSON.stringify` picks it up on its own, wherever a
   * generator sits inside something larger being saved.
   *
   * @see {@link RNG.fromJSON} to get the generator back
   * @example
   * ```ts
   * location.hash = rng.toJSON() // Put the picture in the URL
   * ```
   */
  toJSON(): string {
    return encodeWords([
      this.seedHi,
      this.seedLo,
      this.state[0],
      this.state[1],
      this.state[2],
      this.state[3],
    ]);
  }

  /**
   * The generator a {@link RNG.toJSON} string came from: the same seed, and
   * the same place in the same stream, so it carries on exactly where the
   * original left off. Its {@link RNG.stream}s come back with it.
   *
   * @throws Error if the string is not one {@link RNG.toJSON} produced
   * @example
   * ```ts
   * const rng = RNG.fromJSON(location.hash.slice(1))
   * ```
   */
  static fromJSON(serialised: string): RNG {
    const [seedHi, seedLo, ...state] = decodeWords(serialised, 6);
    const rng = new RNG(seedHi, seedLo);
    rng.setState([state[0], state[1], state[2], state[3]]);
    return rng;
  }

  /**
   * A named generator derived from this one's seed: an independent sequence
   * that never lines up with this one, or with any other name's.
   *
   * Unlike {@link RNG.fork}, this depends only on the seed and the `id`, not on
   * how far along this generator happens to be. So the layer you ask for is the
   * same layer however much drawing came before it, and adding a stream to a
   * sketch leaves the others exactly as they were.
   *
   * Streams nest: a stream of a stream is derived from that stream's seed, so
   * `rng.stream("petals").stream("colour")` is its own generator, unrelated to
   * `rng.stream("colour")`.
   *
   * A numeric `id` is hashed as its decimal string, so `stream(5)` and
   * `stream("5")` are the same stream.
   *
   * @param id - Names the stream; anything, as long as it is the same next time
   * @example
   * ```ts
   * const rng = new RNG("sunflower")
   * const colour = rng.stream("colour")
   * const layout = rng.stream("layout")
   * // Recolouring now leaves the layout exactly where it was
   * ```
   */
  stream(id: number | string): RNG {
    const [incHi, incLo] = hashSeed(typeof id === "string" ? id : String(id));
    // Draw the child's own seed from a generator on the named stream of this
    // seed, so that the child differs from its parent in seed as well as
    // stream, and streams of streams stay distinct.
    return new RNG(this.seedHi, this.seedLo, incHi, incLo | 1).fork();
  }

  /**
   * A new generator seeded from this one, advancing it by four draws.
   *
   * The child is independent — a different seed and a different stream — so
   * however much randomness it goes on to use, this generator's own sequence is
   * unaffected. That is what makes it safe to hand one to a subroutine whose
   * appetite for random numbers you do not control.
   *
   * The whole thing stays reproducible: the same parent seed gives the same
   * children, in order.
   *
   * @example
   * ```ts
   * const rng = new RNG("sunflower")
   * for (const petal of petals) drawPetal(petal, rng.fork())
   * ```
   */
  fork(): RNG {
    const seedHi = this.next();
    const seedLo = this.next();
    const incHi = this.next();
    const incLo = this.next() | 1;
    return new RNG(seedHi, seedLo, incHi, incLo);
  }

  /**
   * `n` independent generators, by {@link RNG.fork}ing this one `n` times.
   *
   * @throws Error if `n` is not a non-negative integer
   * @example
   * ```ts
   * const [background, foreground] = rng.split(2)
   * ```
   */
  split(n: number): RNG[] {
    if (!Number.isInteger(n) || n < 0) throw new Error("n must be a non-negative integer");
    const res: RNG[] = [];
    for (let i = 0; i < n; i++) res.push(this.fork());
    return res;
  }

  /**
   * Generates a random 32-bit unsigned integer.
   * This is the core method that implements the PCG algorithm; everything else
   * in this class is built on it.
   *
   * @returns A random 32-bit unsigned integer (0 to 4294967295)
   * @example
   * ```ts
   * const randomBits = rng.next()
   * ```
   */
  next(): number {
    // save current state (what we'll use for this number)
    const oldHi = this.state[0] >>> 0;
    const oldLo = this.state[1] >>> 0;

    // churn LCG.
    mul64(this.state, oldHi, oldLo, MUL_HI, MUL_LO);
    add64(this.state, this.state[0], this.state[1], this.state[2], this.state[3]);

    // get least sig. 32 bits of ((oldstate >> 18) ^ oldstate) >> 27
    let xsHi = oldHi >>> 18;
    let xsLo = ((oldLo >>> 18) | (oldHi << 14)) >>> 0;
    xsHi = (xsHi ^ oldHi) >>> 0;
    xsLo = (xsLo ^ oldLo) >>> 0;
    const xorshifted = ((xsLo >>> 27) | (xsHi << 5)) >>> 0;
    // rotate xorshifted right a random amount, based on the most sig. 5 bits
    // of the old state.
    const rot = oldHi >>> 27;
    const rot2 = ((-rot >>> 0) & 31) >>> 0;
    return ((xorshifted >>> rot) | (xorshifted << rot2)) >>> 0;
  }

  /**
   * Generates a uniformly distributed random integer in the range `[0, max)`.
   * Uses rejection sampling to ensure uniform distribution across the entire range.
   *
   * @param max - The exclusive upper bound (must be positive)
   * @returns A random integer from 0 (inclusive) to max (exclusive)
   * @example
   * ```ts
   * const diceRoll = rng.integer(6) + 1 // 1 to 6
   * const arrayIndex = rng.integer(myArray.length)
   * ```
   */
  integer(max: number): number {
    if (!max) {
      return this.next();
    }
    max = max >>> 0;
    if ((max & (max - 1)) === 0) {
      return this.next() & (max - 1); // fast path for power of 2
    }

    let num = 0;
    const skew = ((-max >>> 0) % max) >>> 0;
    for (num = this.next(); num < skew; num = this.next()) {
      // this loop will rarely execute more than twice,
      // and is intentionally empty
    }
    return num % max;
  }

  /**
   * Generates a uniformly distributed random floating-point number in the range
   * `[0.0, 1.0)`. Uses 53 bits of precision (every bit of the IEEE-754 double
   * mantissa is randomized).
   *
   * @returns A random double-precision float from 0.0 (inclusive) to 1.0 (exclusive)
   * @example
   * ```ts
   * const randomFloat = rng.number() // 0.0 to 1.0
   * const randomInRange = rng.number() * 100 + 50 // 50 to 150
   * ```
   */
  number(): number {
    const hi = (this.next() & 0x03ffffff) * 1.0;
    const lo = (this.next() & 0x07ffffff) * 1.0;
    return (hi * BIT_27 + lo) / BIT_53;
  }

  /**
   * A uniform random integer between bounds. Default lower bound is 0, and the
   * upper bound is inclusive by default.
   *
   * @param config.from - Lower bound, inclusive (default: 0)
   * @param config.to - Upper bound
   * @param config.inclusive - Whether `to` is included (default: true)
   * @example
   * ```ts
   * rng.uniformRandomInt({ to: 6 }) // 0 to 6
   * rng.uniformRandomInt({ from: 1, to: 7, inclusive: false }) // 1 to 6
   * ```
   */
  uniformRandomInt(config: { from?: number; to: number; inclusive?: boolean }): number {
    const { to, from = 0, inclusive = true } = config;
    const d = to - from + (inclusive ? 1 : 0);
    return from + Math.floor(this.number() * d);
  }

  /**
   * A random point with integer coordinates on a grid.
   *
   * Bounds are inclusive, matching {@link RNG.uniformRandomInt}'s default.
   *
   * @example
   * ```ts
   * rng.uniformGridPoint({ minX: 0, maxX: 9, minY: 0, maxY: 9 })
   * ```
   */
  uniformGridPoint({
    minX,
    maxX,
    minY,
    maxY,
  }: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }): Point2D {
    return [
      this.uniformRandomInt({ from: minX, to: maxX }),
      this.uniformRandomInt({ from: minY, to: maxY }),
    ];
  }

  /**
   * A random point in a rectangle, by default the unit square.
   *
   * @param config.width - Width of the region (default: 1)
   * @param config.height - Height of the region (default: 1)
   * @example
   * ```ts
   * rng.randomPoint() // Somewhere in [0, 1) x [0, 1)
   * rng.randomPoint({ height: 1 / aspectRatio }) // A canvas of that shape
   * ```
   */
  randomPoint(config?: { width?: number; height?: number }): Point2D {
    const { width = 1, height = 1 } = config ?? {};
    return [this.number() * width, this.number() * height];
  }

  /**
   * A random angle in radians, from 0 up to 2π.
   */
  randomAngle(): number {
    return this.number() * Math.PI * 2;
  }

  /**
   * A coin toss with result either -1 or 1.
   */
  randomPolarity(): 1 | -1 {
    return this.number() > 0.5 ? 1 : -1;
  }

  /**
   * Sample uniformly from an array.
   *
   * @throws Error if the array is empty
   * @example
   * ```ts
   * rng.sample(["red", "green", "blue"])
   * ```
   */
  sample<T>(from: T[]): T {
    if (from.length === 0) throw new Error("Cannot sample from an empty array");
    return from[Math.floor(this.number() * from.length)];
  }

  /**
   * `n` uniform samples from an array, with replacement (so values may repeat).
   *
   * @throws Error if the array is empty and `n` is greater than 0
   */
  samples<T>(n: number, from: T[]): T[] {
    const res: T[] = [];
    for (let i = 0; i < n; i++) {
      res.push(this.sample(from));
    }
    return res;
  }

  /**
   * Draw one uniform sample from an array without replacement, **removing it
   * from the array**, so repeated draws never repeat a value.
   *
   * Sampling without replacement has to remember what has already been taken,
   * and the array you pass in is that memory: it loses an element on every
   * draw, in the way {@link RNG.shuffle} rearranges in place. Pass a copy
   * (`[...items]`) to leave the original alone.
   *
   * @throws Error if the array is empty
   * @example
   * ```ts
   * const deck = ["a", "b", "c"]
   * rng.sampleWithoutReplacement(deck) // "b", and deck is now ["a", "c"]
   * ```
   */
  sampleWithoutReplacement<T>(from: T[]): T {
    if (from.length === 0) throw new Error("Cannot sample from an empty array");
    return from.splice(Math.floor(this.number() * from.length), 1)[0];
  }

  /**
   * `n` uniform samples from an array without replacement, so no element comes
   * back twice. They are **removed from the array** as they are drawn, exactly
   * as in {@link RNG.sampleWithoutReplacement}.
   *
   * @throws Error if `n` is more than the array holds
   * @example
   * ```ts
   * const deck = [1, 2, 3, 4, 5, 6]
   * rng.samplesWithoutReplacement(2, deck) // [5, 1], and deck has four left
   * ```
   */
  samplesWithoutReplacement<T>(n: number, from: T[]): T[] {
    if (n > from.length) {
      throw new Error(`Cannot sample ${n} values without replacement from ${from.length} elements`);
    }
    const res: T[] = [];
    for (let i = 0; i < n; i++) {
      res.push(this.sampleWithoutReplacement(from));
    }
    return res;
  }

  /**
   * Shuffle an array **in place** with a Fisher-Yates shuffle, returning the
   * same array. Use {@link RNG.shuffled} if you need to leave the original
   * alone.
   */
  shuffle<T>(items: T[]): T[] {
    let currentIndex = items.length;
    let temporaryValue: T;
    let randomIndex = 0;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(this.number() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = items[currentIndex];
      items[currentIndex] = items[randomIndex];
      items[randomIndex] = temporaryValue;
    }

    return items;
  }

  /**
   * A shuffled copy of an array, leaving the original untouched.
   */
  shuffled<T>(items: T[]): T[] {
    return this.shuffle([...items]);
  }

  /**
   * Perturb a point by a random amount. By default uniform random changes in
   * -0.05 to 0.05; the optional magnitude scales this, e.g. magnitude 1 gives
   * perturbations of -0.5 to 0.5.
   */
  perturb(config: { at: Point2D; magnitude?: number }): Point2D {
    return vectors.perturbVec2(this.random, config);
  }

  /**
   * Gaussian (normal) random number, default mean 0 and standard deviation 1.
   *
   * @example
   * ```ts
   * rng.gaussian() // Standard normal
   * rng.gaussian({ mean: 100, sd: 15 })
   * ```
   */
  gaussian(config?: { mean?: number; sd?: number }): number {
    return dist.gaussian(this.random, config);
  }

  /**
   * Poisson random number; lambda (the mean and the variance) is the only
   * parameter.
   *
   * @example
   * ```ts
   * const nSpots = rng.poisson(3)
   * ```
   */
  poisson(lambda: number): number {
    return dist.poisson(this.random, lambda);
  }

  /**
   * Do something with probability `p`.
   *
   * @param p - Probability, from 0 to 1
   * @param callback - Run when the draw succeeds
   * @returns Whether the callback ran
   * @example
   * ```ts
   * rng.doProportion(0.3, () => addHighlight())
   * ```
   */
  doProportion(p: number, callback: () => void): boolean {
    if (this.number() < p) {
      callback();
      return true;
    }
    return false;
  }

  /**
   * Randomly selects and executes one case from weighted options.
   * Each case is a `[weight, function]` tuple; weights need not sum to 1.
   *
   * @throws Error if the weights do not sum to something positive
   * @example
   * ```ts
   * // 50% circles, 30% squares, 20% triangles
   * const shape = rng.proportionately([
   *   [5, () => "circle"],
   *   [3, () => "square"],
   *   [2, () => "triangle"],
   * ])
   * ```
   */
  proportionately<T>(cases: [number, () => T][]): T {
    const total = cases.map((c) => c[0]).reduce((a, b) => a + b, 0);
    if (total <= 0) throw new Error("Must be positive total");
    let r = this.number() * total;

    for (let i = 0; i < cases.length; i++) {
      if (cases[i][0] > r) {
        return cases[i][1]();
      } else {
        r -= cases[i][0];
      }
    }
    // fallback *should never happen!*
    return cases[0][1]();
  }

  /**
   * Wraps an iteration function to execute callbacks in random order.
   * Collects all iteration arguments, shuffles them, then executes the callback.
   *
   * @param iterFn - An iteration function taking a config and a callback
   * @param config - Configuration for the iteration function
   * @param cb - Callback to execute for each iteration (in random order)
   * @example
   * ```ts
   * // Visit the tiles of a grid in a random order
   * rng.withRandomOrder(forTiling, { n: 10 }, ([x, y], [w, h]) => {
   *   draw(x, y, w, h)
   * })
   * ```
   */
  withRandomOrder<C, T extends unknown[]>(
    iterFn: (config: C, callback: (...args: T) => void) => void,
    config: C,
    cb: (...args: T) => void,
  ): void {
    const args: T[] = [];
    iterFn(config, (...as: T) => {
      args.push(as);
    });
    this.shuffle(args);

    for (const a of args) {
      cb(...a);
    }
  }

  /**
   * Poisson disk sampled points: randomly placed, but no two closer together
   * than `minDist`. Much more even, and more pleasing, than pure random points.
   *
   * @param config.minDist - Minimum distance between any two points
   * @param config.width - Width of the region (default: 1)
   * @param config.height - Height of the region (default: 1)
   * @param config.attempts - Attempts to place each point; higher packs tighter (default: 30)
   * @example
   * ```ts
   * for (const [x, y] of rng.poissonDiskPoints({ minDist: 0.05 })) {
   *   drawDot(x, y)
   * }
   * ```
   */
  poissonDiskPoints(config: {
    minDist: number;
    width?: number;
    height?: number;
    attempts?: number;
  }): Point2D[] {
    const { minDist, width = 1, height = 1, attempts = 30 } = config;
    return poissonDiskPoints({
      width,
      height,
      minDist,
      rng: this.random,
      k: attempts,
    });
  }

  /**
   * Runs a callback for each Poisson disk sampled point.
   *
   * @see {@link RNG.poissonDiskPoints}
   * @example
   * ```ts
   * rng.forPoissonDiskPoints({ minDist: 0.05 }, ([x, y], i) => {
   *   drawDot(x, y, i)
   * })
   * ```
   */
  forPoissonDiskPoints(
    config: {
      minDist: number;
      width?: number;
      height?: number;
      attempts?: number;
    },
    callback: (at: Point2D, i: number) => void,
  ): void {
    this.poissonDiskPoints(config).forEach(callback);
  }

  /**
   * A weighted coin toss: `true` with probability `p`, which defaults to a
   * fair half.
   *
   * @example
   * ```ts
   * if (rng.bernoulli(0.3)) addHighlight()
   * ```
   */
  bernoulli(p = 0.5): boolean {
    return dist.bernoulli(this.random, p);
  }

  /**
   * Exponential random number: the waiting time until the next event when they
   * arrive at `rate` per unit, so with mean `1 / rate`.
   *
   * @throws Error if the rate is not positive
   * @example
   * ```ts
   * rng.exponential() // Mean 1
   * rng.exponential({ rate: 4 }) // Mean 0.25
   * ```
   */
  exponential(config?: { rate?: number }): number {
    return dist.exponential(this.random, config);
  }

  /**
   * Log-normal random number: `exp` of a gaussian, so always positive and
   * skewed to the right. `mu` and `sigma` describe the underlying gaussian,
   * not the values themselves.
   *
   * Good for sizes: mostly small things, occasionally a very large one.
   *
   * @example
   * ```ts
   * rng.logNormal({ mu: 0, sigma: 0.5 })
   * ```
   */
  logNormal(config?: { mu?: number; sigma?: number }): number {
    return dist.logNormal(this.random, config);
  }

  /**
   * Cauchy random number: bell shaped but very heavy tailed, with no mean and
   * no variance. Wild outliers are the point.
   *
   * @throws Error if the scale is not positive
   */
  cauchy(config?: { median?: number; scale?: number }): number {
    return dist.cauchy(this.random, config);
  }

  /**
   * Laplace (double exponential) random number: a sharp peak at the mean with
   * fatter tails than a gaussian.
   *
   * @throws Error if the scale is not positive
   */
  laplace(config?: { mean?: number; scale?: number }): number {
    return dist.laplace(this.random, config);
  }

  /**
   * Pareto random number: a power law, at least `scale` and heavy tailed above
   * it. Smaller `shape` means a heavier tail.
   *
   * @throws Error if the shape or scale is not positive
   * @example
   * ```ts
   * rng.pareto({ shape: 1.5 }) // Mostly near 1, occasionally huge
   * ```
   */
  pareto(config: { shape: number; scale?: number }): number {
    return dist.pareto(this.random, config);
  }

  /**
   * Weibull random number. `shape` below 1 crowds values near zero, at 1 it is
   * exponential, and above 1 it becomes a hump around `scale`.
   *
   * @throws Error if the shape or scale is not positive
   */
  weibull(config: { shape: number; scale?: number }): number {
    return dist.weibull(this.random, config);
  }

  /**
   * Triangular random number between `min` and `max`, peaking at `mode`. A
   * cheap way to say "around here, but not exactly".
   *
   * @throws Error if the bounds are not ordered, or the mode falls outside them
   * @example
   * ```ts
   * rng.triangular({ min: 0, max: 10, mode: 8 })
   * ```
   */
  triangular(config?: { min?: number; max?: number; mode?: number }): number {
    return dist.triangular(this.random, config);
  }

  /**
   * Gamma random number with the given `shape` (k) and `scale` (θ), so with
   * mean `shape * scale`.
   *
   * @throws Error if the shape or scale is not positive
   * @example
   * ```ts
   * rng.gamma({ shape: 2, scale: 0.5 })
   * ```
   */
  gamma(config: { shape: number; scale?: number }): number {
    return dist.gamma(this.random, config);
  }

  /**
   * Beta random number in `[0, 1]`, with mean `alpha / (alpha + beta)`. Both
   * parameters above 1 gives a hump, both below gives a U.
   *
   * Handy for proportions: how much of a shape to fill, how far along an edge
   * to put something.
   *
   * @throws Error if either parameter is not positive
   * @example
   * ```ts
   * rng.beta({ alpha: 2, beta: 5 }) // Usually a smallish fraction
   * ```
   */
  beta(config: { alpha: number; beta: number }): number {
    return dist.beta(this.random, config);
  }

  /**
   * Chi-squared random number with `df` degrees of freedom, so with mean `df`.
   *
   * @throws Error if the degrees of freedom are not positive
   */
  chiSquared(df: number): number {
    return dist.chiSquared(this.random, df);
  }

  /**
   * Student's t random number with `df` degrees of freedom: a gaussian with
   * heavier tails, converging on one as `df` grows.
   *
   * @throws Error if the degrees of freedom are not positive
   */
  studentT(df: number): number {
    return dist.studentT(this.random, df);
  }

  /**
   * Binomial random number: how many of `n` independent trials succeed, each
   * with probability `p`.
   *
   * @throws Error if `n` is not a non-negative integer, or `p` is outside [0, 1]
   * @example
   * ```ts
   * rng.binomial({ n: 10, p: 0.5 }) // 0 to 10, usually near 5
   * ```
   */
  binomial(config: { n: number; p: number }): number {
    return dist.binomial(this.random, config);
  }

  /**
   * Geometric random number: how many failures come before the first success,
   * with each trial succeeding with probability `p`.
   *
   * @throws Error if `p` is not in (0, 1]
   */
  geometric(p: number): number {
    return dist.geometric(this.random, p);
  }

  /**
   * An index chosen in proportion to the given weights. Weights are relative,
   * so they need not sum to anything in particular.
   *
   * @throws Error if the weights are empty, negative, or do not sum to
   * something positive
   * @example
   * ```ts
   * rng.categorical([5, 3, 2]) // 0 half the time, 1 a third, 2 a fifth
   * ```
   */
  categorical(weights: number[]): number {
    return dist.categorical(this.random, weights);
  }

  /**
   * Dirichlet random vector: a set of proportions, each positive and all
   * summing to one. `alpha` gives one concentration per share; equal values
   * give shares that are all alike, values below one push the mass into a few
   * of them, and values above one even them out.
   *
   * @throws Error if `alpha` is empty, or any concentration is not positive
   * @example
   * ```ts
   * const [a, b, c] = rng.dirichlet([1, 1, 1]) // Three shares of a whole
   * ```
   */
  dirichlet(alpha: number[]): number[] {
    return dist.dirichlet(this.random, alpha);
  }

  /**
   * Zipf random number: a rank from 1 to `n`, where rank `k` comes up in
   * proportion to `k ** -exponent`. The first rank dominates, the second gets
   * about half as much, and the tail is long but bounded.
   *
   * @throws Error if `n` is not a positive integer, or the exponent is not
   * positive
   * @example
   * ```ts
   * rng.zipf({ n: 100 }) // Mostly 1 and 2, occasionally far down the list
   * ```
   */
  zipf(config: { n: number; exponent?: number }): number {
    return dist.zipf(this.random, config);
  }

  /**
   * Truncated gaussian: a normal draw confined to `[min, max]`, drawn from the
   * part of the bell inside those bounds rather than clamped onto them.
   *
   * Bounds are optional either side, so `{ min: 0 }` is a positive-only
   * normal.
   *
   * @throws Error if the standard deviation is not positive, if `min` is not
   * below `max`, or if the bounds are so far out that no draw could land in
   * them
   * @example
   * ```ts
   * rng.truncatedGaussian({ mean: 0.5, sd: 0.2, min: 0, max: 1 })
   * ```
   */
  truncatedGaussian(config?: { mean?: number; sd?: number; min?: number; max?: number }): number {
    return dist.truncatedGaussian(this.random, config);
  }

  /**
   * Sample a value from `[weight, value]` pairs, in proportion to the weights.
   *
   * The value flavoured counterpart of {@link RNG.proportionately}, which runs
   * a function instead.
   *
   * @throws Error if there are no cases, or the weights do not sum to
   * something positive
   * @example
   * ```ts
   * rng.weightedSample([
   *   [5, "circle"],
   *   [3, "square"],
   *   [2, "triangle"],
   * ])
   * ```
   */
  weightedSample<T>(cases: [number, T][]): T {
    return cases[this.categorical(cases.map((c) => c[0]))][1];
  }

  /**
   * Sample a value from `[count, value]` pairs without replacement: a value is
   * as likely as its share of the total count, and the count it came from is
   * **decremented in place**, so the pairs you pass in are the tally of what
   * is left to draw.
   *
   * The without replacement counterpart of {@link RNG.weightedSample}. Counts
   * are how many of each thing there are rather than arbitrary weights, so
   * they must be non-negative integers.
   *
   * @throws Error if a count is not a non-negative integer, or nothing is left
   * to draw
   * @example
   * ```ts
   * const bag: [number, string][] = [
   *   [3, "circle"],
   *   [2, "square"],
   * ]
   * rng.sampleWithoutReplacementWithCounts(bag) // "circle"
   * // bag is now [[2, "circle"], [2, "square"]]
   * ```
   */
  sampleWithoutReplacementWithCounts<T>(cases: [number, T][]): T {
    const total = totalOfCounts(cases);
    if (total <= 0) throw new Error("Nothing left to sample");

    let r = this.integer(total);
    for (const c of cases) {
      if (r < c[0]) {
        c[0] -= 1;
        return c[1];
      }
      r -= c[0];
    }
    // Unreachable: r is always less than the total of the counts
    throw new Error("Nothing left to sample");
  }

  /**
   * `n` samples from `[count, value]` pairs without replacement, drawing the
   * counts down in place as it goes. Draw the whole total and you have a
   * shuffled bag of exactly the things the counts described.
   *
   * @throws Error if a count is not a non-negative integer, or `n` is more
   * than the counts total
   * @example
   * ```ts
   * // A row of tiles that is exactly half circles, a third squares
   * rng.samplesWithoutReplacementWithCounts(6, [
   *   [3, "circle"],
   *   [2, "square"],
   *   [1, "triangle"],
   * ])
   * ```
   */
  samplesWithoutReplacementWithCounts<T>(n: number, cases: [number, T][]): T[] {
    const total = totalOfCounts(cases);
    if (n > total) {
      throw new Error(
        `Cannot sample ${n} values without replacement from a total count of ${total}`,
      );
    }
    const res: T[] = [];
    for (let i = 0; i < n; i++) {
      res.push(this.sampleWithoutReplacementWithCounts(cases));
    }
    return res;
  }

  /**
   * A uniform random `[x, y]`, by default in the unit square.
   *
   * @example
   * ```ts
   * rng.uniformVec2() // In [0, 1) x [0, 1)
   * rng.uniformVec2({ from: -1, to: 1 })
   * ```
   */
  uniformVec2(config?: vectors.UniformVecConfig): Vec2 {
    return vectors.uniformVec2(this.random, config);
  }

  /**
   * A uniform random `[x, y, z]`, by default in the unit cube.
   */
  uniformVec3(config?: vectors.UniformVecConfig): Vec3 {
    return vectors.uniformVec3(this.random, config);
  }

  /**
   * A uniform random `[x, y, z, w]`, by default in the unit hypercube.
   */
  uniformVec4(config?: vectors.UniformVecConfig): Vec4 {
    return vectors.uniformVec4(this.random, config);
  }

  /**
   * A gaussian `[x, y]`: independent normal components, so a round blur about
   * `mean`.
   *
   * @example
   * ```ts
   * rng.gaussianVec2({ mean: [0.5, 0.5], sd: 0.1 })
   * ```
   */
  gaussianVec2(config?: vectors.GaussianVecConfig<Vec2>): Vec2 {
    return vectors.gaussianVec2(this.random, config);
  }

  /**
   * A gaussian `[x, y, z]`: independent normal components, so a spherical blur
   * about `mean`.
   */
  gaussianVec3(config?: vectors.GaussianVecConfig<Vec3>): Vec3 {
    return vectors.gaussianVec3(this.random, config);
  }

  /**
   * A gaussian `[x, y, z, w]`: independent normal components about `mean`.
   */
  gaussianVec4(config?: vectors.GaussianVecConfig<Vec4>): Vec4 {
    return vectors.gaussianVec4(this.random, config);
  }

  /**
   * A uniformly random unit vector in two dimensions: a direction, with no
   * preference for the diagonals.
   *
   * @example
   * ```ts
   * const [dx, dy] = rng.onUnitCircle()
   * ```
   */
  onUnitCircle(): Vec2 {
    return vectors.onUnitCircle(this.random);
  }

  /**
   * A uniformly random point inside a disc, by default the unit one. Uniform
   * by area, so points do not bunch up in the middle.
   *
   * @throws Error if the radius is negative
   */
  inUnitDisc(config?: { radius?: number }): Vec2 {
    return vectors.inUnitDisc(this.random, config);
  }

  /**
   * A uniformly random unit vector in three dimensions: a direction, uniform
   * over the sphere rather than over latitude and longitude (which would crowd
   * the poles).
   */
  onUnitSphere(): Vec3 {
    return vectors.onUnitSphere(this.random);
  }

  /**
   * A uniformly random point inside a ball, by default the unit one. Uniform
   * by volume.
   *
   * @throws Error if the radius is negative
   */
  inUnitBall(config?: { radius?: number }): Vec3 {
    return vectors.inUnitBall(this.random, config);
  }

  /**
   * Perturb a three dimensional point by a random amount, the way
   * {@link RNG.perturb} does in two dimensions.
   *
   * @example
   * ```ts
   * rng.perturbVec3({ at: [0.5, 0.5, 0.5], magnitude: 0.2 })
   * ```
   */
  perturbVec3(config: { at: Vec3; magnitude?: number }): Vec3 {
    return vectors.perturbVec3(this.random, config);
  }

  /**
   * A seeded field of value noise: a random value at every lattice point,
   * smoothly interpolated between them, so nearby points get nearby values.
   *
   * Building the field draws a few hundred numbers from this generator, after
   * which sampling it draws none — the field is a fixed landscape, and the
   * same point always gives the same value.
   *
   * @example
   * ```ts
   * const noise = rng.valueNoise()
   * noise.at(x * 4, y * 4) // -1 to 1, drifting across the canvas
   * ```
   */
  valueNoise(): NoiseField {
    return valueNoise(this.random);
  }

  /**
   * A seeded field of gradient (Perlin) noise: a random direction at every
   * lattice point, with the field falling to zero at each of them. More even,
   * and with more structure, than {@link RNG.valueNoise}.
   *
   * @example
   * ```ts
   * const noise = rng.perlinNoise()
   * noise.at(x * 3, y * 3) // A landscape
   * noise.at(x * 3, y * 3, t) // The same, with the third dimension as time
   * noise.fbm({ octaves: 6 }).at(x, y) // Detail at every scale
   * ```
   */
  perlinNoise(): NoiseField {
    return perlinNoise(this.random);
  }

  /**
   * A random walk: a path of `steps` steps. The first goes in `heading`, or in
   * a random direction; each one after it blends the direction of the last
   * with a fresh random heading.
   *
   * `momentum` is what makes it a walk rather than a scatter — at 0 every step
   * is independent, and nearer 1 the line turns slowly and keeps going the way
   * it was going. `drift` adds a constant nudge on top.
   *
   * @returns The path, starting with `start`, so `steps + 1` points long
   * @throws Error if the steps are not a non-negative integer, the momentum is
   * outside `[0, 1]`, or the step size is negative
   * @example
   * ```ts
   * for (const [x, y] of rng.walk({ steps: 200, stepSize: 0.01, momentum: 0.9 })) {
   *   lineTo(x, y)
   * }
   * ```
   */
  walk(config: WalkConfig): Vec2[] {
    return walk(this.random, config);
  }
}
