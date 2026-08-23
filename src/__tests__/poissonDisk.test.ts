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
