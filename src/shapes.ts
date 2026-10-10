/**
 * Uniform random points inside shapes: triangles, polygons and rings.
 *
 * As with {@link module:vectors}, each takes a source of uniform randomness,
 * so they can be driven from a generator other than this library's own.
 * {@link RNG} exposes all of them as methods.
 * @module shapes
 */

import type { RandomSource, Vec2 } from "./types.js";

/**
 * A uniformly random point inside the triangle with corners `a`, `b` and `c`.
 *
 * Uniform by area, using exactly two draws: a point in the parallelogram the
 * triangle makes with its mirror image, folded back in when it lands in the
 * mirror half.
 *
 * @example
 * ```ts
 * inTriangle(Math.random, [0, 0], [1, 0], [0.5, 1])
 * ```
 */
export function inTriangle(rng: RandomSource, a: Vec2, b: Vec2, c: Vec2): Vec2 {
  let u = rng();
  let v = rng();
  if (u + v > 1) {
    u = 1 - u;
    v = 1 - v;
  }
  return [
    a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]),
    a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]),
  ];
}

/**
 * Whether a point is inside a polygon, by the even-odd rule: a ray from the
 * point crosses its edges an odd number of times. Works for any simple
 * polygon, convex or not, in either winding.
 *
 * Handy as the `contains` test for Poisson disk sampling inside a shape.
 *
 * @example
 * ```ts
 * pointInPolygon([0.5, 0.5], [[0, 0], [1, 0], [1, 1], [0, 1]]) // true
 * ```
 */
export function pointInPolygon(point: Vec2, vertices: Vec2[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, yi] = vertices[i];
    const [xj, yj] = vertices[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * A uniformly random point inside a polygon, convex or not, given its corners
 * in order (either winding).
 *
 * Rejection sampled from the bounding box, so it takes two draws per attempt,
 * and on average as many attempts as the box is larger than the polygon:
 * barely more than one for a fat shape, more for a thin or spidery one.
 *
 * @throws Error if there are fewer than three vertices, or the polygon has no
 * area
 * @example
 * ```ts
 * const star = [[0.5, 0], [0.62, 0.38], [1, 0.38], [0.69, 0.62], [0.81, 1],
 *   [0.5, 0.76], [0.19, 1], [0.31, 0.62], [0, 0.38], [0.38, 0.38]]
 * inPolygon(Math.random, star)
 * ```
 */
export function inPolygon(rng: RandomSource, vertices: Vec2[]): Vec2 {
  if (vertices.length < 3) throw new Error("A polygon needs at least three vertices");

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let doubleArea = 0;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [x, y] = vertices[i];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    doubleArea += vertices[j][0] * y - x * vertices[j][1];
  }
  if (doubleArea === 0) throw new Error("The polygon has no area to sample from");

  const width = maxX - minX;
  const height = maxY - minY;
  for (;;) {
    const p: Vec2 = [minX + rng() * width, minY + rng() * height];
    if (pointInPolygon(p, vertices)) return p;
  }
}

/**
 * A uniformly random point in a ring about the origin: inside a disc of
 * radius `outer`, but outside one of radius `inner`. Uniform by area, so the
 * outer edge gets its fair share.
 *
 * @param config.inner - The radius of the hole
 * @param config.outer - The radius of the ring's outer edge (default: 1)
 * @throws Error if `inner` is negative, or larger than `outer`
 * @example
 * ```ts
 * inAnnulus(Math.random, { inner: 0.8 }) // A thin ring just inside the unit circle
 * ```
 */
export function inAnnulus(rng: RandomSource, config: { inner: number; outer?: number }): Vec2 {
  const { inner, outer = 1 } = config;
  if (inner < 0) throw new Error("inner must not be negative");
  if (inner > outer) throw new Error("inner must not be larger than outer");
  const r = Math.sqrt(inner * inner + rng() * (outer * outer - inner * inner));
  const angle = rng() * Math.PI * 2;
  return [r * Math.cos(angle), r * Math.sin(angle)];
}
