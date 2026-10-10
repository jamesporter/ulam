/**
 * Seeded coherent noise: fields that vary smoothly from point to point, so
 * neighbouring places get related values rather than independent ones.
 *
 * Where {@link module:distributions} gives you a number, this gives you a
 * landscape — the thing to reach for when a value should drift across the
 * canvas rather than jump.
 * @module noise
 */

import type { RandomSource } from "./types.js";

/** How an {@link fbm} field stacks its octaves. */
export type FbmConfig = {
  /** How many layers to add up; each one finer and fainter (default: 4) */
  octaves?: number;
  /** How much finer each layer is than the last (default: 2) */
  lacunarity?: number;
  /** How much fainter each layer is than the last (default: 0.5) */
  gain?: number;
};

/**
 * A seeded noise field, sampled in one, two or three dimensions depending on
 * how many coordinates you hand it.
 */
export type NoiseField = {
  /**
   * The value of the field at a point, in `[-1, 1]`. Nearby points give nearby
   * values; points a whole unit apart are unrelated.
   */
  at(x: number, y?: number, z?: number): number;
  /**
   * Fractal Brownian motion over this field: several octaves of it summed,
   * each `lacunarity` times finer and `gain` times fainter than the last.
   *
   * The result is another field, sampled exactly the same way, so the cost of
   * configuring it is paid once rather than at every point.
   *
   * @throws Error if the octaves, lacunarity or gain are out of range
   * @example
   * ```ts
   * const ridges = perlinNoise(rng.random).fbm({ octaves: 6 })
   * ridges.at(x, y)
   * ```
   */
  fbm(config?: FbmConfig): NoiseField;
};

/** The size of the permutation and gradient tables; a power of two, so `& 255` wraps. */
const TABLE_SIZE = 256;

/**
 * Quintic fade, whose first and second derivatives are both zero at either
 * end, so the lattice does not show up as creases.
 * @internal
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** @internal */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * A shuffled table of `0..255`, doubled so that lookups can run off the end
 * without wrapping by hand.
 * @internal
 */
function permutation(rng: RandomSource): Uint8Array {
  const p = new Uint8Array(TABLE_SIZE * 2);
  for (let i = 0; i < TABLE_SIZE; i++) p[i] = i;
  for (let i = TABLE_SIZE - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < TABLE_SIZE; i++) p[TABLE_SIZE + i] = p[i];
  return p;
}

/**
 * Wraps a sampling function up as a field, giving it {@link NoiseField.fbm}.
 * @internal
 */
function field(at: (x: number, y?: number, z?: number) => number): NoiseField {
  return {
    at,
    fbm(config?: FbmConfig): NoiseField {
      const { octaves = 4, lacunarity = 2, gain = 0.5 } = config ?? {};
      if (!Number.isInteger(octaves) || octaves < 1) {
        throw new Error("octaves must be a positive integer");
      }
      if (lacunarity <= 0) throw new Error("lacunarity must be positive");
      if (gain <= 0) throw new Error("gain must be positive");

      // The layers are summed, so divide by what they could add up to; a
      // fainter one contributes less to the total and to the divisor alike
      let total = 0;
      let amplitude = 1;
      for (let i = 0; i < octaves; i++) {
        total += amplitude;
        amplitude *= gain;
      }

      return field((x: number, y?: number, z?: number): number => {
        let sum = 0;
        let amp = 1;
        let frequency = 1;
        for (let i = 0; i < octaves; i++) {
          sum +=
            amp *
            at(
              x * frequency,
              y === undefined ? undefined : y * frequency,
              z === undefined ? undefined : z * frequency,
            );
          amp *= gain;
          frequency *= lacunarity;
        }
        return sum / total;
      });
    },
  };
}

/**
 * Value noise: a random value at every lattice point, smoothly interpolated
 * between them. Softer and blobbier than {@link perlinNoise}, and cheaper.
 *
 * Usually you want {@link RNG.valueNoise}, which supplies a seeded source for
 * you; use this directly to drive it from another source of randomness.
 *
 * Building the field consumes a few hundred draws, after which sampling it
 * takes none: the same point always gives the same value.
 *
 * @example
 * ```ts
 * const noise = valueNoise(rng.random)
 * noise.at(x * 4, y * 4) // -1 to 1, drifting smoothly across the canvas
 * ```
 */
export function valueNoise(rng: RandomSource): NoiseField {
  const p = permutation(rng);
  const values = new Float64Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) values[i] = rng() * 2 - 1;

  const value1 = (i: number): number => values[p[i & 255]];
  const value2 = (i: number, j: number): number => values[p[(p[i & 255] + j) & 255]];
  const value3 = (i: number, j: number, k: number): number =>
    values[p[(p[(p[i & 255] + j) & 255] + k) & 255]];

  return field((x: number, y?: number, z?: number): number => {
    const xi = Math.floor(x);
    const xf = x - xi;
    const u = fade(xf);

    if (y === undefined) {
      return lerp(value1(xi), value1(xi + 1), u);
    }

    const yi = Math.floor(y);
    const yf = y - yi;
    const v = fade(yf);

    if (z === undefined) {
      return lerp(
        lerp(value2(xi, yi), value2(xi + 1, yi), u),
        lerp(value2(xi, yi + 1), value2(xi + 1, yi + 1), u),
        v,
      );
    }

    const zi = Math.floor(z);
    const zf = z - zi;
    const w = fade(zf);

    return lerp(
      lerp(
        lerp(value3(xi, yi, zi), value3(xi + 1, yi, zi), u),
        lerp(value3(xi, yi + 1, zi), value3(xi + 1, yi + 1, zi), u),
        v,
      ),
      lerp(
        lerp(value3(xi, yi, zi + 1), value3(xi + 1, yi, zi + 1), u),
        lerp(value3(xi, yi + 1, zi + 1), value3(xi + 1, yi + 1, zi + 1), u),
        v,
      ),
      w,
    );
  });
}

/**
 * Gradient (Perlin) noise: a random direction at every lattice point, with the
 * field falling to zero at each of them. The classic — more even, and with
 * more structure, than {@link valueNoise}.
 *
 * Usually you want {@link RNG.perlinNoise}, which supplies a seeded source for
 * you; use this directly to drive it from another source of randomness.
 *
 * @example
 * ```ts
 * const noise = perlinNoise(rng.random)
 * const height = noise.at(x * 3, y * 3)
 * const cloud = noise.at(x * 3, y * 3, t) // The third dimension as time
 * ```
 */
export function perlinNoise(rng: RandomSource): NoiseField {
  const p = permutation(rng);

  // Unit gradients, so the largest dot product a lattice point can contribute
  // is bounded and the scale factors below are exact
  const gradients2 = new Float64Array(TABLE_SIZE * 2);
  const gradients3 = new Float64Array(TABLE_SIZE * 3);
  for (let i = 0; i < TABLE_SIZE; i++) {
    const angle = rng() * Math.PI * 2;
    gradients2[i * 2] = Math.cos(angle);
    gradients2[i * 2 + 1] = Math.sin(angle);

    const zz = rng() * 2 - 1;
    const around = rng() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - zz * zz));
    gradients3[i * 3] = r * Math.cos(around);
    gradients3[i * 3 + 1] = r * Math.sin(around);
    gradients3[i * 3 + 2] = zz;
  }

  const dot1 = (i: number, dx: number): number => (p[i & 255] & 1 ? dx : -dx);
  const dot2 = (i: number, j: number, dx: number, dy: number): number => {
    const g = p[(p[i & 255] + j) & 255] * 2;
    return gradients2[g] * dx + gradients2[g + 1] * dy;
  };
  const dot3 = (i: number, j: number, k: number, dx: number, dy: number, dz: number): number => {
    const g = p[(p[(p[i & 255] + j) & 255] + k) & 255] * 3;
    return gradients3[g] * dx + gradients3[g + 1] * dy + gradients3[g + 2] * dz;
  };

  return field((x: number, y?: number, z?: number): number => {
    const xi = Math.floor(x);
    const xf = x - xi;
    const u = fade(xf);

    if (y === undefined) {
      // A one dimensional field reaches ±1/2, so double it
      return 2 * lerp(dot1(xi, xf), dot1(xi + 1, xf - 1), u);
    }

    const yi = Math.floor(y);
    const yf = y - yi;
    const v = fade(yf);

    if (z === undefined) {
      // Two dimensions reach ±1/√2
      return (
        Math.SQRT2 *
        lerp(
          lerp(dot2(xi, yi, xf, yf), dot2(xi + 1, yi, xf - 1, yf), u),
          lerp(dot2(xi, yi + 1, xf, yf - 1), dot2(xi + 1, yi + 1, xf - 1, yf - 1), u),
          v,
        )
      );
    }

    const zi = Math.floor(z);
    const zf = z - zi;
    const w = fade(zf);

    // And three reach ±√3/2
    return (
      (2 / Math.sqrt(3)) *
      lerp(
        lerp(
          lerp(dot3(xi, yi, zi, xf, yf, zf), dot3(xi + 1, yi, zi, xf - 1, yf, zf), u),
          lerp(
            dot3(xi, yi + 1, zi, xf, yf - 1, zf),
            dot3(xi + 1, yi + 1, zi, xf - 1, yf - 1, zf),
            u,
          ),
          v,
        ),
        lerp(
          lerp(
            dot3(xi, yi, zi + 1, xf, yf, zf - 1),
            dot3(xi + 1, yi, zi + 1, xf - 1, yf, zf - 1),
            u,
          ),
          lerp(
            dot3(xi, yi + 1, zi + 1, xf, yf - 1, zf - 1),
            dot3(xi + 1, yi + 1, zi + 1, xf - 1, yf - 1, zf - 1),
            u,
          ),
          v,
        ),
        w,
      )
    );
  });
}

/** Skewing and unskewing factors between the square grid and the simplex one. @internal */
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;

/**
 * The twelve gradients of simplex noise: the midpoints of a cube's edges.
 * Two dimensional noise uses their first two components.
 * @internal
 */
const GRADIENTS = new Float64Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1,
  0, 1, -1, 0, -1, -1,
]);

/** @internal */
function clamp1(x: number): number {
  return x < -1 ? -1 : x > 1 ? 1 : x;
}

/**
 * Simplex noise: Ken Perlin's successor to his own gradient noise, summing
 * contributions from the corners of a triangle (or tetrahedron) rather than a
 * square (or cube). Fewer corners to visit, and no grid-aligned streaks, so
 * it looks more even in every direction than {@link perlinNoise}.
 *
 * Usually you want {@link RNG.simplexNoise}, which supplies a seeded source
 * for you; use this directly to drive it from another source of randomness.
 *
 * Building the field consumes a few hundred draws, after which sampling it
 * takes none: the same point always gives the same value.
 *
 * @example
 * ```ts
 * const noise = simplexNoise(rng.random)
 * noise.at(x * 3, y * 3) // -1 to 1, without the lattice showing through
 * ```
 */
export function simplexNoise(rng: RandomSource): NoiseField {
  const p = permutation(rng);
  const gradient = new Uint8Array(TABLE_SIZE * 2);
  for (let i = 0; i < TABLE_SIZE * 2; i++) gradient[i] = (p[i] % 12) * 3;

  const corner2 = (t: number, g: number, x: number, y: number): number => {
    if (t <= 0) return 0;
    t *= t;
    return t * t * (GRADIENTS[g] * x + GRADIENTS[g + 1] * y);
  };
  const corner3 = (t: number, g: number, x: number, y: number, z: number): number => {
    if (t <= 0) return 0;
    t *= t;
    return t * t * (GRADIENTS[g] * x + GRADIENTS[g + 1] * y + GRADIENTS[g + 2] * z);
  };

  return field((x: number, y?: number, z?: number): number => {
    if (y === undefined) {
      // One dimension: the two nearest integers, each with a slope of its own
      const i0 = Math.floor(x);
      const x0 = x - i0;
      const x1 = x0 - 1;
      const slope = (i: number, d: number): number => {
        const h = p[i & 255];
        return (h & 8 ? -1 : 1) * (1 + (h & 7)) * d;
      };
      let t0 = 1 - x0 * x0;
      t0 *= t0;
      let t1 = 1 - x1 * x1;
      t1 *= t1;
      return clamp1(0.395 * (t0 * t0 * slope(i0, x0) + t1 * t1 * slope(i0 + 1, x1)));
    }

    if (z === undefined) {
      const s = (x + y) * F2;
      const i = Math.floor(x + s);
      const j = Math.floor(y + s);
      const t = (i + j) * G2;
      const x0 = x - (i - t);
      const y0 = y - (j - t);
      // Which of the square's two triangles the point is in
      const i1 = x0 > y0 ? 1 : 0;
      const j1 = 1 - i1;
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      const ii = i & 255;
      const jj = j & 255;

      return clamp1(
        70 *
          (corner2(0.5 - x0 * x0 - y0 * y0, gradient[ii + p[jj]], x0, y0) +
            corner2(0.5 - x1 * x1 - y1 * y1, gradient[ii + i1 + p[jj + j1]], x1, y1) +
            corner2(0.5 - x2 * x2 - y2 * y2, gradient[ii + 1 + p[jj + 1]], x2, y2)),
      );
    }

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);

    // Which of the cube's six tetrahedra the point is in
    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0];
      else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1];
      else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1];
    } else {
      if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1];
      else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1];
      else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0];
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    return clamp1(
      32 *
        (corner3(0.6 - x0 * x0 - y0 * y0 - z0 * z0, gradient[ii + p[jj + p[kk]]], x0, y0, z0) +
          corner3(
            0.6 - x1 * x1 - y1 * y1 - z1 * z1,
            gradient[ii + i1 + p[jj + j1 + p[kk + k1]]],
            x1,
            y1,
            z1,
          ) +
          corner3(
            0.6 - x2 * x2 - y2 * y2 - z2 * z2,
            gradient[ii + i2 + p[jj + j2 + p[kk + k2]]],
            x2,
            y2,
            z2,
          ) +
          corner3(
            0.6 - x3 * x3 - y3 * y3 - z3 * z3,
            gradient[ii + 1 + p[jj + 1 + p[kk + 1]]],
            x3,
            y3,
            z3,
          )),
    );
  });
}
