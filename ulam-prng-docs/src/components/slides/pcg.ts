import type { RNG } from 'ulam-prng'

/**
 * PCG32 written out again in BigInt, slowly and plainly, so the slides can
 * show each step of it — and check every step against the library.
 */

export const MASK64 = (1n << 64n) - 1n
export const MULTIPLIER = 6364136223846793005n

export function u64(hi: number, lo: number): bigint {
  return (BigInt(hi >>> 0) << 32n) | BigInt(lo >>> 0)
}

/** A generator's 64-bit state and its (odd) increment, which picks its stream. */
export function stateOf(rng: RNG): { state: bigint; inc: bigint } {
  const [hi, lo, incHi, incLo] = rng.getState()
  return { state: u64(hi, lo), inc: u64(incHi, incLo) }
}

/** One step of the underlying LCG. */
export function lcgStep(state: bigint, inc: bigint): bigint {
  return (state * MULTIPLIER + inc) & MASK64
}

/** Every stage of turning a 64-bit state into 32 bits of output. */
export function pcgStages(old: bigint) {
  const shifted = old >> 18n
  const mixed = old ^ shifted
  const xorshifted = Number((mixed >> 27n) & 0xffffffffn) >>> 0
  const rot = Number(old >> 59n)
  const output = ((xorshifted >>> rot) | (xorshifted << (-rot & 31))) >>> 0
  return { shifted, mixed, xorshifted, rot, output }
}

export function pcgOutput(old: bigint): number {
  return pcgStages(old).output
}

export function bitsOf(value: bigint | number, width: number): number[] {
  const v = BigInt(value)
  return Array.from({ length: width }, (_, i) => Number((v >> BigInt(width - 1 - i)) & 1n))
}

export function hex(value: bigint | number, width: number): string {
  return BigInt(value)
    .toString(16)
    .padStart(width / 4, '0')
}
