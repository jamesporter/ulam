/**
 * A seedable random number generator, plus the higher level randomness helpers
 * that generative art actually reaches for.
 *
 * The core is a PCG (Permuted Congruential Generator): fast, small, and with
 * excellent statistical properties. Based on https://github.com/thomcc/pcg-random
 * See also http://www.pcg-random.org/
 * @module rng
 */

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
import { poissonDiskPoints } from "./poissonDisk.js";
import type { Point2D } from "./types.js";

/**
 * The four 32-bit words that fully describe a generator's position in its
 * stream: `[stateHi, stateLo, incHi, incLo]`.
 */
export type RNGState = [number, number, number, number];

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
   * @param seedHi - High 32 bits of the seed (optional, defaults to random)
   * @param seedLo - Low 32 bits of the seed (optional)
   * @param incHi - High 32 bits of the increment (optional, use default for best results)
   * @param incLo - Low 32 bits of the increment (optional, use default for best results)
   * @example
   * ```ts
   * const rng1 = new RNG() // Random seed
   * const rng2 = new RNG(42) // Seeded with 42
   * const rng3 = new RNG(0x12345678, 0x9abcdef0) // Full 64-bit seed
   * ```
   */
  constructor(
    seedHi?: number,
    seedLo?: number,
    incHi: number = DEFAULT_INC_HI,
    incLo: number = DEFAULT_INC_LO,
  ) {
    this.state = new Int32Array(4);
    this.seed(seedHi, seedLo, incHi, incLo);
  }

  /**
   * Re-seeds this generator in place, discarding its current position in the
   * stream. Equivalent to constructing a fresh `RNG` with the same arguments,
   * but keeps any references to this instance valid.
   *
   * @param seedHi - High 32 bits of the seed (optional, defaults to random)
   * @param seedLo - Low 32 bits of the seed (optional)
   * @param incHi - High 32 bits of the increment (optional)
   * @param incLo - Low 32 bits of the increment (optional)
   * @example
   * ```ts
   * rng.seed(42) // Back to a known starting point
   * ```
   */
  seed(
    seedHi?: number,
    seedLo?: number,
    incHi: number = DEFAULT_INC_HI,
    incLo: number = DEFAULT_INC_LO,
  ): void {
    let hi: number;
    let lo: number;

    if (seedLo === undefined && seedHi === undefined) {
      lo = (Math.random() * 0xffffffff) >>> 0;
      hi = 0;
    } else if (seedLo === undefined) {
      lo = seedHi as number;
      hi = 0;
    } else {
      lo = seedLo;
      hi = seedHi as number;
    }

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
    const {
      at: [x, y],
      magnitude = 0.1,
    } = config;
    return [x + magnitude * (this.number() - 0.5), y + magnitude * (this.number() - 0.5)];
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
    const { mean = 0, sd = 1 } = config ?? {};
    // number() is in [0, 1) so use 1 - a to keep the log argument in (0, 1]
    const a = this.number();
    const b = this.number();
    const n = Math.sqrt(-2.0 * Math.log(1 - a)) * Math.cos(2.0 * Math.PI * b);
    return mean + n * sd;
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
    const limit = Math.exp(-lambda);
    let prod = this.number();
    let n = 0;
    while (prod >= limit) {
      n++;
      prod *= this.number();
    }
    return n;
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
}
