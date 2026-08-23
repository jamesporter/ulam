/**
 * ulam-prng: seeded random number generation for generative art.
 * @module ulam-prng
 */

export { RNG } from "./rng.js";
export type { RNGState } from "./rng.js";
export { poissonDiskPoints, PoissonDiskSampling } from "./poissonDisk.js";
export {
  bernoulli,
  beta,
  binomial,
  categorical,
  cauchy,
  chiSquared,
  exponential,
  gamma,
  gaussian,
  geometric,
  laplace,
  logNormal,
  pareto,
  poisson,
  studentT,
  triangular,
  weibull,
} from "./distributions.js";
export {
  gaussianVec2,
  gaussianVec3,
  gaussianVec4,
  inUnitBall,
  inUnitDisc,
  onUnitCircle,
  onUnitSphere,
  perturbVec2,
  perturbVec3,
  uniformVec2,
  uniformVec3,
  uniformVec4,
} from "./vectors.js";
export type { GaussianVecConfig, UniformVecConfig } from "./vectors.js";
export type { Point2D, RandomSource, Vec2, Vec3, Vec4, Vector2D } from "./types.js";
