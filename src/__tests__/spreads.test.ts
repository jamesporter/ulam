import { describe, expect, it } from "vitest";
import { RNG } from "../rng.js";
import { jitteredGridPoints, quasiRandomPoints } from "../spreads.js";
import type { Vec2 } from "../types.js";

/**
 * How unevenly points fill a `cells` × `cells` grid over the unit square: the
 * variance of the counts per cell. Uniform random points scatter like a
 * Poisson process, so the variance is about the mean; evenly spread ones do
 * much better.
 */
function countVariance(points: Vec2[], cells: number): number {
  const counts = Array.from({ length: cells * cells }, () => 0);
  for (const [x, y] of points) counts[Math.floor(y * cells) * cells + Math.floor(x * cells)]++;
  const mean = points.length / counts.length;
  return counts.reduce((s, c) => s + (c - mean) ** 2, 0) / counts.length;
}

const inside = (points: Vec2[], width: number, height: number) =>
  points.every(([x, y]) => x >= 0 && x < width && y >= 0 && y < height);

describe.each(["r2", "halton"] as const)("quasiRandomPoints, %s", (sequence) => {
  it("gives n points in the region", () => {
    const points = new RNG(1).quasiRandomPoints({ n: 300, sequence, width: 2, height: 0.5 });
    expect(points).toHaveLength(300);
    expect(inside(points, 2, 0.5)).toBe(true);
  });

  it("spreads far more evenly than uniform points", () => {
    const rng = new RNG(2);
    const quasi = rng.quasiRandomPoints({ n: 400, sequence });
    const uniform = Array.from({ length: 400 }, () => rng.randomPoint());
    // Four points per cell on average, so uniform points vary by about four
    expect(countVariance(uniform, 10)).toBeGreaterThan(2.5);
    expect(countVariance(quasi, 10)).toBeLessThan(1.5);
  });

  it("costs exactly two draws, whatever n is", () => {
    const a = new RNG(3);
    a.quasiRandomPoints({ n: 1000, sequence });
    const b = new RNG(3);
    b.number();
    b.number();
    expect(a.next()).toBe(b.next());
  });

  it("is a prefix of itself: more points only adds to the end", () => {
    const few = new RNG(4).quasiRandomPoints({ n: 10, sequence });
    const many = new RNG(4).quasiRandomPoints({ n: 50, sequence });
    expect(many.slice(0, 10)).toEqual(few);
  });

  it("differs between seeds", () => {
    expect(new RNG(5).quasiRandomPoints({ n: 5, sequence })).not.toEqual(
      new RNG(6).quasiRandomPoints({ n: 5, sequence }),
    );
  });

  it("matches the standalone function", () => {
    expect(new RNG(7).quasiRandomPoints({ n: 20, sequence })).toEqual(
      quasiRandomPoints(new RNG(7).random, { n: 20, sequence }),
    );
  });
});

describe("quasiRandomPoints", () => {
  it("defaults to r2", () => {
    expect(new RNG(1).quasiRandomPoints({ n: 10 })).toEqual(
      new RNG(1).quasiRandomPoints({ n: 10, sequence: "r2" }),
    );
  });

  it("gives nothing for n = 0", () => {
    expect(new RNG(1).quasiRandomPoints({ n: 0 })).toEqual([]);
  });

  it("rejects impossible configurations", () => {
    const rng = new RNG(1);
    expect(() => rng.quasiRandomPoints({ n: -1 })).toThrow("n must be a non-negative integer");
    expect(() => rng.quasiRandomPoints({ n: 1.5 })).toThrow("n must be a non-negative integer");
    expect(() => rng.quasiRandomPoints({ n: 5, width: 0 })).toThrow(
      "Width and height must be positive",
    );
  });
});

describe("jitteredGridPoints", () => {
  it("puts exactly one point in every cell", () => {
    const columns = 8;
    const rows = 5;
    const points = new RNG(1).jitteredGridPoints({ columns, rows, width: 2, height: 1 });
    expect(points).toHaveLength(columns * rows);
    const cells = points.map(([x, y]) => Math.floor(y * rows) * columns + Math.floor(x * 4));
    expect(new Set(cells).size).toBe(columns * rows);
  });

  it("comes back a row at a time", () => {
    const points = new RNG(2).jitteredGridPoints({ columns: 4, rows: 3 });
    expect(Math.floor(points[3][1] * 3)).toBe(0);
    expect(Math.floor(points[4][1] * 3)).toBe(1);
    expect(Math.floor(points[4][0] * 4)).toBe(0);
  });

  it("is a regular grid of cell centres with no jitter", () => {
    const points = new RNG(3).jitteredGridPoints({ columns: 2, rows: 2, jitter: 0 });
    expect(points).toEqual([
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75],
    ]);
  });

  it("keeps points near their centres with a little jitter", () => {
    const points = new RNG(4).jitteredGridPoints({ columns: 10, rows: 10, jitter: 0.2 });
    points.forEach(([x, y], i) => {
      const cx = ((i % 10) + 0.5) / 10;
      const cy = (Math.floor(i / 10) + 0.5) / 10;
      expect(Math.abs(x - cx)).toBeLessThanOrEqual(0.01 + 1e-12);
      expect(Math.abs(y - cy)).toBeLessThanOrEqual(0.01 + 1e-12);
    });
  });

  it("defaults rows to keep the cells square", () => {
    expect(new RNG(5).jitteredGridPoints({ columns: 10 })).toHaveLength(100);
    expect(new RNG(5).jitteredGridPoints({ columns: 10, height: 0.5 })).toHaveLength(50);
    expect(new RNG(5).jitteredGridPoints({ columns: 3, width: 3, height: 0.1 })).toHaveLength(3);
  });

  it("takes two draws per point", () => {
    const a = new RNG(6);
    a.jitteredGridPoints({ columns: 3, rows: 2 });
    const b = new RNG(6);
    for (let i = 0; i < 12; i++) b.number();
    expect(a.next()).toBe(b.next());
  });

  it("matches the standalone function", () => {
    expect(new RNG(7).jitteredGridPoints({ columns: 5 })).toEqual(
      jitteredGridPoints(new RNG(7).random, { columns: 5 }),
    );
  });

  it("rejects impossible configurations", () => {
    const rng = new RNG(1);
    expect(() => rng.jitteredGridPoints({ columns: 0 })).toThrow(
      "columns must be a positive integer",
    );
    expect(() => rng.jitteredGridPoints({ columns: 2, rows: 1.5 })).toThrow(
      "rows must be a positive integer",
    );
    expect(() => rng.jitteredGridPoints({ columns: 2, jitter: 2 })).toThrow(
      "jitter must be between 0 and 1",
    );
    expect(() => rng.jitteredGridPoints({ columns: 2, height: -1 })).toThrow(
      "Width and height must be positive",
    );
  });
});
