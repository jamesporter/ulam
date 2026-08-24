import { describe, expect, it } from "vitest";
import { RNG } from "../rng.js";
import type { Vec2, Vec3, Vec4 } from "../types.js";
import {
  gaussianVec2,
  gaussianVec3,
  gaussianVec4,
  inUnitBall,
  inUnitDisc,
  onUnitCircle,
  onUnitSphere,
  perturbVec2,
  perturbVec3,
  uniformVec2,
  uniformVec3,
  uniformVec4,
} from "../vectors.js";

/** A generator seeded the same way every time, for deterministic assertions. */
const seeded = () => new RNG(1234);

/** Collect n values from a generator function. */
function collect<T>(n: number, fn: () => T): T[] {
  const res: T[] = [];
  for (let i = 0; i < n; i++) res.push(fn());
  return res;
}

const mean = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;

const sd = (ns: number[]) => {
  const m = mean(ns);
  return Math.sqrt(mean(ns.map((n) => (n - m) * (n - m))));
};

const length = (v: number[]) => Math.sqrt(v.reduce((a, c) => a + c * c, 0));

/** The components of a sample of vectors, as one array per axis. */
const axes = (vs: number[][]) => vs[0].map((_, i) => vs.map((v) => v[i]));

describe("uniform vectors", () => {
  it("fills the unit square, cube and hypercube by default", () => {
    const rng = seeded();
    const samples = [
      collect(2000, () => uniformVec2(rng.random)),
      collect(2000, () => uniformVec3(rng.random)),
      collect(2000, () => uniformVec4(rng.random)),
    ];
    for (const [dimension, vs] of samples.entries()) {
      expect(vs[0]).toHaveLength(dimension + 2);
      for (const components of axes(vs)) {
        expect(Math.min(...components)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...components)).toBeLessThan(1);
        expect(mean(components)).toBeCloseTo(0.5, 1);
      }
    }
  });

  it("respects the given bounds", () => {
    const rng = seeded();
    const vs = collect(2000, () => uniformVec3(rng.random, { from: -2, to: 4 }));
    for (const components of axes(vs)) {
      expect(Math.min(...components)).toBeGreaterThanOrEqual(-2);
      expect(Math.max(...components)).toBeLessThan(4);
      expect(mean(components)).toBeCloseTo(1, 0);
    }
  });

  it("varies each component independently", () => {
    const rng = seeded();
    const vs = collect(500, () => uniformVec4(rng.random));
    for (const v of vs) expect(new Set(v).size).toBe(4);
  });
});

describe("gaussian vectors", () => {
  it("is standard normal on each axis by default", () => {
    const rng = seeded();
    for (const components of axes(collect(5000, () => gaussianVec3(rng.random)))) {
      expect(mean(components)).toBeCloseTo(0, 1);
      expect(sd(components)).toBeCloseTo(1, 1);
    }
  });

  it("centres on the given mean, in two, three and four dimensions", () => {
    const rng = seeded();
    const two = collect(5000, () => gaussianVec2(rng.random, { mean: [1, -1], sd: 0.5 }));
    const three = collect(5000, () => gaussianVec3(rng.random, { mean: [1, 2, 3], sd: 0.5 }));
    const four = collect(5000, () => gaussianVec4(rng.random, { mean: [0, 1, 2, 3], sd: 0.5 }));

    expect(axes(two).map((c) => Math.round(mean(c)))).toEqual([1, -1]);
    expect(axes(three).map((c) => Math.round(mean(c)))).toEqual([1, 2, 3]);
    expect(axes(four).map((c) => Math.round(mean(c)))).toEqual([0, 1, 2, 3]);
    for (const components of axes(two)) expect(sd(components)).toBeCloseTo(0.5, 1);
  });

  it("has the right number of components", () => {
    const rng = seeded();
    const two: Vec2 = gaussianVec2(rng.random);
    const three: Vec3 = gaussianVec3(rng.random);
    const four: Vec4 = gaussianVec4(rng.random);
    expect([two.length, three.length, four.length]).toEqual([2, 3, 4]);
  });
});

describe("onUnitCircle", () => {
  it("returns unit vectors", () => {
    const rng = seeded();
    for (const v of collect(1000, () => onUnitCircle(rng.random))) {
      expect(length(v)).toBeCloseTo(1, 10);
    }
  });

  it("covers every direction evenly", () => {
    const rng = seeded();
    const buckets = Array.from({ length: 8 }, () => 0);
    for (const [x, y] of collect(16000, () => onUnitCircle(rng.random))) {
      const angle = Math.atan2(y, x) + Math.PI;
      buckets[Math.min(7, Math.floor((angle / (2 * Math.PI)) * 8))]++;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(1700);
      expect(count).toBeLessThan(2300);
    }
  });
});

describe("inUnitDisc", () => {
  it("stays inside the disc", () => {
    const rng = seeded();
    for (const v of collect(2000, () => inUnitDisc(rng.random))) {
      expect(length(v)).toBeLessThanOrEqual(1);
    }
  });

  it("scales to the given radius", () => {
    const rng = seeded();
    const lengths = collect(2000, () => length(inUnitDisc(rng.random, { radius: 3 })));
    expect(Math.max(...lengths)).toBeLessThanOrEqual(3);
    expect(Math.max(...lengths)).toBeGreaterThan(2.8);
  });

  it("is uniform by area, so half the points fall outside radius 1/√2", () => {
    const rng = seeded();
    const inner = collect(20000, () => inUnitDisc(rng.random)).filter(
      (v) => length(v) < Math.SQRT1_2,
    ).length;
    expect(inner / 20000).toBeCloseTo(0.5, 1);
  });

  it("rejects a negative radius", () => {
    expect(() => inUnitDisc(seeded().random, { radius: -1 })).toThrow();
  });
});

describe("onUnitSphere", () => {
  it("returns unit vectors", () => {
    const rng = seeded();
    for (const v of collect(1000, () => onUnitSphere(rng.random))) {
      expect(length(v)).toBeCloseTo(1, 10);
    }
  });

  it("does not crowd the poles: z is uniform", () => {
    const rng = seeded();
    const zs = collect(20000, () => onUnitSphere(rng.random)[2]);
    const buckets = Array.from({ length: 5 }, () => 0);
    for (const z of zs) buckets[Math.min(4, Math.floor(((z + 1) / 2) * 5))]++;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(3400);
      expect(count).toBeLessThan(4600);
    }
  });

  it("is centred on the origin", () => {
    const rng = seeded();
    for (const components of axes(collect(20000, () => onUnitSphere(rng.random)))) {
      expect(mean(components)).toBeCloseTo(0, 1);
    }
  });
});

describe("inUnitBall", () => {
  it("stays inside the ball", () => {
    const rng = seeded();
    for (const v of collect(2000, () => inUnitBall(rng.random))) {
      expect(length(v)).toBeLessThanOrEqual(1);
    }
  });

  it("scales to the given radius", () => {
    const rng = seeded();
    const lengths = collect(2000, () => length(inUnitBall(rng.random, { radius: 2 })));
    expect(Math.max(...lengths)).toBeLessThanOrEqual(2);
    expect(Math.max(...lengths)).toBeGreaterThan(1.9);
  });

  it("is uniform by volume, so half the points fall outside radius 2^-1/3", () => {
    const rng = seeded();
    const half = Math.cbrt(0.5);
    const inner = collect(20000, () => inUnitBall(rng.random)).filter(
      (v) => length(v) < half,
    ).length;
    expect(inner / 20000).toBeCloseTo(0.5, 1);
  });

  it("rejects a negative radius", () => {
    expect(() => inUnitBall(seeded().random, { radius: -1 })).toThrow();
  });
});

describe("perturbing", () => {
  it("nudges a two dimensional point by ±0.05 by default", () => {
    const rng = seeded();
    const offsets = collect(2000, () => perturbVec2(rng.random, { at: [1, 2] })).map(
      ([x, y]) => [x - 1, y - 2] as Vec2,
    );
    for (const components of axes(offsets)) {
      expect(Math.min(...components)).toBeGreaterThanOrEqual(-0.05);
      expect(Math.max(...components)).toBeLessThanOrEqual(0.05);
      expect(mean(components)).toBeCloseTo(0, 1);
    }
  });

  it("nudges a three dimensional point, scaled by the magnitude", () => {
    const rng = seeded();
    const offsets = collect(2000, () =>
      perturbVec3(rng.random, { at: [1, 2, 3], magnitude: 2 }),
    ).map(([x, y, z]) => [x - 1, y - 2, z - 3] as Vec3);
    for (const components of axes(offsets)) {
      expect(Math.min(...components)).toBeGreaterThanOrEqual(-1);
      expect(Math.max(...components)).toBeLessThanOrEqual(1);
      expect(sd(components)).toBeGreaterThan(0.4);
    }
  });

  it("leaves the original point untouched", () => {
    const at: Vec3 = [1, 2, 3];
    perturbVec3(seeded().random, { at });
    expect(at).toEqual([1, 2, 3]);
  });
});

describe("RNG methods", () => {
  it("exposes every vector helper", () => {
    const rng = seeded();
    expect(rng.uniformVec2()).toHaveLength(2);
    expect(rng.uniformVec3({ from: -1, to: 1 })).toHaveLength(3);
    expect(rng.uniformVec4()).toHaveLength(4);
    expect(rng.gaussianVec2({ mean: [0, 0], sd: 2 })).toHaveLength(2);
    expect(rng.gaussianVec3()).toHaveLength(3);
    expect(rng.gaussianVec4()).toHaveLength(4);
    expect(length(rng.onUnitCircle())).toBeCloseTo(1, 10);
    expect(length(rng.inUnitDisc())).toBeLessThanOrEqual(1);
    expect(length(rng.onUnitSphere())).toBeCloseTo(1, 10);
    expect(length(rng.inUnitBall({ radius: 2 }))).toBeLessThanOrEqual(2);
    expect(rng.perturbVec3({ at: [0, 0, 0] })).toHaveLength(3);
  });

  it("matches the standalone functions draw for draw", () => {
    const a = seeded();
    const b = seeded();
    expect(collect(20, () => a.inUnitBall())).toEqual(collect(20, () => inUnitBall(b.random)));
    expect(collect(20, () => a.uniformVec2({ from: -1, to: 1 }))).toEqual(
      collect(20, () => uniformVec2(b.random, { from: -1, to: 1 })),
    );
  });

  it("reproduces the same vectors for the same seed", () => {
    const a = collect(20, () => new RNG(9).onUnitSphere());
    const b = collect(20, () => new RNG(9).onUnitSphere());
    expect(a).toEqual(b);
  });
});
