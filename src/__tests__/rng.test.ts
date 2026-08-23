import { describe, expect, it } from "vitest";
import { RNG } from "../rng.js";
import type { Point2D } from "../types.js";

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

describe("seeding and state", () => {
  it("gives the same sequence for the same seed", () => {
    const a = collect(100, () => new RNG(42).number());
    const b = collect(100, () => new RNG(42).number());
    expect(a).toEqual(b);
  });

  it("gives different sequences for different seeds", () => {
    const a = collect(20, () => new RNG(1).number());
    const b = collect(20, () => new RNG(2).number());
    expect(a).not.toEqual(b);
  });

  it("accepts a full 64 bit seed", () => {
    const a = new RNG(0x12345678, 0x9abcdef0);
    const b = new RNG(0x12345678, 0x9abcdef0);
    const c = new RNG(0x12345679, 0x9abcdef0);
    expect(collect(10, () => a.number())).toEqual(collect(10, () => b.number()));
    expect(collect(10, () => a.number())).not.toEqual(collect(10, () => c.number()));
  });

  it("picks its own seed when given none", () => {
    const a = collect(20, () => new RNG().number());
    const b = collect(20, () => new RNG().number());
    expect(a).not.toEqual(b);
  });

  it("round trips through getState/setState", () => {
    const rng = seeded();
    rng.number();
    const state = rng.getState();
    const first = collect(10, () => rng.number());
    rng.setState(state);
    expect(collect(10, () => rng.number())).toEqual(first);
  });

  it("returns a state of four 32 bit words", () => {
    const state = seeded().getState();
    expect(state).toHaveLength(4);
    for (const word of state) {
      expect(Number.isInteger(word)).toBe(true);
    }
  });

  it("re-seeds in place", () => {
    const rng = new RNG(7);
    const expected = collect(10, () => rng.number());
    rng.number();
    rng.number();
    rng.seed(7);
    expect(collect(10, () => rng.number())).toEqual(expected);
  });

  it("re-seeds to a fresh random stream when given no seed", () => {
    const rng = new RNG(7);
    const seededValues = collect(10, () => rng.number());
    rng.seed();
    expect(collect(10, () => rng.number())).not.toEqual(seededValues);
  });
});

describe("next", () => {
  it("returns 32 bit unsigned integers", () => {
    const rng = seeded();
    for (const n of collect(1000, () => rng.next())) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("spreads values across the whole range", () => {
    const rng = seeded();
    const values = collect(1000, () => rng.next());
    expect(Math.min(...values)).toBeLessThan(0x20000000);
    expect(Math.max(...values)).toBeGreaterThan(0xe0000000);
  });
});

describe("number", () => {
  it("stays in [0, 1)", () => {
    const rng = seeded();
    for (const n of collect(5000, () => rng.number())) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it("is roughly uniform", () => {
    const rng = seeded();
    const values = collect(20000, () => rng.number());
    expect(mean(values)).toBeCloseTo(0.5, 1);

    const buckets = Array.from({ length: 10 }, () => 0);
    for (const v of values) buckets[Math.floor(v * 10)]++;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(1500);
      expect(count).toBeLessThan(2500);
    }
  });

  it("has fine grained precision", () => {
    const rng = seeded();
    const values = collect(1000, () => rng.number());
    expect(new Set(values).size).toBe(1000);
  });
});

describe("integer", () => {
  it("stays in [0, max) for a power of two", () => {
    const rng = seeded();
    for (const n of collect(2000, () => rng.integer(16))) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(16);
    }
  });

  it("stays in [0, max) for a non power of two", () => {
    const rng = seeded();
    for (const n of collect(2000, () => rng.integer(7))) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });

  it("covers the whole range roughly evenly", () => {
    const rng = seeded();
    const counts = Array.from({ length: 6 }, () => 0);
    for (const n of collect(12000, () => rng.integer(6))) counts[n]++;
    for (const count of counts) {
      expect(count).toBeGreaterThan(1700);
      expect(count).toBeLessThan(2300);
    }
  });

  it("falls back to a raw 32 bit draw for a max of 0", () => {
    const a = new RNG(99);
    const b = new RNG(99);
    expect(a.integer(0)).toBe(b.next());
  });
});

describe("uniformRandomInt", () => {
  it("includes both bounds by default", () => {
    const rng = seeded();
    const seen = new Set(collect(500, () => rng.uniformRandomInt({ to: 3 })));
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("excludes the upper bound when asked", () => {
    const rng = seeded();
    const seen = new Set(collect(500, () => rng.uniformRandomInt({ to: 3, inclusive: false })));
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it("respects a lower bound", () => {
    const rng = seeded();
    const seen = new Set(collect(500, () => rng.uniformRandomInt({ from: 10, to: 12 })));
    expect([...seen].sort((a, b) => a - b)).toEqual([10, 11, 12]);
  });

  it("handles negative ranges", () => {
    const rng = seeded();
    const seen = new Set(collect(500, () => rng.uniformRandomInt({ from: -2, to: 0 })));
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0]);
  });

  it("returns integers", () => {
    const rng = seeded();
    for (const n of collect(100, () => rng.uniformRandomInt({ to: 10 }))) {
      expect(Number.isInteger(n)).toBe(true);
    }
  });
});

describe("uniformGridPoint", () => {
  it("stays within the grid, on integer coordinates", () => {
    const rng = seeded();
    for (let i = 0; i < 500; i++) {
      const [x, y] = rng.uniformGridPoint({
        minX: 0,
        maxX: 4,
        minY: -3,
        maxY: 3,
      });
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(4);
      expect(y).toBeGreaterThanOrEqual(-3);
      expect(y).toBeLessThanOrEqual(3);
    }
  });

  it("reaches every corner of a small grid", () => {
    const rng = seeded();
    const seen = new Set(
      collect(500, () => rng.uniformGridPoint({ minX: 0, maxX: 1, minY: 0, maxY: 1 }).join(",")),
    );
    expect(seen).toEqual(new Set(["0,0", "0,1", "1,0", "1,1"]));
  });
});

describe("randomPoint", () => {
  it("stays in the unit square by default", () => {
    const rng = seeded();
    for (let i = 0; i < 1000; i++) {
      const [x, y] = rng.randomPoint();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(1);
    }
  });

  it("scales to the given region", () => {
    const rng = seeded();
    const points = collect(1000, () => rng.randomPoint({ width: 4, height: 2 }));
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(4);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(2);
    }
    expect(mean(points.map((p) => p[0]))).toBeCloseTo(2, 0);
    expect(mean(points.map((p) => p[1]))).toBeCloseTo(1, 0);
  });
});

describe("randomAngle", () => {
  it("stays in [0, 2π)", () => {
    const rng = seeded();
    for (const a of collect(2000, () => rng.randomAngle())) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(Math.PI * 2);
    }
  });

  it("covers the full turn", () => {
    const rng = seeded();
    const angles = collect(5000, () => rng.randomAngle());
    expect(Math.min(...angles)).toBeLessThan(0.1);
    expect(Math.max(...angles)).toBeGreaterThan(Math.PI * 2 - 0.1);
    expect(mean(angles)).toBeCloseTo(Math.PI, 0);
  });
});

describe("randomPolarity", () => {
  it("only ever returns 1 or -1", () => {
    const rng = seeded();
    const seen = new Set(collect(500, () => rng.randomPolarity()));
    expect(seen).toEqual(new Set([1, -1]));
  });

  it("is a fair coin", () => {
    const rng = seeded();
    const values = collect(10000, () => rng.randomPolarity());
    const positive = values.filter((v) => v === 1).length;
    expect(positive).toBeGreaterThan(4700);
    expect(positive).toBeLessThan(5300);
  });
});

describe("sample", () => {
  it("only returns members of the array", () => {
    const rng = seeded();
    const from = ["a", "b", "c", "d"];
    for (const s of collect(500, () => rng.sample(from))) {
      expect(from).toContain(s);
    }
  });

  it("reaches every member", () => {
    const rng = seeded();
    const from = ["a", "b", "c", "d"];
    expect(new Set(collect(500, () => rng.sample(from)))).toEqual(new Set(from));
  });

  it("always returns the only element of a singleton", () => {
    const rng = seeded();
    expect(collect(20, () => rng.sample([7]))).toEqual(Array.from({ length: 20 }, () => 7));
  });

  it("throws on an empty array", () => {
    expect(() => seeded().sample([])).toThrow("Cannot sample from an empty array");
  });

  it("does not mutate the source", () => {
    const rng = seeded();
    const from = ["a", "b", "c"];
    collect(20, () => rng.sample(from));
    expect(from).toEqual(["a", "b", "c"]);
  });
});

describe("samples", () => {
  it("returns exactly n values, all from the source", () => {
    const rng = seeded();
    const from = [1, 2, 3];
    const result = rng.samples(10, from);
    expect(result).toHaveLength(10);
    for (const r of result) expect(from).toContain(r);
  });

  it("samples with replacement", () => {
    const rng = seeded();
    expect(rng.samples(5, ["only"])).toEqual(Array.from({ length: 5 }, () => "only"));
  });

  it("returns an empty array for n of 0", () => {
    expect(seeded().samples(0, [1, 2, 3])).toEqual([]);
    expect(seeded().samples(0, [])).toEqual([]);
  });

  it("throws when sampling a non-zero count from an empty array", () => {
    expect(() => seeded().samples(1, [])).toThrow();
  });
});

describe("shuffle", () => {
  it("keeps exactly the same elements", () => {
    const rng = seeded();
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle([...items]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });

  it("mutates in place and returns the same array", () => {
    const rng = seeded();
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = rng.shuffle(items);
    expect(result).toBe(items);
  });

  it("actually reorders", () => {
    const rng = seeded();
    const original = Array.from({ length: 50 }, (_, i) => i);
    expect(rng.shuffle([...original])).not.toEqual(original);
  });

  it("handles empty and single element arrays", () => {
    const rng = seeded();
    expect(rng.shuffle([])).toEqual([]);
    expect(rng.shuffle([1])).toEqual([1]);
  });

  it("is unbiased across positions", () => {
    const rng = seeded();
    // How often does each of 4 items land first?
    const firsts = Array.from({ length: 4 }, () => 0);
    for (let i = 0; i < 8000; i++) {
      firsts[rng.shuffle([0, 1, 2, 3])[0]]++;
    }
    for (const count of firsts) {
      expect(count).toBeGreaterThan(1700);
      expect(count).toBeLessThan(2300);
    }
  });

  it("is deterministic for a given seed", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(new RNG(5).shuffle([...items])).toEqual(new RNG(5).shuffle([...items]));
  });
});

describe("shuffled", () => {
  it("leaves the original untouched", () => {
    const rng = seeded();
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = rng.shuffled(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result).not.toBe(items);
    expect([...result].sort((a, b) => a - b)).toEqual(items);
  });
});

describe("perturb", () => {
  it("moves a point by at most half the magnitude on each axis", () => {
    const rng = seeded();
    const at: Point2D = [0.5, 0.5];
    for (let i = 0; i < 1000; i++) {
      const [x, y] = rng.perturb({ at, magnitude: 0.4 });
      expect(Math.abs(x - 0.5)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(y - 0.5)).toBeLessThanOrEqual(0.2);
    }
  });

  it("defaults to changes of -0.05 to 0.05", () => {
    const rng = seeded();
    for (let i = 0; i < 1000; i++) {
      const [x, y] = rng.perturb({ at: [1, 2] });
      expect(Math.abs(x - 1)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(y - 2)).toBeLessThanOrEqual(0.05);
    }
  });

  it("is centred on the original point", () => {
    const rng = seeded();
    const points = collect(5000, () => rng.perturb({ at: [1, 2] }));
    expect(mean(points.map((p) => p[0]))).toBeCloseTo(1, 2);
    expect(mean(points.map((p) => p[1]))).toBeCloseTo(2, 2);
  });

  it("does not mutate the input point", () => {
    const rng = seeded();
    const at: Point2D = [0.5, 0.5];
    rng.perturb({ at });
    expect(at).toEqual([0.5, 0.5]);
  });
});

describe("gaussian", () => {
  it("is standard normal by default", () => {
    const rng = seeded();
    const values = collect(20000, () => rng.gaussian());
    expect(mean(values)).toBeCloseTo(0, 1);
    expect(sd(values)).toBeCloseTo(1, 1);
  });

  it("respects mean and standard deviation", () => {
    const rng = seeded();
    const values = collect(20000, () => rng.gaussian({ mean: 10, sd: 3 }));
    expect(mean(values)).toBeCloseTo(10, 0);
    expect(sd(values)).toBeGreaterThan(2.8);
    expect(sd(values)).toBeLessThan(3.2);
  });

  it("always produces finite numbers", () => {
    const rng = seeded();
    for (const n of collect(20000, () => rng.gaussian())) {
      expect(Number.isFinite(n)).toBe(true);
    }
  });

  it("keeps roughly two thirds of draws within one sd", () => {
    const rng = seeded();
    const values = collect(20000, () => rng.gaussian());
    const within = values.filter((v) => Math.abs(v) < 1).length / values.length;
    expect(within).toBeGreaterThan(0.64);
    expect(within).toBeLessThan(0.72);
  });
});

describe("poisson", () => {
  it("returns non-negative integers", () => {
    const rng = seeded();
    for (const n of collect(2000, () => rng.poisson(3))) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it("has mean and variance close to lambda", () => {
    const rng = seeded();
    const values = collect(20000, () => rng.poisson(4));
    expect(mean(values)).toBeCloseTo(4, 0);
    expect(sd(values) * sd(values)).toBeGreaterThan(3.4);
    expect(sd(values) * sd(values)).toBeLessThan(4.6);
  });

  it("is always 0 for lambda 0", () => {
    const rng = seeded();
    expect(collect(50, () => rng.poisson(0))).toEqual(Array.from({ length: 50 }, () => 0));
  });
});

describe("doProportion", () => {
  it("never fires at probability 0 and always fires at 1", () => {
    const rng = seeded();
    let never = 0;
    let always = 0;
    for (let i = 0; i < 200; i++) {
      rng.doProportion(0, () => never++);
      rng.doProportion(1, () => always++);
    }
    expect(never).toBe(0);
    expect(always).toBe(200);
  });

  it("fires at roughly the given rate", () => {
    const rng = seeded();
    let fired = 0;
    for (let i = 0; i < 10000; i++) {
      rng.doProportion(0.25, () => fired++);
    }
    expect(fired).toBeGreaterThan(2300);
    expect(fired).toBeLessThan(2700);
  });

  it("reports whether the callback ran", () => {
    const rng = seeded();
    expect(rng.doProportion(1, () => {})).toBe(true);
    expect(rng.doProportion(0, () => {})).toBe(false);
  });
});

describe("proportionately", () => {
  it("picks cases in proportion to their weights", () => {
    const rng = seeded();
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 10000; i++) {
      counts[
        rng.proportionately<string>([
          [5, () => "a"],
          [3, () => "b"],
          [2, () => "c"],
        ])
      ]++;
    }
    expect(counts.a / 10000).toBeCloseTo(0.5, 1);
    expect(counts.b / 10000).toBeCloseTo(0.3, 1);
    expect(counts.c / 10000).toBeCloseTo(0.2, 1);
  });

  it("never picks a zero weighted case", () => {
    const rng = seeded();
    for (let i = 0; i < 500; i++) {
      expect(
        rng.proportionately<string>([
          [0, () => "never"],
          [1, () => "always"],
        ]),
      ).toBe("always");
    }
  });

  it("does not need weights summing to one", () => {
    const rng = seeded();
    const seen = new Set(
      collect(500, () =>
        rng.proportionately<string>([
          [70, () => "a"],
          [30, () => "b"],
        ]),
      ),
    );
    expect(seen).toEqual(new Set(["a", "b"]));
  });

  it("throws when the total weight is not positive", () => {
    expect(() => seeded().proportionately([[0, () => 1]])).toThrow("Must be positive total");
    expect(() => seeded().proportionately([])).toThrow("Must be positive total");
  });

  it("only calls the chosen case", () => {
    const rng = seeded();
    let calls = 0;
    rng.proportionately([
      [1, () => calls++],
      [1, () => calls++],
      [1, () => calls++],
    ]);
    expect(calls).toBe(1);
  });
});

/** A simple iteration function: calls back with 0..n-1. */
const upTo = (config: { n: number }, cb: (i: number) => void) => {
  for (let i = 0; i < config.n; i++) cb(i);
};

/** An iteration function passing more than one argument to its callback. */
const pairs = (config: { n: number }, cb: (i: number, label: string) => void) => {
  for (let i = 0; i < config.n; i++) cb(i, `item-${i}`);
};

describe("withRandomOrder", () => {
  it("visits every item exactly once", () => {
    const rng = seeded();
    const seen: number[] = [];
    rng.withRandomOrder(upTo, { n: 20 }, (i) => seen.push(i));
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it("visits them out of order", () => {
    const rng = seeded();
    const seen: number[] = [];
    rng.withRandomOrder(upTo, { n: 50 }, (i) => seen.push(i));
    expect(seen).not.toEqual(Array.from({ length: 50 }, (_, i) => i));
  });

  it("passes every argument through", () => {
    const rng = seeded();
    const seen: string[] = [];
    rng.withRandomOrder(pairs, { n: 5 }, (i, label) => {
      expect(label).toBe(`item-${i}`);
      seen.push(label);
    });
    expect(seen).toHaveLength(5);
  });

  it("handles an iteration function that never calls back", () => {
    const rng = seeded();
    let called = 0;
    rng.withRandomOrder(upTo, { n: 0 }, () => called++);
    expect(called).toBe(0);
  });
});

describe("random", () => {
  it("matches number()", () => {
    expect(collect(10, () => new RNG(3).random())).toEqual(collect(10, () => new RNG(3).number()));
  });

  it("stays bound when detached from the instance", () => {
    const rng = seeded();
    const fn = rng.random;
    for (const n of collect(100, fn)) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

/** Exercises every public method, in a fixed order, from one seed. */
const runEverything = () => {
  const rng = new RNG(2024);
  return [
    rng.number(),
    rng.integer(37),
    rng.randomAngle(),
    rng.randomPolarity(),
    ...rng.randomPoint(),
    ...rng.uniformGridPoint({ minX: 0, maxX: 9, minY: 0, maxY: 9 }),
    rng.uniformRandomInt({ from: 3, to: 11 }),
    rng.sample([1, 2, 3, 4, 5]),
    ...rng.samples(3, [1, 2, 3, 4, 5]),
    ...rng.shuffle([1, 2, 3, 4, 5]),
    ...rng.perturb({ at: [0.5, 0.5] }),
    rng.gaussian({ mean: 2, sd: 0.5 }),
    rng.poisson(3),
    rng.proportionately<number>([
      [1, () => 0],
      [2, () => 1],
    ]),
    rng.poissonDiskPoints({ minDist: 0.2 }).length,
  ];
};

describe("determinism across the whole API", () => {
  it("replays every method identically for the same seed", () => {
    expect(runEverything()).toEqual(runEverything());
  });
});
