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

/**
 * Advance a PCG state by `delta` steps of its LCG in O(log delta), storing the
 * result back in `state`. `delta` is an unsigned 64-bit count given in halves,
 * so stepping by `2^64 - n` steps back by `n`.
 *
 * The closed form for repeated LCG steps, from Brown's "Random Number
 * Generation with Arbitrary Strides": square the multiplier and fold the
 * increment along with it, once per bit of `delta`.
 * @internal
 */
export function advance(state: Int32Array, deltaHi: number, deltaLo: number): void {
  const tmp = new Int32Array(2);
  let accMulHi = 0;
  let accMulLo = 1;
  let accPlusHi = 0;
  let accPlusLo = 0;
  let curMulHi = MUL_HI;
  let curMulLo = MUL_LO;
  let curPlusHi = state[2] >>> 0;
  let curPlusLo = state[3] >>> 0;
  let hi = deltaHi >>> 0;
  let lo = deltaLo >>> 0;

  while (hi !== 0 || lo !== 0) {
    if (lo & 1) {
      mul64(tmp, accMulHi, accMulLo, curMulHi, curMulLo);
      accMulHi = tmp[0] >>> 0;
      accMulLo = tmp[1] >>> 0;
      mul64(tmp, accPlusHi, accPlusLo, curMulHi, curMulLo);
      add64(tmp, tmp[0] >>> 0, tmp[1] >>> 0, curPlusHi, curPlusLo);
      accPlusHi = tmp[0] >>> 0;
      accPlusLo = tmp[1] >>> 0;
    }
    add64(tmp, curMulHi, curMulLo, 0, 1);
    mul64(tmp, tmp[0] >>> 0, tmp[1] >>> 0, curPlusHi, curPlusLo);
    curPlusHi = tmp[0] >>> 0;
    curPlusLo = tmp[1] >>> 0;
    mul64(tmp, curMulHi, curMulLo, curMulHi, curMulLo);
    curMulHi = tmp[0] >>> 0;
    curMulLo = tmp[1] >>> 0;

    lo = ((lo >>> 1) | (hi << 31)) >>> 0;
    hi = hi >>> 1;
  }

  mul64(tmp, accMulHi, accMulLo, state[0] >>> 0, state[1] >>> 0);
  add64(state, tmp[0] >>> 0, tmp[1] >>> 0, accPlusHi, accPlusLo);
}
