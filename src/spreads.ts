/**
 * Evenly spread point sets: cheaper than Poisson disk sampling, and more even
 * than uniformly random points.
 *
 * A jittered grid puts one random point in every cell of a grid; a quasi-random
 * sequence fills the region in an order designed never to leave gaps. Both
 * take a source of uniform randomness, as {@link module:vectors} do.
 * @module spreads
 */

import type { Point2D, RandomSource } from "./types.js";

/** The low discrepancy sequences {@link quasiRandomPoints} can follow. */
export type QuasiRandomSequence = "r2" | "halton";

/** Where and how many points a {@link quasiRandomPoints} call places. */
export type QuasiRandomConfig = {
  /** How many points */
  n: number;
  /** Width of the region (default: 1) */
  width?: number;
  /** Height of the region (default: 1) */
  height?: number;
  /** Which sequence to follow (default: `"r2"`) */
  sequence?: QuasiRandomSequence;
};

/** The grid a {@link jitteredGridPoints} call fills. */
export type JitteredGridConfig = {
  /** How many cells across */
  columns: number;
  /**
   * How many cells down (default: as many as keep the cells square, given
   * `columns`, `width` and `height`)
   */
  rows?: number;
  /** Width of the region (default: 1) */
  width?: number;
  /** Height of the region (default: 1) */
  height?: number;
  /**
   * How far each point may wander from the centre of its cell, from 0 (a
   * regular grid) to 1 (anywhere in the cell) (default: 1)
   */
  jitter?: number;
};

/**
 * The plastic number: the real root of `x³ = x + 1`, whose powers give the
 * most evenly spread two dimensional additive sequence there is.
 * @internal
 */
const PLASTIC = 1.324717957244746;
const R2_A1 = 1 / PLASTIC;
const R2_A2 = 1 / (PLASTIC * PLASTIC);

/**
 * The fractional part, always in `[0, 1)`.
 * @internal
 */
function fract(x: number): number {
  return x - Math.floor(x);
}

/**
 * The `i`th term of the van der Corput sequence in `base`: the digits of `i`
 * mirrored about the point.
 * @internal
 */
function radicalInverse(i: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

/**
 * Quasi-random points: a low discrepancy sequence, which spreads out as
 * evenly as it can however many points you take, so a prefix of it never
 * clumps or leaves a gap the way uniform random points do.
 *
 * `"r2"` (the default) is Roberts' additive sequence built on the plastic
 * number — the most even of the simple ones, with no visible lattice. `"halton"`
 * is the classic, mirroring the digits of the index in bases 2 and 3.
 *
 * The sequences themselves are fixed; the randomness is a single offset
 * applied to every point, wrapping around the region (a Cranley–Patterson
 * rotation). So it costs exactly two draws, whatever `n` is, and different
 * seeds give different, equally even, sets.
 *
 * Usually you want {@link RNG.quasiRandomPoints}, which supplies a seeded
 * source for you.
 *
 * @throws Error if `n` is not a non-negative integer, or the width or height
 * is not positive
 * @example
 * ```ts
 * quasiRandomPoints(Math.random, { n: 500 })
 * quasiRandomPoints(Math.random, { n: 500, sequence: "halton", height: 0.75 })
 * ```
 */
export function quasiRandomPoints(rng: RandomSource, config: QuasiRandomConfig): Point2D[] {
  const { n, width = 1, height = 1, sequence = "r2" } = config;
  if (!Number.isInteger(n) || n < 0) throw new Error("n must be a non-negative integer");
  if (width <= 0 || height <= 0) throw new Error("Width and height must be positive");

  const ox = rng();
  const oy = rng();
  const points: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const u = sequence === "halton" ? radicalInverse(i + 1, 2) : (i + 1) * R2_A1;
    const v = sequence === "halton" ? radicalInverse(i + 1, 3) : (i + 1) * R2_A2;
    points.push([fract(u + ox) * width, fract(v + oy) * height]);
  }

  return points;
}

/**
 * A jittered grid: one random point in every cell of a grid, so points never
 * clump more than a cell's worth and never leave a gap more than two cells
 * wide. Stratified sampling, in the statistician's terms.
 *
 * `jitter` slides between a regular grid at 0 and a point anywhere in its cell
 * at 1. Points come back a row at a time, from the top left; each takes two
 * draws.
 *
 * Usually you want {@link RNG.jitteredGridPoints}, which supplies a seeded
 * source for you.
 *
 * @throws Error if `columns` or `rows` is not a positive integer, the width or
 * height is not positive, or `jitter` is outside `[0, 1]`
 * @example
 * ```ts
 * jitteredGridPoints(Math.random, { columns: 20 }) // 400 points in the unit square
 * jitteredGridPoints(Math.random, { columns: 20, height: 0.5 }) // 20 × 10
 * ```
 */
export function jitteredGridPoints(rng: RandomSource, config: JitteredGridConfig): Point2D[] {
  const { columns, width = 1, height = 1, jitter = 1 } = config;
  if (width <= 0 || height <= 0) throw new Error("Width and height must be positive");
  const rows = config.rows ?? Math.max(1, Math.round((columns * height) / width));
  if (!Number.isInteger(columns) || columns < 1) {
    throw new Error("columns must be a positive integer");
  }
  if (!Number.isInteger(rows) || rows < 1) throw new Error("rows must be a positive integer");
  if (jitter < 0 || jitter > 1) throw new Error("jitter must be between 0 and 1");

  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const points: Point2D[] = [];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      points.push([
        (i + 0.5 + jitter * (rng() - 0.5)) * cellWidth,
        (j + 0.5 + jitter * (rng() - 0.5)) * cellHeight,
      ]);
    }
  }

  return points;
}
