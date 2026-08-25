/**
 * Hashing a string down to the two 32-bit words a generator seeds from.
 * @module hash
 */

/**
 * Hashes a string into a pair of 32-bit words, `[hi, lo]`, suitable as a seed
 * for {@link RNG}.
 *
 * Deterministic across runs and platforms, and well mixed: strings as close
 * together as `"tree"` and `"tres"` give unrelated seeds, so sketches named
 * after each other do not look like each other.
 *
 * This is a hash for seeding, not for security.
 *
 * @example
 * ```ts
 * const [hi, lo] = hashSeed("sunflower")
 * new RNG(hi, lo) // The same generator as new RNG("sunflower")
 * ```
 */
export function hashSeed(seed: string): [number, number] {
  // Two independent accumulators, each mixed with a different multiplier and
  // rotation, so they do not move together.
  let h1 = (0x9e3779b9 ^ seed.length) >>> 0;
  let h2 = (0x85ebca6b ^ (seed.length << 1)) >>> 0;

  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ k, 0x9e3779b1);
    h1 = ((h1 << 13) | (h1 >>> 19)) >>> 0;
    h2 = Math.imul(h2 ^ k, 0x5f356495);
    h2 = ((h2 << 11) | (h2 >>> 21)) >>> 0;
  }

  return [avalanche(h1 ^ (h2 >>> 15)), avalanche(h2 ^ (h1 >>> 17))];
}

/**
 * The finalising mix of murmurhash3, which spreads every input bit across the
 * whole word.
 * @internal
 */
function avalanche(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
