import { describe, expect, it } from "vitest";
import { RNG } from "../rng.js";
import { inAnnulus, inPolygon, inTriangle, pointInPolygon } from "../shapes.js";
import type { Vec2 } from "../types.js";

/** Collect n values from a generator function. */
function collect<T>(n: number, fn: () => T): T[] {
  const res: T[] = [];
  for (let i = 0; i < n; i++) res.push(fn());
  return res;
}

const mean = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;

const square: Vec2[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/** An L, with the top right quarter missing. */
const ell: Vec2[] = [
  [0, 0],
  [1, 0],
  [1, 0.5],
  [0.5, 0.5],
  [0.5, 1],
  [0, 1],
];

describe("inTriangle", () => {
  const a: Vec2 = [0, 0];
  const b: Vec2 = [4, 0];
  const c: Vec2 = [0, 3];

  it("stays inside the triangle", () => {
    const rng = new RNG(1);
    for (const p of collect(2000, () => rng.inTriangle(a, b, c))) {
      expect(pointInPolygon(p, [a, b, c])).toBe(true);
    }
  });

  it("is uniform: centred on the centroid", () => {
    const rng = new RNG(2);
    const points = collect(20000, () => rng.inTriangle(a, b, c));
    expect(mean(points.map((p) => p[0]))).toBeCloseTo(4 / 3, 1);
    expect(mean(points.map((p) => p[1]))).toBeCloseTo(1, 1);
  });

  it("is uniform: the inner quarter triangle gets a quarter of the points", () => {
    // The triangle joining the midpoints of the sides
    const middle: Vec2[] = [
      [2, 0],
      [2, 1.5],
      [0, 1.5],
    ];
    const rng = new RNG(3);
    const points = collect(20000, () => rng.inTriangle(a, b, c));
    const share = points.filter((p) => pointInPolygon(p, middle)).length / points.length;
    expect(share).toBeCloseTo(0.25, 1);
  });

  it("takes exactly two draws", () => {
    const a1 = new RNG(4);
    const b1 = new RNG(4);
    a1.inTriangle(a, b, c);
    b1.number();
    b1.number();
    expect(a1.next()).toBe(b1.next());
  });

  it("matches the standalone function", () => {
    expect(new RNG(5).inTriangle(a, b, c)).toEqual(inTriangle(new RNG(5).random, a, b, c));
  });
});

describe("pointInPolygon", () => {
  it("knows inside from outside", () => {
    expect(pointInPolygon([0.5, 0.5], square)).toBe(true);
    expect(pointInPolygon([1.5, 0.5], square)).toBe(false);
    expect(pointInPolygon([-0.1, 0.5], square)).toBe(false);
  });

  it("handles a concave polygon", () => {
    expect(pointInPolygon([0.25, 0.75], ell)).toBe(true);
    expect(pointInPolygon([0.75, 0.25], ell)).toBe(true);
    expect(pointInPolygon([0.75, 0.75], ell)).toBe(false);
  });

  it("does not care about winding", () => {
    const reversed = ell.map((_, i) => ell[ell.length - 1 - i]);
    expect(pointInPolygon([0.25, 0.75], reversed)).toBe(true);
    expect(pointInPolygon([0.75, 0.75], reversed)).toBe(false);
  });
});

describe("inPolygon", () => {
  it("stays inside a concave polygon", () => {
    const rng = new RNG(1);
    for (const p of collect(2000, () => rng.inPolygon(ell))) {
      expect(pointInPolygon(p, ell)).toBe(true);
    }
  });

  it("is uniform by area across the polygon's parts", () => {
    const rng = new RNG(2);
    const points = collect(30000, () => rng.inPolygon(ell));
    // Three equal quarters: bottom left, bottom right, top left
    const bottomRight = points.filter(([x, y]) => x > 0.5 && y < 0.5).length / points.length;
    const topLeft = points.filter(([x, y]) => x < 0.5 && y > 0.5).length / points.length;
    expect(bottomRight).toBeCloseTo(1 / 3, 1);
    expect(topLeft).toBeCloseTo(1 / 3, 1);
  });

  it("works with a polygon away from the origin", () => {
    const rng = new RNG(3);
    const shifted = square.map(([x, y]): Vec2 => [x * 2 + 10, y + 5]);
    for (const [x, y] of collect(500, () => rng.inPolygon(shifted))) {
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThan(12);
      expect(y).toBeGreaterThanOrEqual(5);
      expect(y).toBeLessThan(6);
    }
  });

  it("matches the standalone function", () => {
    expect(new RNG(5).inPolygon(ell)).toEqual(inPolygon(new RNG(5).random, ell));
  });

  it("rejects too few vertices, and shapes with no area", () => {
    const rng = new RNG(1);
    expect(() =>
      rng.inPolygon([
        [0, 0],
        [1, 1],
      ]),
    ).toThrow("A polygon needs at least three vertices");
    expect(() =>
      rng.inPolygon([
        [0, 0],
        [1, 1],
        [2, 2],
      ]),
    ).toThrow("The polygon has no area to sample from");
  });
});

describe("inAnnulus", () => {
  it("stays between the two radii", () => {
    const rng = new RNG(1);
    for (const [x, y] of collect(2000, () => rng.inAnnulus({ inner: 2, outer: 3 }))) {
      const r = Math.hypot(x, y);
      expect(r).toBeGreaterThanOrEqual(2 - 1e-12);
      expect(r).toBeLessThanOrEqual(3 + 1e-12);
    }
  });

  it("defaults the outer radius to 1", () => {
    const rng = new RNG(2);
    for (const [x, y] of collect(500, () => rng.inAnnulus({ inner: 0.5 }))) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(1 + 1e-12);
    }
  });

  it("is uniform by area, so the outer half of the ring gets more", () => {
    const rng = new RNG(3);
    const radii = collect(20000, () => Math.hypot(...rng.inAnnulus({ inner: 1, outer: 3 })));
    // Area between 1 and 2 is 3π, between 2 and 3 is 5π
    const outer = radii.filter((r) => r > 2).length / radii.length;
    expect(outer).toBeCloseTo(5 / 8, 1);
  });

  it("is a disc when the hole has no size, and a circle when the ring has no width", () => {
    const rng = new RNG(4);
    const [x, y] = rng.inAnnulus({ inner: 1, outer: 1 });
    expect(Math.hypot(x, y)).toBeCloseTo(1, 12);
    expect(() => rng.inAnnulus({ inner: 0 })).not.toThrow();
  });

  it("matches the standalone function", () => {
    expect(new RNG(5).inAnnulus({ inner: 0.3 })).toEqual(
      inAnnulus(new RNG(5).random, { inner: 0.3 }),
    );
  });

  it("rejects impossible radii", () => {
    const rng = new RNG(1);
    expect(() => rng.inAnnulus({ inner: -1 })).toThrow("inner must not be negative");
    expect(() => rng.inAnnulus({ inner: 2, outer: 1 })).toThrow(
      "inner must not be larger than outer",
    );
  });
});
