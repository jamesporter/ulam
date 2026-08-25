import { describe, expect, it } from "vitest";
import { RNG } from "../rng.js";
import { walk } from "../walk.js";
import type { Vec2 } from "../types.js";

const distance = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** The angle turned between one step and the next, in radians. */
function turns(path: Vec2[]): number[] {
  const angles: number[] = [];
  for (let i = 1; i < path.length; i++) {
    angles.push(Math.atan2(path[i][1] - path[i - 1][1], path[i][0] - path[i - 1][0]));
  }
  const res: number[] = [];
  for (let i = 1; i < angles.length; i++) {
    let turn = angles[i] - angles[i - 1];
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn < -Math.PI) turn += 2 * Math.PI;
    res.push(Math.abs(turn));
  }
  return res;
}

const mean = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;

describe("walk", () => {
  it("returns one more point than there are steps, starting where told", () => {
    const path = new RNG(1234).walk({ steps: 10, start: [0.5, 0.25] });
    expect(path).toHaveLength(11);
    expect(path[0]).toEqual([0.5, 0.25]);
  });

  it("starts at the origin by default", () => {
    expect(new RNG(1234).walk({ steps: 3 })[0]).toEqual([0, 0]);
  });

  it("takes no steps at all when asked for none", () => {
    expect(new RNG(1234).walk({ steps: 0 })).toEqual([[0, 0]]);
  });

  it("takes steps of the size given", () => {
    const path = new RNG(1234).walk({ steps: 50, stepSize: 0.1 });
    for (let i = 1; i < path.length; i++) {
      expect(distance(path[i], path[i - 1])).toBeCloseTo(0.1, 12);
    }
  });

  it("is reproducible for the same seed", () => {
    const config = { steps: 20, stepSize: 0.1, momentum: 0.7 };
    expect(new RNG(1234).walk(config)).toEqual(new RNG(1234).walk(config));
  });

  it("differs between seeds", () => {
    const config = { steps: 20, stepSize: 0.1 };
    expect(new RNG(1).walk(config)).not.toEqual(new RNG(2).walk(config));
  });

  it("turns less the more momentum it has", () => {
    const jagged = turns(new RNG(1234).walk({ steps: 2000, momentum: 0 }));
    const middling = turns(new RNG(1234).walk({ steps: 2000, momentum: 0.5 }));
    const smooth = turns(new RNG(1234).walk({ steps: 2000, momentum: 0.95 }));
    expect(mean(middling)).toBeLessThan(mean(jagged));
    expect(mean(smooth)).toBeLessThan(mean(middling));
    expect(mean(smooth)).toBeLessThan(0.2);
  });

  it("wanders further from where it started the more momentum it has", () => {
    const far = (momentum: number) => {
      let total = 0;
      for (let seed = 0; seed < 20; seed++) {
        const path = new RNG(seed).walk({ steps: 300, momentum });
        total += distance(path[0], path[path.length - 1]);
      }
      return total / 20;
    };
    expect(far(0.9)).toBeGreaterThan(far(0));
  });

  it("goes nowhere in particular without drift", () => {
    let x = 0;
    let y = 0;
    for (let seed = 0; seed < 50; seed++) {
      const path = new RNG(seed).walk({ steps: 200 });
      x += path[path.length - 1][0] / 50;
      y += path[path.length - 1][1] / 50;
    }
    // The average end point of an undirected walk sits near where it began
    expect(Math.hypot(x, y)).toBeLessThan(8);
  });

  it("is carried along by drift", () => {
    const path = new RNG(1234).walk({ steps: 200, stepSize: 0.1, drift: [1, 0] });
    const end = path[path.length - 1];
    expect(end[0]).toBeGreaterThan(180);
    expect(Math.abs(end[1])).toBeLessThan(30);
  });

  it("goes straight from the heading given when momentum is total", () => {
    const path = new RNG(1234).walk({ steps: 5, stepSize: 1, momentum: 1, heading: 0 });
    expect(path[5][0]).toBeCloseTo(5, 9);
    expect(path[5][1]).toBeCloseTo(0, 9);
  });

  it("starts off in the direction given", () => {
    const path = new RNG(1234).walk({ steps: 1, stepSize: 1, heading: Math.PI / 2 });
    expect(path[1][0]).toBeCloseTo(0, 9);
    expect(path[1][1]).toBeCloseTo(1, 9);
  });

  it("matches the standalone function driven by the same generator", () => {
    const config = { steps: 10, momentum: 0.5 };
    expect(new RNG(1234).walk(config)).toEqual(walk(new RNG(1234).random, config));
  });

  it("rejects impossible configurations", () => {
    const rng = new RNG(1234);
    expect(() => rng.walk({ steps: -1 })).toThrow();
    expect(() => rng.walk({ steps: 1.5 })).toThrow();
    expect(() => rng.walk({ steps: 10, momentum: -0.1 })).toThrow();
    expect(() => rng.walk({ steps: 10, momentum: 1.1 })).toThrow();
    expect(() => rng.walk({ steps: 10, stepSize: -1 })).toThrow();
  });
});
