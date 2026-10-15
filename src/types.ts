/**
 * Shared geometric types.
 * @module types
 */

/** A vector (or point) in two dimensions, `[x, y]`. */
export type Vec2 = [number, number];

/** A vector (or point) in three dimensions, `[x, y, z]`. */
export type Vec3 = [number, number, number];

/** A vector (or point) in four dimensions, `[x, y, z, w]`. */
export type Vec4 = [number, number, number, number];

/**
 * A source of uniform random numbers in `[0, 1)`, such as {@link RNG.random}
 * or `Math.random`.
 */
export type RandomSource = () => number;
