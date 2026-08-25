/**
 * Where an unseeded generator gets its seed.
 * @module entropy
 * @internal
 */

/**
 * Two random 32-bit words, from the platform's cryptographic generator where
 * there is one — browsers, Node, Deno, Workers all have it — and `Math.random`
 * where there is not.
 *
 * The point is the full 64 bits: `Math.random` is not required to give more
 * than 52 bits of entropy, and some engines give far fewer, so unseeded
 * generators drawn in the same millisecond can collide.
 * @internal
 */
export function randomSeedWords(): [number, number] {
  const crypto = (
    globalThis as {
      crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array };
    }
  ).crypto;

  if (crypto && typeof crypto.getRandomValues === "function") {
    const words = crypto.getRandomValues(new Uint32Array(2));
    return [words[0] >>> 0, words[1] >>> 0];
  }

  return [(Math.random() * 0x100000000) >>> 0, (Math.random() * 0x100000000) >>> 0];
}
