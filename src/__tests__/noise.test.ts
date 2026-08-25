import { describe, expect, it } from "vitest";
import { perlinNoise, valueNoise } from "../noise.js";
import { RNG } from "../rng.js";
import type { NoiseField } from "../noise.js";

const fields: [string, (rng: () => number) => NoiseField][] = [
  ["value noise", valueNoise],
  ["Perlin noise", perlinNoise],
];

/**
 * Samples a field at the same scattered points every time, spread over enough
 * lattice cells to say something about the field as a whole.
 */
function sample(field: NoiseField, dimensions: 1 | 2 | 3, count = 4000): number[] {
  const where = new RNG(99);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = where.number() * 200 - 100;
    const y = where.number() * 200 - 100;
    const z = where.number() * 200 - 100;
    values.push(
      dimensions === 1 ? field.at(x) : dimensions === 2 ? field.at(x, y) : field.at(x, y, z),
    );
  }
  return values;
}

const mean = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;

/** How much a field changes from step to step along a line; more octaves, more of it. */
function roughness(field: NoiseField): number {
  let total = 0;
  for (let x = -2; x < 2; x += 0.01) {
    total += Math.abs(field.at(x, 0.5) - field.at(x + 0.01, 0.5));
  }
  return total;
}
const min = (ns: number[]) => ns.reduce((a, b) => Math.min(a, b), Infinity);
const max = (ns: number[]) => ns.reduce((a, b) => Math.max(a, b), -Infinity);

describe.each(fields)("%s", (_name, make) => {
  it("is reproducible for the same seed", () => {
    const a = make(new RNG(1234).random);
    const b = make(new RNG(1234).random);
    for (const [x, y, z] of [
      [0.5, 1.5, 2.5],
      [-3.25, 7.125, 0],
      [100.5, -0.5, 12.25],
    ]) {
      expect(a.at(x)).toBe(b.at(x));
      expect(a.at(x, y)).toBe(b.at(x, y));
      expect(a.at(x, y, z)).toBe(b.at(x, y, z));
    }
  });

  it("differs between seeds", () => {
    const a = sample(make(new RNG(1).random), 2);
    const b = sample(make(new RNG(2).random), 2);
    expect(a).not.toEqual(b);
  });

  it("gives the same value for the same point every time", () => {
    const field = make(new RNG(1234).random);
    const first = field.at(0.375, 1.25);
    for (let i = 0; i < 10; i++) expect(field.at(0.375, 1.25)).toBe(first);
  });

  it("stays within [-1, 1] in every dimension", () => {
    const field = make(new RNG(1234).random);
    for (const dimensions of [1, 2, 3] as const) {
      const values = sample(field, dimensions, 20000);
      expect(min(values)).toBeGreaterThanOrEqual(-1);
      expect(max(values)).toBeLessThanOrEqual(1);
    }
  });

  it("uses most of that range", () => {
    const values = sample(make(new RNG(1234).random), 2);
    expect(max(values)).toBeGreaterThan(0.5);
    expect(min(values)).toBeLessThan(-0.5);
  });

  it("is centred near zero", () => {
    for (const dimensions of [1, 2, 3] as const) {
      const m = mean(sample(make(new RNG(1234).random), dimensions, 20000));
      expect(Math.abs(m)).toBeLessThan(0.05);
    }
  });

  it("is smooth: nearby points have nearby values", () => {
    const field = make(new RNG(1234).random);
    let worst = 0;
    for (let x = -3; x < 3; x += 0.011) {
      worst = Math.max(worst, Math.abs(field.at(x, 0.25) - field.at(x + 1e-4, 0.25)));
    }
    // A jump of this size over a ten thousandth of a lattice cell would mean
    // the field was not continuous at all
    expect(worst).toBeLessThan(0.01);
  });

  it("is unrelated a whole lattice cell away", () => {
    const field = make(new RNG(1234).random);
    const near: number[] = [];
    const far: number[] = [];
    for (let x = 0; x < 200; x++) {
      near.push(Math.abs(field.at(x + 0.5, 0.5) - field.at(x + 0.53, 0.5)));
      far.push(Math.abs(field.at(x + 0.5, 0.5) - field.at(x + 3.5, 0.5)));
    }
    expect(mean(near)).toBeLessThan(mean(far));
  });

  it("varies in each dimension separately", () => {
    const field = make(new RNG(1234).random);
    const base = field.at(0.5, 0.5, 0.5);
    expect(field.at(1.7, 0.5, 0.5)).not.toBe(base);
    expect(field.at(0.5, 1.7, 0.5)).not.toBe(base);
    expect(field.at(0.5, 0.5, 1.7)).not.toBe(base);
  });

  describe("fbm", () => {
    it("stays within [-1, 1]", () => {
      const field = make(new RNG(1234).random).fbm({ octaves: 6 });
      for (const dimensions of [1, 2, 3] as const) {
        const values = sample(field, dimensions, 10000);
        expect(min(values)).toBeGreaterThanOrEqual(-1);
        expect(max(values)).toBeLessThanOrEqual(1);
      }
    });

    it("is reproducible, and configured once for all its samples", () => {
      const a = make(new RNG(1234).random).fbm({ octaves: 3 });
      const b = make(new RNG(1234).random).fbm({ octaves: 3 });
      expect(sample(a, 2)).toEqual(sample(b, 2));
    });

    it("is one octave of the plain field when asked for one", () => {
      const plain = make(new RNG(1234).random);
      const single = make(new RNG(1234).random).fbm({ octaves: 1 });
      expect(single.at(0.375, 1.25)).toBeCloseTo(plain.at(0.375, 1.25), 12);
    });

    it("adds finer detail with more octaves", () => {
      const few = roughness(make(new RNG(1234).random).fbm({ octaves: 1 }));
      const many = roughness(make(new RNG(1234).random).fbm({ octaves: 6 }));
      expect(many).toBeGreaterThan(few);
    });

    it("can itself be sampled in one, two or three dimensions", () => {
      const field = make(new RNG(1234).random).fbm();
      expect(field.at(0.5)).toBeTypeOf("number");
      expect(field.at(0.5, 1.5)).toBeTypeOf("number");
      expect(field.at(0.5, 1.5, 2.5)).toBeTypeOf("number");
      expect(field.at(0.5)).not.toBe(field.at(0.5, 1.5));
    });

    it("rejects impossible octaves, lacunarity and gain", () => {
      const field = make(new RNG(1234).random);
      expect(() => field.fbm({ octaves: 0 })).toThrow();
      expect(() => field.fbm({ octaves: 1.5 })).toThrow();
      expect(() => field.fbm({ lacunarity: 0 })).toThrow();
      expect(() => field.fbm({ gain: -1 })).toThrow();
    });
  });
});

describe("Perlin noise specifically", () => {
  it("is zero at every lattice point, as gradient noise is", () => {
    const field = perlinNoise(new RNG(1234).random);
    for (let i = -5; i < 5; i++) {
      expect(Math.abs(field.at(i))).toBeLessThan(1e-12);
      expect(Math.abs(field.at(i, i + 2))).toBeLessThan(1e-12);
      expect(Math.abs(field.at(i, i + 2, i - 1))).toBeLessThan(1e-12);
    }
  });
});

describe("noise from an RNG", () => {
  it("matches the standalone functions driven by the same generator", () => {
    expect(new RNG(1234).valueNoise().at(0.5, 1.5)).toBe(
      valueNoise(new RNG(1234).random).at(0.5, 1.5),
    );
    expect(new RNG(1234).perlinNoise().at(0.5, 1.5)).toBe(
      perlinNoise(new RNG(1234).random).at(0.5, 1.5),
    );
  });

  it("draws from the generator to build the field, but not to sample it", () => {
    const rng = new RNG(1234);
    const field = rng.perlinNoise();
    const after = rng.getState();
    for (let i = 0; i < 100; i++) field.at(i / 10, i / 20, i / 30);
    expect(rng.getState()).toEqual(after);
  });

  it("gives unrelated fields from unrelated streams", () => {
    const rng = new RNG("sunflower");
    const a = rng.stream("hills").perlinNoise();
    const b = rng.stream("clouds").perlinNoise();
    expect(sample(a, 2)).not.toEqual(sample(b, 2));
  });
});
