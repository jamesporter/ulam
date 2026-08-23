/**
 * Poisson disk sampling for generating evenly-distributed random points.
 * Creates points that maintain a minimum distance from each other, resulting in
 * a more uniform and visually pleasing distribution than pure random placement.
 * @module poissonDisk
 */

import type { Point2D } from "./types.js";

/**
 * Euclidean distance between two points.
 * @internal
 */
function distance(a: Point2D, b: Point2D): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

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
 * @param config.minDist - Minimum distance between any two points
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
  rng,
  k = 30,
}: {
  width: number;
  height: number;
  minDist: number;
  rng: () => number;
  k?: number;
}): Point2D[] {
  const pds = new PoissonDiskSampling(width, height, minDist, k);
  pds.generatePoints(rng);
  return pds.points;
}

/**
 * Implements the Poisson disk sampling algorithm.
 * Uses Bridson's algorithm with a spatial grid for efficient neighbour checking.
 *
 * @example
 * ```ts
 * const sampler = new PoissonDiskSampling(1, 1, 0.05, 30)
 * const points = sampler.generatePoints(() => Math.random())
 * ```
 */
export class PoissonDiskSampling {
  private grid: (Point2D | null)[][];
  /** Generated points */
  points: Point2D[];
  private spawnPoints: Point2D[];
  private cellSize: number;

  /**
   * Creates a new Poisson disk sampler.
   *
   * @param width - Width of the sampling region
   * @param height - Height of the sampling region
   * @param minDist - Minimum distance between points
   * @param k - Number of attempts to place each point
   */
  constructor(
    private width: number,
    private height: number,
    private minDist: number,
    private k: number,
  ) {
    if (width <= 0 || height <= 0) {
      throw new Error("Width and height must be positive");
    }
    if (minDist <= 0) {
      throw new Error("minDist must be positive");
    }
    this.cellSize = this.minDist / Math.sqrt(2);
    this.grid = Array.from({ length: Math.ceil(this.height / this.cellSize) }, () =>
      Array.from({ length: Math.ceil(this.width / this.cellSize) }, () => null),
    );
    this.points = [];
    this.spawnPoints = [];
  }

  /**
   * Generates the Poisson disk sampled points.
   *
   * @param rng - Random number generator function that returns values between 0 and 1
   * @returns Array of generated points
   */
  generatePoints(rng: () => number): Point2D[] {
    const initialPoint: Point2D = [rng() * this.width, rng() * this.height];
    this.points.push(initialPoint);
    this.spawnPoints.push(initialPoint);
    this.grid[Math.floor(initialPoint[1] / this.cellSize)][
      Math.floor(initialPoint[0] / this.cellSize)
    ] = initialPoint;

    while (this.spawnPoints.length > 0) {
      const spawnIndex = Math.floor(rng() * this.spawnPoints.length);
      const spawnCentre = this.spawnPoints[spawnIndex];
      let accepted = false;

      for (let i = 0; i < this.k; i++) {
        const angle = rng() * 2 * Math.PI;
        const dir: Point2D = [Math.cos(angle), Math.sin(angle)];
        const dist = rng() * this.minDist + this.minDist;
        const newPoint: Point2D = [spawnCentre[0] + dir[0] * dist, spawnCentre[1] + dir[1] * dist];

        if (this.isValid(newPoint)) {
          this.points.push(newPoint);
          this.spawnPoints.push(newPoint);
          this.grid[Math.floor(newPoint[1] / this.cellSize)][
            Math.floor(newPoint[0] / this.cellSize)
          ] = newPoint;
          accepted = true;
          break;
        }
      }

      if (!accepted) {
        this.spawnPoints.splice(spawnIndex, 1);
      }
    }

    return this.points;
  }

  /**
   * Checks if a candidate point is valid (within bounds and far enough from other points).
   * @internal
   */
  private isValid(point: Point2D): boolean {
    if (point[0] < 0 || point[0] >= this.width || point[1] < 0 || point[1] >= this.height) {
      return false;
    }

    const gridX = Math.floor(point[0] / this.cellSize);
    const gridY = Math.floor(point[1] / this.cellSize);
    const xStart = Math.max(gridX - 2, 0);
    const yStart = Math.max(gridY - 2, 0);
    const xEnd = Math.min(gridX + 2, this.grid[0].length - 1);
    const yEnd = Math.min(gridY + 2, this.grid.length - 1);

    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        const p = this.grid[y][x];
        if (p && distance(p, point) < this.minDist) {
          return false;
        }
      }
    }

    return true;
  }
}
