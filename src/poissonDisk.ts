/**
 * Poisson disk sampling for generating evenly-distributed random points.
 * Creates points that maintain a minimum distance from each other, resulting in
 * a more uniform and visually pleasing distribution than pure random placement.
 * @module poissonDisk
 */

import type { Vec2 } from "./types.js";

/**
 * The spacing between Poisson disk points: one distance for the whole region,
 * or a distance that depends on where you are, for density that varies across
 * the canvas.
 */
export type PoissonDiskSpacing = number | ((at: Vec2) => number);

/** The optional extras for a {@link PoissonDiskSampling}. */
export type PoissonDiskOptions = {
  /**
   * The largest spacing `minDist` can give, which must be supplied when it is
   * a function; anything larger is capped at this.
   */
  maxDist?: number;
  /**
   * Which points of the region to fill: candidates for which this is false
   * are rejected, so the points take the shape it describes.
   */
  contains?: (at: Vec2) => boolean;
};

/**
 * How many fresh random places to try, when sampling inside a `contains`
 * shape, before deciding there is nowhere left to start from.
 * @internal
 */
const RESTART_ATTEMPTS = 1000;

/**
 * Generates Poisson disk sampled points within a rectangular region.
 * Points are randomly distributed but maintain a minimum distance from each other.
 *
 * Usually you want {@link RNG.poissonDiskPoints}, which supplies a seeded `rng`
 * for you; use this directly if you want to drive it from another source of
 * randomness.
 *
 * @param config - Configuration for point generation
 * @param config.width - Width of the sampling region
 * @param config.height - Height of the sampling region
 * @param config.minDist - Minimum distance between any two points, or a
 * function giving it at each point
 * @param config.maxDist - Upper bound on `minDist`, required when that is a function
 * @param config.contains - Restricts the points to where this is true
 * @param config.rng - Random number generator function (returns 0-1)
 * @param config.k - Number of attempts to place each point (higher = denser, default: 30)
 * @returns Array of generated points
 * @example
 * ```ts
 * const points = poissonDiskPoints({
 *   width: 1,
 *   height: 1,
 *   minDist: 0.05,
 *   rng: () => Math.random(),
 *   k: 30,
 * })
 * ```
 */
export function poissonDiskPoints({
  width,
  height,
  minDist,
  maxDist,
  contains,
  rng,
  k = 30,
}: {
  width: number;
  height: number;
  minDist: PoissonDiskSpacing;
  maxDist?: number;
  contains?: (at: Vec2) => boolean;
  rng: () => number;
  k?: number;
}): Vec2[] {
  const pds = new PoissonDiskSampling(width, height, minDist, k, { maxDist, contains });
  pds.generatePoints(rng);
  return pds.points;
}

/**
 * Implements the Poisson disk sampling algorithm.
 * Uses Bridson's algorithm with a spatial grid for efficient neighbour checking.
 *
 * With a function for `minDist`, each point keeps its neighbours at the
 * average of their two spacings, so density follows the function smoothly.
 * With `contains`, points are confined to a shape, and the sampler restarts
 * from fresh random places when it runs out of room, so that separate islands
 * of the shape are filled too.
 *
 * @example
 * ```ts
 * const sampler = new PoissonDiskSampling(1, 1, 0.05, 30)
 * const points = sampler.generatePoints(() => Math.random())
 * ```
 */
export class PoissonDiskSampling {
  /** Indices into {@link points}, bucketed by grid cell. */
  private grid: (number[] | undefined)[];
  /** Generated points */
  points: Vec2[];
  /** The spacing each point keeps, parallel to {@link points}. */
  private radii: number[];
  private spawnPoints: number[];
  private cellSize: number;
  private columns: number;
  private rows: number;
  private maxDist: number;
  private contains?: (at: Vec2) => boolean;

  /**
   * Creates a new Poisson disk sampler.
   *
   * @param width - Width of the sampling region
   * @param height - Height of the sampling region
   * @param minDist - Minimum distance between points, or a function giving it
   * at each point
   * @param k - Number of attempts to place each point
   * @param options - An upper bound on a varying `minDist`, and a shape to fill
   * @throws Error if the width, height or `minDist` is not positive, or
   * `minDist` is a function and `maxDist` is not a positive number
   */
  constructor(
    private width: number,
    private height: number,
    private minDist: PoissonDiskSpacing,
    private k: number,
    options: PoissonDiskOptions = {},
  ) {
    if (width <= 0 || height <= 0) {
      throw new Error("Width and height must be positive");
    }
    if (typeof minDist === "number") {
      if (minDist <= 0) throw new Error("minDist must be positive");
      this.maxDist = minDist;
    } else {
      if (options.maxDist === undefined || !(options.maxDist > 0)) {
        throw new Error("maxDist must be a positive number when minDist is a function");
      }
      this.maxDist = options.maxDist;
    }
    this.contains = options.contains;

    // No two points can be further apart than maxDist and still constrain each
    // other, so a cell that size means only the eight around it need checking
    this.cellSize = this.maxDist;
    this.columns = Math.ceil(this.width / this.cellSize);
    this.rows = Math.ceil(this.height / this.cellSize);
    this.grid = Array.from({ length: this.columns * this.rows }, () => undefined);
    this.points = [];
    this.radii = [];
    this.spawnPoints = [];
  }

  /**
   * Generates the Poisson disk sampled points.
   *
   * @param rng - Random number generator function that returns values between 0 and 1
   * @returns Array of generated points
   * @throws Error if a `minDist` function gives something other than a
   * positive number
   */
  generatePoints(rng: () => number): Vec2[] {
    // Without a shape, the first random place is always valid, and once the
    // spawn list runs dry the rectangle is full
    while (this.start(rng)) {
      while (this.spawnPoints.length > 0) {
        const spawnIndex = Math.floor(rng() * this.spawnPoints.length);
        const spawn = this.spawnPoints[spawnIndex];
        const [sx, sy] = this.points[spawn];
        const spacing = this.radii[spawn];
        let accepted = false;

        for (let i = 0; i < this.k; i++) {
          const angle = rng() * 2 * Math.PI;
          const dist = rng() * spacing + spacing;
          const candidate: Vec2 = [sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist];
          const radius = this.radiusIfValid(candidate);
          if (radius !== undefined) {
            this.add(candidate, radius);
            accepted = true;
            break;
          }
        }

        if (!accepted) {
          this.spawnPoints.splice(spawnIndex, 1);
        }
      }
      if (!this.contains) break;
    }

    return this.points;
  }

  /**
   * Places a point somewhere random to grow from, returning whether it found
   * anywhere: always on the first call for a plain rectangle, and after that
   * only when filling a shape, which may have parts out of reach of the rest.
   * @internal
   */
  private start(rng: () => number): boolean {
    const attempts = this.contains ? RESTART_ATTEMPTS : 1;
    for (let i = 0; i < attempts; i++) {
      const candidate: Vec2 = [rng() * this.width, rng() * this.height];
      const radius = this.radiusIfValid(candidate);
      if (radius !== undefined) {
        this.add(candidate, radius);
        return true;
      }
    }
    return false;
  }

  /** @internal */
  private add(point: Vec2, radius: number): void {
    const index = this.points.length;
    this.points.push(point);
    this.radii.push(radius);
    this.spawnPoints.push(index);
    const cell =
      Math.floor(point[1] / this.cellSize) * this.columns + Math.floor(point[0] / this.cellSize);
    (this.grid[cell] ??= []).push(index);
  }

  /**
   * The spacing a point would keep, if it is valid: within bounds, inside the
   * shape, and far enough from every other point. `undefined` if not.
   * @internal
   */
  private radiusIfValid(point: Vec2): number | undefined {
    const [x, y] = point;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return undefined;
    if (this.contains && !this.contains(point)) return undefined;

    let radius: number;
    if (typeof this.minDist === "number") {
      radius = this.minDist;
    } else {
      radius = this.minDist(point);
      if (!(radius > 0)) throw new Error("minDist must be positive");
      radius = Math.min(radius, this.maxDist);
    }
    const varying = typeof this.minDist !== "number";

    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    const xStart = Math.max(gridX - 1, 0);
    const yStart = Math.max(gridY - 1, 0);
    const xEnd = Math.min(gridX + 1, this.columns - 1);
    const yEnd = Math.min(gridY + 1, this.rows - 1);

    for (let gy = yStart; gy <= yEnd; gy++) {
      for (let gx = xStart; gx <= xEnd; gx++) {
        const bucket = this.grid[gy * this.columns + gx];
        if (!bucket) continue;
        for (const j of bucket) {
          const p = this.points[j];
          const dx = p[0] - x;
          const dy = p[1] - y;
          const required = varying ? (this.radii[j] + radius) / 2 : radius;
          if (Math.sqrt(dx * dx + dy * dy) < required) return undefined;
        }
      }
    }

    return radius;
  }
}
