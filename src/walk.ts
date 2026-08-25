/**
 * Random walks: paths made of steps that remember where the last one went.
 * @module walk
 */

import type { RandomSource, Vec2 } from "./types.js";
import { onUnitCircle } from "./vectors.js";

/** How a {@link walk} wanders. */
export type WalkConfig = {
  /** How many steps to take; the path comes back one point longer */
  steps: number;
  /** Where it begins (default: `[0, 0]`) */
  start?: Vec2;
  /** How far each step travels (default: 1) */
  stepSize?: number;
  /**
   * How much of the last direction each step keeps, from 0 for no memory at
   * all to 1 for a straight line (default: 0)
   */
  momentum?: number;
  /** A constant nudge added to every step, for a walk that goes somewhere (default: none) */
  drift?: Vec2;
  /** The direction of the first step in radians (default: a random direction) */
  heading?: number;
};

/**
 * A random walk: a path of `steps` steps. The first goes in `heading`, or in a
 * random direction; each one after it blends the direction of the last with a
 * fresh random heading.
 *
 * `momentum` is what makes it a walk rather than a scatter. At 0 each step
 * heads off independently, giving the jagged path of Brownian motion; nearer 1
 * the direction turns slowly, giving a wandering line that keeps going the way
 * it was going. `drift` adds a constant nudge on top, for a current the walk is
 * carried along by.
 *
 * Usually you want {@link RNG.walk}, which supplies a seeded `rng` for you.
 *
 * @returns The path, starting with `start`, so `steps + 1` points long
 * @throws Error if the steps are not a non-negative integer, the momentum is
 * outside `[0, 1]`, or the step size is negative
 * @example
 * ```ts
 * walk(Math.random, { steps: 200, stepSize: 0.01, momentum: 0.9 })
 * ```
 */
export function walk(rng: RandomSource, config: WalkConfig): Vec2[] {
  const { steps, start = [0, 0], stepSize = 1, momentum = 0, drift = [0, 0], heading } = config;

  if (!Number.isInteger(steps) || steps < 0) {
    throw new Error("steps must be a non-negative integer");
  }
  if (momentum < 0 || momentum > 1) throw new Error("momentum must be between 0 and 1");
  if (stepSize < 0) throw new Error("stepSize must not be negative");

  // The first step goes exactly this way; every step after it turns from here
  let [dx, dy] = heading === undefined ? onUnitCircle(rng) : [Math.cos(heading), Math.sin(heading)];

  let [x, y] = start;
  const path: Vec2[] = [[x, y]];

  for (let i = 0; i < steps; i++) {
    if (i > 0) {
      const [rx, ry] = onUnitCircle(rng);
      let nx = momentum * dx + (1 - momentum) * rx;
      let ny = momentum * dy + (1 - momentum) * ry;

      // Blending two directions can cancel them out exactly; when it does, the
      // fresh one is as good a heading as any
      const length = Math.sqrt(nx * nx + ny * ny);
      if (length === 0) {
        nx = rx;
        ny = ry;
      } else {
        nx /= length;
        ny /= length;
      }

      dx = nx;
      dy = ny;
    }

    x += dx * stepSize + drift[0];
    y += dy * stepSize + drift[1];
    path.push([x, y]);
  }

  return path;
}
