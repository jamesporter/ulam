import { describe, expect, it } from "vitest";
import { PoissonDiskSampling, poissonDiskPoints } from "../poissonDisk.js";
import { RNG } from "../rng.js";
import type { Point2D } from "../types.js";

const distance = (a: Point2D, b: Point2D) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);

/** The smallest gap between any two of the given points. */
function minSeparation(points: Point2D[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(min, distance(points[i], points[j]));
    }
  }
  return min;
}

const generate = (config: Partial<Parameters<typeof poissonDiskPoints>[0]> = {}) =>
  poissonDiskPoints({
    width: 1,
    height: 1,
    minDist: 0.1,
    rng: new RNG(1234).random,
    k: 30,
    ...config,
  });

describe("poissonDiskPoints", () => {
  it("generates points", () => {
    expect(generate().length).toBeGreaterThan(10);
  });

  it("keeps every point inside the region", () => {
    for (const [x, y] of generate({ width: 2, height: 3, minDist: 0.2 })) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(2);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(3);
    }
  });

  it("never places two points closer than minDist", () => {
    expect(minSeparation(generate({ minDist: 0.1 }))).toBeGreaterThanOrEqual(0.1);
  });

  it("holds the minimum distance for a tight packing too", () => {
    expect(minSeparation(generate({ minDist: 0.03 }))).toBeGreaterThanOrEqual(0.03);
  });

  it("fills the space reasonably densely", () => {
    // Bridson's algorithm reliably beats a naive random scattering; for a unit
    // square with minDist r expect on the order of 0.7 / r^2 points.
    const points = generate({ minDist: 0.05 });
    expect(points.length).toBeGreaterThan(150);
  });

  it("produces more points for a smaller minimum distance", () => {
    const sparse = generate({ minDist: 0.2 });
    const dense = generate({ minDist: 0.05 });
    expect(dense.length).toBeGreaterThan(sparse.length);
  });

  it("scales the count with the area", () => {
    const small = generate({ width: 1, height: 1, minDist: 0.1 });
    const large = generate({ width: 2, height: 2, minDist: 0.1 });
    expect(large.length).toBeGreaterThan(small.length * 2);
  });

  it("is deterministic for a given seed", () => {
    const a = generate({ rng: new RNG(7).random });
    const b = generate({ rng: new RNG(7).random });
    expect(a).toEqual(b);
  });

  it("gives different layouts for different seeds", () => {
    const a = generate({ rng: new RNG(7).random });
    const b = generate({ rng: new RNG(8).random });
    expect(a).not.toEqual(b);
  });

  it("defaults k to 30", () => {
    const withDefault = poissonDiskPoints({
      width: 1,
      height: 1,
      minDist: 0.1,
      rng: new RNG(11).random,
    });
    const explicit = generate({ rng: new RNG(11).random, k: 30 });
    expect(withDefault).toEqual(explicit);
  });

  it("packs less tightly with fewer attempts", () => {
    const few = generate({ k: 1, rng: new RNG(3).random });
    const many = generate({ k: 30, rng: new RNG(3).random });
    expect(few.length).toBeLessThan(many.length);
  });

  it("returns a single point when minDist exceeds the region", () => {
    expect(generate({ minDist: 5 })).toHaveLength(1);
  });
});

describe("PoissonDiskSampling", () => {
  it("exposes the generated points on the instance", () => {
    const sampler = new PoissonDiskSampling(1, 1, 0.1, 30);
    const returned = sampler.generatePoints(new RNG(1).random);
    expect(returned).toBe(sampler.points);
    expect(sampler.points.length).toBeGreaterThan(10);
  });

  it("starts with no points before generating", () => {
    expect(new PoissonDiskSampling(1, 1, 0.1, 30).points).toEqual([]);
  });

  it("rejects a non-positive minimum distance", () => {
    expect(() => new PoissonDiskSampling(1, 1, 0, 30)).toThrow("minDist must be positive");
    expect(() => new PoissonDiskSampling(1, 1, -1, 30)).toThrow("minDist must be positive");
  });

  it("rejects a non-positive region", () => {
    expect(() => new PoissonDiskSampling(0, 1, 0.1, 30)).toThrow(
      "Width and height must be positive",
    );
    expect(() => new PoissonDiskSampling(1, -1, 0.1, 30)).toThrow(
      "Width and height must be positive",
    );
  });
});

describe("RNG.poissonDiskPoints", () => {
  it("defaults to the unit square", () => {
    for (const [x, y] of new RNG(1).poissonDiskPoints({ minDist: 0.1 })) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(1);
    }
  });

  it("respects width and height", () => {
    const points = new RNG(1).poissonDiskPoints({
      minDist: 0.1,
      width: 1,
      height: 0.5,
    });
    for (const [, y] of points) expect(y).toBeLessThan(0.5);
  });

  it("respects the minimum distance", () => {
    const points = new RNG(42).poissonDiskPoints({ minDist: 0.08 });
    expect(minSeparation(points)).toBeGreaterThanOrEqual(0.08);
  });

  it("maps attempts onto k", () => {
    const viaMethod = new RNG(5).poissonDiskPoints({
      minDist: 0.1,
      attempts: 4,
    });
    const direct = poissonDiskPoints({
      width: 1,
      height: 1,
      minDist: 0.1,
      rng: new RNG(5).random,
      k: 4,
    });
    expect(viaMethod).toEqual(direct);
  });

  it("advances the generator, so successive calls differ", () => {
    const rng = new RNG(5);
    expect(rng.poissonDiskPoints({ minDist: 0.1 })).not.toEqual(
      rng.poissonDiskPoints({ minDist: 0.1 }),
    );
  });
});

describe("RNG.forPoissonDiskPoints", () => {
  it("calls back once per point, in order, with the index", () => {
    const expected = new RNG(9).poissonDiskPoints({ minDist: 0.1 });
    const seen: Point2D[] = [];
    new RNG(9).forPoissonDiskPoints({ minDist: 0.1 }, (at, i) => {
      expect(i).toBe(seen.length);
      seen.push(at);
    });
    expect(seen).toEqual(expected);
  });
});

const spacing = ([x]: Point2D) => 0.02 + 0.08 * x;
const inCircle = ([x, y]: Point2D) => (x - 0.5) ** 2 + (y - 0.5) ** 2 < 0.16;
const islands = ([x, y]: Point2D) => (x < 0.2 || x > 0.8) && y > 0.4 && y < 0.6;

describe("Poisson disk spacing that varies", () => {
  it("keeps every pair at least the average of their spacings apart", () => {
    const points = new RNG(1).poissonDiskPoints({ minDist: spacing, maxDist: 0.1 });
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const required = (spacing(points[i]) + spacing(points[j])) / 2;
        expect(distance(points[i], points[j])).toBeGreaterThanOrEqual(required - 1e-12);
      }
    }
  });

  it("is denser where the spacing is smaller", () => {
    const points = new RNG(2).poissonDiskPoints({ minDist: spacing, maxDist: 0.1 });
    const left = points.filter(([x]) => x < 0.25).length;
    const right = points.filter(([x]) => x > 0.75).length;
    expect(left).toBeGreaterThan(right * 4);
  });

  it("caps the spacing at maxDist", () => {
    const capped = new RNG(3).poissonDiskPoints({ minDist: () => 1, maxDist: 0.1 });
    const constant = new RNG(3).poissonDiskPoints({ minDist: 0.1 });
    expect(capped.length).toBeGreaterThan(constant.length * 0.8);
    expect(minSeparation(capped)).toBeGreaterThanOrEqual(0.1 - 1e-12);
  });

  it("is deterministic for a given seed", () => {
    expect(new RNG(4).poissonDiskPoints({ minDist: spacing, maxDist: 0.1 })).toEqual(
      new RNG(4).poissonDiskPoints({ minDist: spacing, maxDist: 0.1 }),
    );
  });

  it("needs maxDist to be told how large the spacing gets", () => {
    expect(() => new RNG(1).poissonDiskPoints({ minDist: spacing })).toThrow(
      "maxDist must be a positive number when minDist is a function",
    );
    expect(() => new RNG(1).poissonDiskPoints({ minDist: spacing, maxDist: 0 })).toThrow(
      "maxDist must be a positive number when minDist is a function",
    );
  });

  it("rejects a spacing function that gives something other than a positive number", () => {
    expect(() => new RNG(1).poissonDiskPoints({ minDist: () => 0, maxDist: 0.1 })).toThrow(
      "minDist must be positive",
    );
    expect(() => new RNG(1).poissonDiskPoints({ minDist: () => Number.NaN, maxDist: 0.1 })).toThrow(
      "minDist must be positive",
    );
  });
});

describe("Poisson disk points inside a shape", () => {
  it("only places points where contains is true", () => {
    const points = new RNG(1).poissonDiskPoints({ minDist: 0.04, contains: inCircle });
    expect(points.length).toBeGreaterThan(50);
    expect(points.every(inCircle)).toBe(true);
    expect(minSeparation(points)).toBeGreaterThanOrEqual(0.04);
  });

  it("fills the shape about as densely as the open region", () => {
    const open = new RNG(2).poissonDiskPoints({ minDist: 0.04 }).length;
    const circle = new RNG(2).poissonDiskPoints({ minDist: 0.04, contains: inCircle }).length;
    // The circle covers 0.16π ≈ 0.503 of the square
    expect(circle / open).toBeGreaterThan(0.42);
    expect(circle / open).toBeLessThan(0.58);
  });

  it("fills separate islands, not just the one it started in", () => {
    const points = new RNG(3).poissonDiskPoints({ minDist: 0.03, contains: islands });
    expect(points.some(([x]) => x < 0.2)).toBe(true);
    expect(points.some(([x]) => x > 0.8)).toBe(true);
  });

  it("gives no points when the shape is nowhere to be found", () => {
    expect(new RNG(4).poissonDiskPoints({ minDist: 0.05, contains: () => false })).toEqual([]);
  });

  it("combines with a varying spacing", () => {
    const points = new RNG(5).poissonDiskPoints({
      minDist: ([x]) => 0.02 + 0.04 * x,
      maxDist: 0.06,
      contains: inCircle,
    });
    expect(points.every(inCircle)).toBe(true);
  });

  it("is available on the standalone function and class", () => {
    const viaFunction = poissonDiskPoints({
      width: 1,
      height: 1,
      minDist: 0.05,
      contains: inCircle,
      rng: new RNG(6).random,
    });
    const sampler = new PoissonDiskSampling(1, 1, 0.05, 30, { contains: inCircle });
    expect(sampler.generatePoints(new RNG(6).random)).toEqual(viaFunction);
  });
});
