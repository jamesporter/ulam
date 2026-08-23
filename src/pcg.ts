/**
 * Internal 64-bit arithmetic for the PCG generator.
 *
 * JavaScript has no unsigned 64-bit integer type, so state is kept as pairs of
 * 32-bit halves in an `Int32Array` and multiplied/added by hand.
 * @module pcg
 * @internal
 */

/**
 * Multiply two 64-bit numbers (given in parts), and store the result in `out`.
 * @internal
 */
export function mul64(out: Int32Array, aHi: number, aLo: number, bHi: number, bLo: number): void {
  let c1 = ((aLo >>> 16) * (bLo & 0xffff)) >>> 0;
  let c0 = ((aLo & 0xffff) * (bLo >>> 16)) >>> 0;

  let lo = ((aLo & 0xffff) * (bLo & 0xffff)) >>> 0;
  let hi = ((aLo >>> 16) * (bLo >>> 16) + ((c0 >>> 16) + (c1 >>> 16))) >>> 0;

  c0 = (c0 << 16) >>> 0;
  lo = (lo + c0) >>> 0;
  if (lo >>> 0 < c0 >>> 0) {
    hi = (hi + 1) >>> 0;
  }

  c1 = (c1 << 16) >>> 0;
  lo = (lo + c1) >>> 0;
  if (lo >>> 0 < c1 >>> 0) {
    hi = (hi + 1) >>> 0;
  }

  hi = (hi + Math.imul(aLo, bHi)) >>> 0;
  hi = (hi + Math.imul(aHi, bLo)) >>> 0;

  out[0] = hi;
  out[1] = lo;
}

/**
 * Add two 64-bit numbers (given in parts), and store the result in `out`.
 * @internal
 */
export function add64(out: Int32Array, aHi: number, aLo: number, bHi: number, bLo: number): void {
  let hi = (aHi + bHi) >>> 0;
  const lo = (aLo + bLo) >>> 0;
  if (lo >>> 0 < aLo >>> 0) {
    hi = (hi + 1) | 0;
  }
  out[0] = hi;
  out[1] = lo;
}

/** Default increment, high 32 bits. @internal */
export const DEFAULT_INC_HI = 0x14057b7e;
/** Default increment, low 32 bits. @internal */
export const DEFAULT_INC_LO = 0xf767814f;

/** LCG multiplier, high 32 bits. @internal */
export const MUL_HI = 0x5851f42d >>> 0;
/** LCG multiplier, low 32 bits. @internal */
export const MUL_LO = 0x4c957f2d >>> 0;

/** 2^53, used to build a double from 53 random bits. @internal */
export const BIT_53 = 9007199254740992.0;
/** 2^27, the high half of those 53 bits. @internal */
export const BIT_27 = 134217728.0;
