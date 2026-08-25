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

/**
 * Dirichlet random vector: a set of proportions, each positive and all summing
 * to one. `alpha` gives one concentration per share; equal values give shares
 * that are all alike, values below one push the mass into a few of them, and
 * values above one even them out.
 *
 * The natural way to split something — an area, a palette, a budget — into
 * random parts.
 *
 * @throws Error if `alpha` is empty, or any concentration is not positive
 * @example
 * ```ts
 * dirichlet(Math.random, [1, 1, 1]) // Three shares, any split equally likely
 * dirichlet(Math.random, [0.2, 0.2, 0.2]) // Usually one share takes most of it
 * dirichlet(Math.random, [8, 8, 8]) // Three near equal thirds
 * ```
 */
export function dirichlet(rng: RandomSource, alpha: number[]): number[] {
  if (alpha.length === 0) throw new Error("Must have at least one concentration");

  const draws: number[] = [];
  let total = 0;
  for (const a of alpha) {
    if (a <= 0) throw new Error("Concentrations must be positive");
    const g = gamma(rng, { shape: a });
    draws.push(g);
    total += g;
  }

  // Every draw can underflow to zero for tiny concentrations; share it out
  if (total === 0) return draws.map(() => 1 / alpha.length);
  return draws.map((g) => g / total);
}

/**
 * Zipf random number: a rank from 1 to `n`, where rank `k` comes up in
 * proportion to `k ** -exponent`. The first rank dominates, the second gets
 * about half as much, and the tail is long but bounded.
 *
 * How sizes tend to fall when they follow an order: city populations, word
 * frequencies, the biggest shape on the canvas and everything after it.
 *
 * Sampled by rejection inversion (Hörmann and Derflinger), so cost does not
 * grow with `n`.
 *
 * @param config.n - How many ranks there are; the largest value it can return
 * @param config.exponent - How fast the ranks fall away (default: 1)
 * @throws Error if `n` is not a positive integer, or the exponent is not positive
 * @example
 * ```ts
 * zipf(Math.random, { n: 100 }) // Mostly 1 and 2, occasionally far down the list
 * zipf(Math.random, { n: 100, exponent: 2 }) // Falls away faster still
 * ```
 */
export function zipf(rng: RandomSource, config: { n: number; exponent?: number }): number {
  const { n, exponent = 1 } = config;
  if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
  if (exponent <= 0) throw new Error("exponent must be positive");
  if (n === 1) return 1;

  // H is the integral of the density k ** -exponent, so inverting it maps a
  // uniform draw onto a rank; the rejection step corrects for the difference
  // between the smooth curve and the steps it stands in for.
  const hIntegral = (x: number): number => {
    const logX = Math.log(x);
    return expm1OverX((1 - exponent) * logX) * logX;
  };
  const hIntegralInverse = (x: number): number => {
    const t = Math.max(-1, x * (1 - exponent));
    return Math.exp(log1pOverX(t) * x);
  };
  const h = (x: number): number => Math.exp(-exponent * Math.log(x));

  const hIntegralAtHalf = hIntegral(1.5) - 1;
  const hIntegralAtEnd = hIntegral(n + 0.5);
  // The widest the accepted band can be, used as a cheap first test below
  const threshold = 2 - hIntegralInverse(hIntegral(2.5) - h(2));

  for (;;) {
    const u = hIntegralAtEnd + rng() * (hIntegralAtHalf - hIntegralAtEnd);
    const x = hIntegralInverse(u);
    let k = Math.floor(x + 0.5);
    if (k < 1) k = 1;
    else if (k > n) k = n;

    if (k - x <= threshold || u >= hIntegral(k + 0.5) - h(k)) return k;
  }
}

/**
 * `(exp(x) - 1) / x`, computed so that it stays accurate as `x` approaches
 * zero, where the difference of two nearly equal numbers would otherwise lose
 * every significant digit.
 * @internal
 */
function expm1OverX(x: number): number {
  if (Math.abs(x) > 1e-8) return Math.expm1(x) / x;
  return 1 + x * 0.5;
}

/**
 * `log(1 + x) / x`, to the same end.
 * @internal
 */
function log1pOverX(x: number): number {
  if (Math.abs(x) > 1e-8) return Math.log1p(x) / x;
  return 1 - x * 0.5;
}

/**
 * Truncated gaussian: a normal draw confined to `[min, max]`, drawn from the
 * part of the bell inside those bounds rather than clamped onto them.
 *
 * Clamping would pile values up on the ends; this leaves the shape intact,
 * however narrow the window, and always costs exactly one uniform draw.
 *
 * Bounds are optional either side, so `{ min: 0 }` is a positive-only normal.
 *
 * @throws Error if the standard deviation is not positive, if `min` is not
 * below `max`, or if the bounds are so far out that no draw could land in them
 * @example
 * ```ts
 * truncatedGaussian(Math.random, { mean: 0.5, sd: 0.2, min: 0, max: 1 })
 * truncatedGaussian(Math.random, { min: 0 }) // Standard normal, positive half
 * ```
 */
export function truncatedGaussian(
  rng: RandomSource,
  config?: { mean?: number; sd?: number; min?: number; max?: number },
): number {
  const {
    mean = 0,
    sd = 1,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
  } = config ?? {};
  if (sd <= 0) throw new Error("sd must be positive");
  if (!(min < max)) throw new Error("min must be below max");

  const lo = normalCdf((min - mean) / sd);
  const hi = normalCdf((max - mean) / sd);
  if (hi <= lo) {
    throw new Error("The bounds are too far into the tail to draw from");
  }

  const u = lo + rng() * (hi - lo);
  const z = normalQuantile(u);
  // Guard against a quantile that rounds a hair outside its own bounds
  return Math.min(max, Math.max(min, mean + sd * z));
}

/**
 * The standard normal CDF: the share of a standard normal below `x`.
 * @internal
 */
function normalCdf(x: number): number {
  if (x === Number.NEGATIVE_INFINITY) return 0;
  if (x === Number.POSITIVE_INFINITY) return 1;
  return 0.5 * erfc(-x / Math.SQRT2);
}

/**
 * The complementary error function, by the Chebyshev fit of Numerical Recipes.
 * Accurate to better than 1.2e-7 everywhere.
 * @internal
 */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;

  const coefficients = [
    -1.3026537197817094, 6.419697923564902e-1, 1.9476473204185836e-2, -9.56151478680863e-3,
    -9.46595344482036e-4, 3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5,
    -1.624290004647e-6, 1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-12, -6.886027e-12,
    8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15,
  ];

  let d = 0;
  let dd = 0;
  for (let i = coefficients.length - 1; i > 0; i--) {
    const tmp = d;
    d = ty * d - dd + coefficients[i];
    dd = tmp;
  }
  const value = t * Math.exp(-z * z + 0.5 * (coefficients[0] + ty * d) - dd);
  return x >= 0 ? value : 2 - value;
}

/**
 * The standard normal quantile (probit): the `p`th percentile of a standard
 * normal. Acklam's rational approximation, refined by one Halley step against
 * {@link normalCdf}.
 * @internal
 */
function normalQuantile(p: number): number {
  if (p <= 0) return Number.NEGATIVE_INFINITY;
  if (p >= 1) return Number.POSITIVE_INFINITY;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const low = 0.02425;
  let x: number;

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - low) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  // One Halley step, which takes the approximation to the accuracy of the CDF
  const e = normalCdf(x) - p;
  const density = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  if (density > 0) {
    const t = e / density;
    x = x - t / (1 + (x * t) / 2);
  }
  return x;
}
