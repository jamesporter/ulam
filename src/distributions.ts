/**
 * Standalone implementations of the random distributions {@link RNG} exposes.
 *
 * Each takes a source of uniform randomness — `rng.random`, `Math.random`, or
 * anything else returning numbers in `[0, 1)` — so they can be driven from a
 * generator other than this library's own.
 * @module distributions
 */

import type { RandomSource } from "./types.js";

/**
 * Gaussian (normal) random number, default mean 0 and standard deviation 1.
 *
 * Box-Muller, using two uniform draws per number.
 *
 * @example
 * ```ts
 * gaussian(Math.random, { mean: 100, sd: 15 })
 * ```
 */
export function gaussian(rng: RandomSource, config?: { mean?: number; sd?: number }): number {
  const { mean = 0, sd = 1 } = config ?? {};
  // rng() is in [0, 1) so use 1 - a to keep the log argument in (0, 1]
  const a = rng();
  const b = rng();
  const n = Math.sqrt(-2.0 * Math.log(1 - a)) * Math.cos(2.0 * Math.PI * b);
  return mean + n * sd;
}

/**
 * Poisson random number; lambda (the mean and the variance) is the only
 * parameter.
 *
 * @throws Error if lambda is negative
 */
export function poisson(rng: RandomSource, lambda: number): number {
  if (lambda < 0) throw new Error("lambda must not be negative");
  const limit = Math.exp(-lambda);
  let prod = rng();
  let n = 0;
  while (prod >= limit) {
    n++;
    prod *= rng();
  }
  return n;
}

/**
 * A weighted coin toss: `true` with probability `p`, which defaults to a fair
 * half.
 */
export function bernoulli(rng: RandomSource, p = 0.5): boolean {
  return rng() < p;
}

/**
 * Exponential random number: the waiting time until the next event when they
 * arrive at `rate` per unit, so with mean `1 / rate`.
 *
 * @throws Error if the rate is not positive
 * @example
 * ```ts
 * exponential(Math.random) // Mean 1
 * exponential(Math.random, { rate: 4 }) // Mean 0.25
 * ```
 */
export function exponential(rng: RandomSource, config?: { rate?: number }): number {
  const { rate = 1 } = config ?? {};
  if (rate <= 0) throw new Error("rate must be positive");
  // 1 - rng() is in (0, 1], so the log is always defined
  return -Math.log(1 - rng()) / rate;
}

/**
 * Log-normal random number: `exp` of a gaussian, so always positive and
 * skewed to the right. `mu` and `sigma` describe the underlying gaussian, not
 * the values themselves.
 *
 * Good for sizes and scales, where you want mostly small things and
 * occasionally a very large one.
 */
export function logNormal(rng: RandomSource, config?: { mu?: number; sigma?: number }): number {
  const { mu = 0, sigma = 1 } = config ?? {};
  return Math.exp(gaussian(rng, { mean: mu, sd: sigma }));
}

/**
 * Cauchy random number: bell shaped but very heavy tailed, with no mean and no
 * variance. Wild outliers are the point.
 *
 * @throws Error if the scale is not positive
 */
export function cauchy(rng: RandomSource, config?: { median?: number; scale?: number }): number {
  const { median = 0, scale = 1 } = config ?? {};
  if (scale <= 0) throw new Error("scale must be positive");
  return median + scale * Math.tan(Math.PI * (rng() - 0.5));
}

/**
 * Laplace (double exponential) random number: a sharp peak at the mean with
 * fatter tails than a gaussian.
 *
 * @throws Error if the scale is not positive
 */
export function laplace(rng: RandomSource, config?: { mean?: number; scale?: number }): number {
  const { mean = 0, scale = 1 } = config ?? {};
  if (scale <= 0) throw new Error("scale must be positive");
  const u = rng() - 0.5;
  return mean - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Pareto random number: a power law, at least `scale` and heavy tailed above
 * it. Smaller `shape` means a heavier tail.
 *
 * @throws Error if the shape or scale is not positive
 * @example
 * ```ts
 * pareto(Math.random, { shape: 1.5 }) // Mostly near 1, occasionally huge
 * ```
 */
export function pareto(rng: RandomSource, config: { shape: number; scale?: number }): number {
  const { shape, scale = 1 } = config;
  if (shape <= 0) throw new Error("shape must be positive");
  if (scale <= 0) throw new Error("scale must be positive");
  return scale / Math.pow(1 - rng(), 1 / shape);
}

/**
 * Weibull random number. `shape` below 1 crowds values near zero, at 1 it is
 * exponential, and above 1 it becomes a hump around `scale`.
 *
 * @throws Error if the shape or scale is not positive
 */
export function weibull(rng: RandomSource, config: { shape: number; scale?: number }): number {
  const { shape, scale = 1 } = config;
  if (shape <= 0) throw new Error("shape must be positive");
  if (scale <= 0) throw new Error("scale must be positive");
  return scale * Math.pow(-Math.log(1 - rng()), 1 / shape);
}

/**
 * Triangular random number between `min` and `max`, peaking at `mode`. A
 * cheap way to say "around here, but not exactly".
 *
 * @throws Error if the bounds are not ordered, or the mode falls outside them
 * @example
 * ```ts
 * triangular(Math.random, { min: 0, max: 10, mode: 8 })
 * ```
 */
export function triangular(
  rng: RandomSource,
  config?: { min?: number; max?: number; mode?: number },
): number {
  const { min = 0, max = 1 } = config ?? {};
  const { mode = (min + max) / 2 } = config ?? {};
  if (max <= min) throw new Error("max must be greater than min");
  if (mode < min || mode > max) throw new Error("mode must be between min and max");

  const u = rng();
  const split = (mode - min) / (max - min);
  return u < split
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

/**
 * Gamma random number with the given `shape` (k) and `scale` (θ), so with mean
 * `shape * scale`. The building block for {@link beta} and
 * {@link chiSquared}.
 *
 * Marsaglia and Tsang's method, with Johnk's boost for shapes below one.
 *
 * @throws Error if the shape or scale is not positive
 */
export function gamma(rng: RandomSource, config: { shape: number; scale?: number }): number {
  const { shape, scale = 1 } = config;
  if (shape <= 0) throw new Error("shape must be positive");
  if (scale <= 0) throw new Error("scale must be positive");

  if (shape < 1) {
    // Boost a shape + 1 draw back down, which is cheaper than rejecting
    const boosted = gammaAtLeastOne(rng, shape + 1);
    return scale * boosted * Math.pow(1 - rng(), 1 / shape);
  }
  return scale * gammaAtLeastOne(rng, shape);
}

/**
 * Marsaglia-Tsang squeeze, valid only for shapes of at least 1.
 * @internal
 */
function gammaAtLeastOne(rng: RandomSource, shape: number): number {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (;;) {
    let x: number;
    let v: number;
    do {
      x = gaussian(rng);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = 1 - rng(); // (0, 1], so the log is always defined
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Beta random number in `[0, 1]`, with mean `alpha / (alpha + beta)`. Both
 * parameters above 1 gives a hump, both below gives a U.
 *
 * Handy for proportions: how much of a shape to fill, how far along an edge to
 * put something.
 *
 * @throws Error if either parameter is not positive
 */
export function beta(rng: RandomSource, config: { alpha: number; beta: number }): number {
  const { alpha, beta: b } = config;
  if (alpha <= 0) throw new Error("alpha must be positive");
  if (b <= 0) throw new Error("beta must be positive");

  const x = gamma(rng, { shape: alpha });
  const y = gamma(rng, { shape: b });
  // Both are positive, but underflow for tiny shapes could make both zero
  const total = x + y;
  return total === 0 ? 0.5 : x / total;
}

/**
 * Chi-squared random number with `df` degrees of freedom, so with mean `df`.
 *
 * @throws Error if the degrees of freedom are not positive
 */
export function chiSquared(rng: RandomSource, df: number): number {
  if (df <= 0) throw new Error("df must be positive");
  return gamma(rng, { shape: df / 2, scale: 2 });
}

/**
 * Student's t random number with `df` degrees of freedom: a gaussian with
 * heavier tails, converging on one as `df` grows.
 *
 * @throws Error if the degrees of freedom are not positive
 */
export function studentT(rng: RandomSource, df: number): number {
  if (df <= 0) throw new Error("df must be positive");
  return gaussian(rng) / Math.sqrt(chiSquared(rng, df) / df);
}

/**
 * Binomial random number: how many of `n` independent trials succeed, each
 * with probability `p`.
 *
 * Simulates the trials directly, so it costs `n` draws.
 *
 * @throws Error if `n` is not a non-negative integer, or `p` is outside [0, 1]
 * @example
 * ```ts
 * binomial(Math.random, { n: 10, p: 0.5 }) // 0 to 10, usually near 5
 * ```
 */
export function binomial(rng: RandomSource, config: { n: number; p: number }): number {
  const { n, p } = config;
  if (!Number.isInteger(n) || n < 0) throw new Error("n must be a non-negative integer");
  if (p < 0 || p > 1) throw new Error("p must be between 0 and 1");

  let successes = 0;
  for (let i = 0; i < n; i++) {
    if (rng() < p) successes++;
  }
  return successes;
}

/**
 * Geometric random number: how many failures come before the first success,
 * with each trial succeeding with probability `p`. So 0 is the most likely
 * result whenever `p` is above a half.
 *
 * @throws Error if `p` is not in (0, 1]
 */
export function geometric(rng: RandomSource, p: number): number {
  if (p <= 0 || p > 1) throw new Error("p must be greater than 0 and at most 1");
  if (p === 1) return 0;
  return Math.floor(Math.log(1 - rng()) / Math.log(1 - p));
}

/**
 * An index chosen in proportion to the given weights. Weights are relative, so
 * they need not sum to anything in particular, but must not be negative.
 *
 * @throws Error if the weights are empty, negative, or do not sum to something
 * positive
 * @example
 * ```ts
 * categorical(Math.random, [5, 3, 2]) // 0 half the time, 1 a third, 2 a fifth
 * ```
 */
export function categorical(rng: RandomSource, weights: number[]): number {
  if (weights.length === 0) throw new Error("Must have at least one weight");

  let total = 0;
  for (const weight of weights) {
    if (weight < 0) throw new Error("Weights must not be negative");
    total += weight;
  }
  if (total <= 0) throw new Error("Must be positive total");

  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] > r) return i;
    r -= weights[i];
  }
  // Only reachable through floating point drift at the very end of the range
  return weights.length - 1;
}
