/**
 * Vector valued randomness: uniform and gaussian vectors, random directions,
 * and points inside discs and balls.
 *
 * As with {@link module:distributions}, each takes a source of uniform
 * randomness, so they can be driven from a generator other than this
 * library's own. {@link RNG} exposes all of them as methods.
 * @module vectors
 */

import { gaussian } from "./distributions.js";
import type { RandomSource, Vec2, Vec3, Vec4 } from "./types.js";

/** Bounds for a uniformly sampled vector; every component shares them. */
export type UniformVecConfig = { from?: number; to?: number };

/** An isotropic gaussian: a centre, and one standard deviation for every axis. */
export type GaussianVecConfig<V> = { mean?: V; sd?: number };

/**
 * A uniform random `[x, y]`, by default in the unit square.
 *
 * @example
 * ```ts
 * uniformVec2(Math.random) // In [0, 1) x [0, 1)
 * uniformVec2(Math.random, { from: -1, to: 1 })
 * ```
 */
export function uniformVec2(rng: RandomSource, config?: UniformVecConfig): Vec2 {
  const { from = 0, to = 1 } = config ?? {};
  const d = to - from;
  return [from + rng() * d, from + rng() * d];
}

/**
 * A uniform random `[x, y, z]`, by default in the unit cube.
 */
export function uniformVec3(rng: RandomSource, config?: UniformVecConfig): Vec3 {
  const { from = 0, to = 1 } = config ?? {};
  const d = to - from;
  return [from + rng() * d, from + rng() * d, from + rng() * d];
}

/**
 * A uniform random `[x, y, z, w]`, by default in the unit hypercube.
 */
export function uniformVec4(rng: RandomSource, config?: UniformVecConfig): Vec4 {
  const { from = 0, to = 1 } = config ?? {};
  const d = to - from;
  return [from + rng() * d, from + rng() * d, from + rng() * d, from + rng() * d];
}

/**
 * A gaussian `[x, y]`: independent normal components, so a round blur about
 * `mean`.
 *
 * @example
 * ```ts
 * gaussianVec2(Math.random, { mean: [0.5, 0.5], sd: 0.1 })
 * ```
 */
export function gaussianVec2(rng: RandomSource, config?: GaussianVecConfig<Vec2>): Vec2 {
  const { mean = [0, 0], sd = 1 } = config ?? {};
  return [gaussian(rng, { mean: mean[0], sd }), gaussian(rng, { mean: mean[1], sd })];
}

/**
 * A gaussian `[x, y, z]`: independent normal components, so a spherical blur
 * about `mean`.
 */
export function gaussianVec3(rng: RandomSource, config?: GaussianVecConfig<Vec3>): Vec3 {
  const { mean = [0, 0, 0], sd = 1 } = config ?? {};
  return [
    gaussian(rng, { mean: mean[0], sd }),
    gaussian(rng, { mean: mean[1], sd }),
    gaussian(rng, { mean: mean[2], sd }),
  ];
}

/**
 * A gaussian `[x, y, z, w]`: independent normal components about `mean`.
 */
export function gaussianVec4(rng: RandomSource, config?: GaussianVecConfig<Vec4>): Vec4 {
  const { mean = [0, 0, 0, 0], sd = 1 } = config ?? {};
  return [
    gaussian(rng, { mean: mean[0], sd }),
    gaussian(rng, { mean: mean[1], sd }),
    gaussian(rng, { mean: mean[2], sd }),
    gaussian(rng, { mean: mean[3], sd }),
  ];
}

/**
 * A uniformly random unit vector in two dimensions: a direction, with no
 * preference for the diagonals.
 *
 * @example
 * ```ts
 * const [dx, dy] = onUnitCircle(Math.random)
 * ```
 */
export function onUnitCircle(rng: RandomSource): Vec2 {
  const angle = rng() * Math.PI * 2;
  return [Math.cos(angle), Math.sin(angle)];
}

/**
 * A uniformly random point inside a disc, by default the unit one. Uniform by
 * area, so points do not bunch up in the middle.
 *
 * @throws Error if the radius is negative
 */
export function inUnitDisc(rng: RandomSource, config?: { radius?: number }): Vec2 {
  const { radius = 1 } = config ?? {};
  if (radius < 0) throw new Error("radius must not be negative");
  const r = radius * Math.sqrt(rng());
  const angle = rng() * Math.PI * 2;
  return [r * Math.cos(angle), r * Math.sin(angle)];
}

/**
 * A uniformly random unit vector in three dimensions: a direction, uniform
 * over the sphere rather than over latitude and longitude (which would crowd
 * the poles).
 */
export function onUnitSphere(rng: RandomSource): Vec3 {
  const z = 2 * rng() - 1;
  const angle = rng() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [r * Math.cos(angle), r * Math.sin(angle), z];
}

/**
 * A uniformly random point inside a ball, by default the unit one. Uniform by
 * volume.
 *
 * @throws Error if the radius is negative
 */
export function inUnitBall(rng: RandomSource, config?: { radius?: number }): Vec3 {
  const { radius = 1 } = config ?? {};
  if (radius < 0) throw new Error("radius must not be negative");
  const [x, y, z] = onUnitSphere(rng);
  const r = radius * Math.cbrt(rng());
  return [r * x, r * y, r * z];
}

/**
 * Perturb a two dimensional point by a uniform random amount on each axis, by
 * default in -0.05 to 0.05.
 */
export function perturbVec2(rng: RandomSource, config: { at: Vec2; magnitude?: number }): Vec2 {
  const {
    at: [x, y],
    magnitude = 0.1,
  } = config;
  return [x + magnitude * (rng() - 0.5), y + magnitude * (rng() - 0.5)];
}

/**
 * Perturb a three dimensional point by a uniform random amount on each axis,
 * by default in -0.05 to 0.05.
 */
export function perturbVec3(rng: RandomSource, config: { at: Vec3; magnitude?: number }): Vec3 {
  const {
    at: [x, y, z],
    magnitude = 0.1,
  } = config;
  return [
    x + magnitude * (rng() - 0.5),
    y + magnitude * (rng() - 0.5),
    z + magnitude * (rng() - 0.5),
  ];
}
