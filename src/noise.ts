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
