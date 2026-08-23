import { describe, expect, it } from "vitest";
import {
  bernoulli,
  beta,
  binomial,
  categorical,
  cauchy,
  chiSquared,
  exponential,
  gamma,
  gaussian,
  geometric,
  laplace,
  logNormal,
  pareto,
  poisson,
  studentT,
  triangular,
  weibull,
} from "../distributions.js";
import { RNG } from "../rng.js";

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

/** The value below which a given proportion of the sample falls. */
const quantile = (ns: number[], p: number) => {
  const sorted = [...ns].sort((a, b) => a - b);
  return sorted[Math.floor(p * (sorted.length - 1))];
};

describe("driving distributions directly", () => {
  it("takes any source of uniform randomness", () => {
    const values = collect(2000, () => exponential(Math.random, { rate: 2 }));
    expect(mean(values)).toBeCloseTo(0.5, 1);
  });

  it("matches the equivalent RNG method draw for draw", () => {
    const a = seeded();
    const b = seeded();
    expect(collect(20, () => gamma(a.random, { shape: 2.5 }))).toEqual(
      collect(20, () => b.gamma({ shape: 2.5 })),
    );
  });

  it("reproduces the same values for the same seed", () => {
    const a = collect(20, () => new RNG(7).beta({ alpha: 2, beta: 3 }));
    const b = collect(20, () => new RNG(7).beta({ alpha: 2, beta: 3 }));
    expect(a).toEqual(b);
  });
});

describe("gaussian", () => {
  it("has the requested mean and standard deviation", () => {
    const rng = seeded();
    const values = collect(20000, () => gaussian(rng.random, { mean: 10, sd: 2 }));
    expect(mean(values)).toBeCloseTo(10, 1);
    expect(sd(values)).toBeCloseTo(2, 1);
  });
});

describe("poisson", () => {
  it("has mean and variance lambda", () => {
    const rng = seeded();
    const values = collect(20000, () => poisson(rng.random, 4));
    expect(mean(values)).toBeCloseTo(4, 1);
    expect(sd(values) ** 2).toBeCloseTo(4, 0);
  });

  it("returns non-negative integers", () => {
    const rng = seeded();
    for (const n of collect(500, () => poisson(rng.random, 2))) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it("is always zero for a lambda of zero", () => {
    const rng = seeded();
    expect(collect(50, () => poisson(rng.random, 0))).toEqual(Array.from({ length: 50 }, () => 0));
  });

  it("rejects a negative lambda", () => {
    expect(() => poisson(seeded().random, -1)).toThrow();
  });
});

describe("bernoulli", () => {
  it("succeeds about p of the time", () => {
    const rng = seeded();
    const values = collect(20000, () => bernoulli(rng.random, 0.3));
    expect(mean(values.map((v) => (v ? 1 : 0)))).toBeCloseTo(0.3, 1);
  });

  it("is a fair coin by default", () => {
    const rng = seeded();
    const values = collect(20000, () => bernoulli(rng.random));
    expect(mean(values.map((v) => (v ? 1 : 0)))).toBeCloseTo(0.5, 1);
  });

  it("never succeeds at 0 and always succeeds at 1", () => {
    const rng = seeded();
    expect(collect(100, () => bernoulli(rng.random, 0)).some((v) => v)).toBe(false);
    expect(collect(100, () => bernoulli(rng.random, 1)).every((v) => v)).toBe(true);
  });
});

describe("exponential", () => {
  it("has mean 1 / rate", () => {
    const rng = seeded();
    expect(mean(collect(20000, () => exponential(rng.random)))).toBeCloseTo(1, 1);
    expect(mean(collect(20000, () => exponential(rng.random, { rate: 5 })))).toBeCloseTo(0.2, 1);
  });

  it("is always positive", () => {
    const rng = seeded();
    for (const n of collect(2000, () => exponential(rng.random))) {
      expect(n).toBeGreaterThan(0);
    }
  });

  it("is memoryless: the median is ln 2 / rate", () => {
    const rng = seeded();
    const values = collect(20000, () => exponential(rng.random, { rate: 2 }));
    expect(quantile(values, 0.5)).toBeCloseTo(Math.LN2 / 2, 1);
  });

  it("rejects a non-positive rate", () => {
    expect(() => exponential(seeded().random, { rate: 0 })).toThrow();
    expect(() => exponential(seeded().random, { rate: -1 })).toThrow();
  });
});

describe("logNormal", () => {
  it("is always positive", () => {
    const rng = seeded();
    for (const n of collect(2000, () => logNormal(rng.random))) {
      expect(n).toBeGreaterThan(0);
    }
  });

  it("has a log which is gaussian", () => {
    const rng = seeded();
    const logs = collect(20000, () => Math.log(logNormal(rng.random, { mu: 2, sigma: 0.5 })));
    expect(mean(logs)).toBeCloseTo(2, 1);
    expect(sd(logs)).toBeCloseTo(0.5, 1);
  });

  it("has median exp(mu)", () => {
    const rng = seeded();
    const values = collect(20000, () => logNormal(rng.random, { mu: 1 }));
    expect(quantile(values, 0.5)).toBeCloseTo(Math.E, 0);
  });
});

describe("cauchy", () => {
  it("is centred on its median", () => {
    const rng = seeded();
    const values = collect(20000, () => cauchy(rng.random, { median: 5 }));
    expect(quantile(values, 0.5)).toBeCloseTo(5, 1);
  });

  it("has quartiles a scale either side of the median", () => {
    const rng = seeded();
    const values = collect(20000, () => cauchy(rng.random, { median: 0, scale: 2 }));
    expect(quantile(values, 0.25)).toBeCloseTo(-2, 0);
    expect(quantile(values, 0.75)).toBeCloseTo(2, 0);
  });

  it("has far heavier tails than a gaussian", () => {
    const rng = seeded();
    const values = collect(20000, () => cauchy(rng.random));
    expect(Math.max(...values.map(Math.abs))).toBeGreaterThan(50);
  });

  it("rejects a non-positive scale", () => {
    expect(() => cauchy(seeded().random, { scale: 0 })).toThrow();
  });
});

describe("laplace", () => {
  it("is symmetric about its mean", () => {
    const rng = seeded();
    const values = collect(20000, () => laplace(rng.random, { mean: 3 }));
    expect(mean(values)).toBeCloseTo(3, 1);
    expect(quantile(values, 0.5)).toBeCloseTo(3, 1);
  });

  it("has variance 2 scale squared", () => {
    const rng = seeded();
    const values = collect(20000, () => laplace(rng.random, { scale: 2 }));
    expect(sd(values) ** 2).toBeCloseTo(8, 0);
  });

  it("rejects a non-positive scale", () => {
    expect(() => laplace(seeded().random, { scale: -1 })).toThrow();
  });
});

describe("pareto", () => {
  it("never falls below the scale", () => {
    const rng = seeded();
    for (const n of collect(2000, () => pareto(rng.random, { shape: 2, scale: 3 }))) {
      expect(n).toBeGreaterThanOrEqual(3);
    }
  });

  it("has mean shape * scale / (shape - 1) when that exists", () => {
    const rng = seeded();
    const values = collect(50000, () => pareto(rng.random, { shape: 4, scale: 1 }));
    expect(mean(values)).toBeCloseTo(4 / 3, 1);
  });

  it("has a heavier tail for a smaller shape", () => {
    const rng = seeded();
    const heavy = collect(20000, () => pareto(rng.random, { shape: 1.2 }));
    const light = collect(20000, () => pareto(rng.random, { shape: 5 }));
    expect(Math.max(...heavy)).toBeGreaterThan(Math.max(...light));
  });

  it("rejects non-positive parameters", () => {
    expect(() => pareto(seeded().random, { shape: 0 })).toThrow();
    expect(() => pareto(seeded().random, { shape: 1, scale: 0 })).toThrow();
  });
});

describe("weibull", () => {
  it("is exponential at a shape of 1", () => {
    const rng = seeded();
    const values = collect(20000, () => weibull(rng.random, { shape: 1, scale: 2 }));
    expect(mean(values)).toBeCloseTo(2, 0);
    expect(quantile(values, 0.5)).toBeCloseTo(2 * Math.LN2, 0);
  });

  it("humps around the scale for a large shape", () => {
    const rng = seeded();
    const values = collect(20000, () => weibull(rng.random, { shape: 8, scale: 1 }));
    expect(mean(values)).toBeCloseTo(0.94, 1);
    expect(sd(values)).toBeLessThan(0.2);
  });

  it("is always positive", () => {
    const rng = seeded();
    for (const n of collect(2000, () => weibull(rng.random, { shape: 0.5 }))) {
      expect(n).toBeGreaterThan(0);
    }
  });

  it("rejects non-positive parameters", () => {
    expect(() => weibull(seeded().random, { shape: -1 })).toThrow();
    expect(() => weibull(seeded().random, { shape: 1, scale: 0 })).toThrow();
  });
});

describe("triangular", () => {
  it("stays within its bounds", () => {
    const rng = seeded();
    for (const n of collect(2000, () => triangular(rng.random, { min: -1, max: 4, mode: 0 }))) {
      expect(n).toBeGreaterThanOrEqual(-1);
      expect(n).toBeLessThanOrEqual(4);
    }
  });

  it("has mean (min + max + mode) / 3", () => {
    const rng = seeded();
    const values = collect(20000, () => triangular(rng.random, { min: 0, max: 10, mode: 8 }));
    expect(mean(values)).toBeCloseTo(6, 0);
  });

  it("defaults to the unit range with a central mode", () => {
    const rng = seeded();
    const values = collect(20000, () => triangular(rng.random));
    expect(mean(values)).toBeCloseTo(0.5, 1);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });

  it("piles up at an extreme mode", () => {
    const rng = seeded();
    const values = collect(20000, () => triangular(rng.random, { min: 0, max: 1, mode: 1 }));
    expect(mean(values)).toBeCloseTo(2 / 3, 1);
  });

  it("rejects unordered bounds and an out of range mode", () => {
    expect(() => triangular(seeded().random, { min: 1, max: 0 })).toThrow();
    expect(() => triangular(seeded().random, { min: 0, max: 1, mode: 2 })).toThrow();
  });
});

describe("gamma", () => {
  it("has mean shape * scale and variance shape * scale squared", () => {
    const rng = seeded();
    const values = collect(20000, () => gamma(rng.random, { shape: 3, scale: 2 }));
    expect(mean(values)).toBeCloseTo(6, 0);
    expect(sd(values) ** 2).toBeCloseTo(12, -1);
  });

  it("works for shapes below one", () => {
    const rng = seeded();
    const values = collect(20000, () => gamma(rng.random, { shape: 0.3 }));
    expect(mean(values)).toBeCloseTo(0.3, 1);
    for (const n of values) expect(n).toBeGreaterThanOrEqual(0);
  });

  it("is exponential at a shape of one", () => {
    const rng = seeded();
    const values = collect(20000, () => gamma(rng.random, { shape: 1 }));
    expect(mean(values)).toBeCloseTo(1, 1);
    expect(quantile(values, 0.5)).toBeCloseTo(Math.LN2, 1);
  });

  it("rejects non-positive parameters", () => {
    expect(() => gamma(seeded().random, { shape: 0 })).toThrow();
    expect(() => gamma(seeded().random, { shape: 1, scale: -2 })).toThrow();
  });
});

describe("beta", () => {
  it("stays in [0, 1]", () => {
    const rng = seeded();
    for (const n of collect(2000, () => beta(rng.random, { alpha: 0.5, beta: 0.5 }))) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it("has mean alpha / (alpha + beta)", () => {
    const rng = seeded();
    const values = collect(20000, () => beta(rng.random, { alpha: 2, beta: 6 }));
    expect(mean(values)).toBeCloseTo(0.25, 1);
  });

  it("is uniform when both parameters are one", () => {
    const rng = seeded();
    const values = collect(20000, () => beta(rng.random, { alpha: 1, beta: 1 }));
    const buckets = Array.from({ length: 5 }, () => 0);
    for (const v of values) buckets[Math.min(4, Math.floor(v * 5))]++;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(3400);
      expect(count).toBeLessThan(4600);
    }
  });

  it("piles up at both ends when both parameters are small", () => {
    const rng = seeded();
    const values = collect(20000, () => beta(rng.random, { alpha: 0.2, beta: 0.2 }));
    const extreme = values.filter((v) => v < 0.1 || v > 0.9).length;
    expect(extreme).toBeGreaterThan(values.length / 2);
  });

  it("rejects non-positive parameters", () => {
    expect(() => beta(seeded().random, { alpha: 0, beta: 1 })).toThrow();
    expect(() => beta(seeded().random, { alpha: 1, beta: -1 })).toThrow();
  });
});

describe("chiSquared", () => {
  it("has mean df and variance 2 df", () => {
    const rng = seeded();
    const values = collect(20000, () => chiSquared(rng.random, 5));
    expect(mean(values)).toBeCloseTo(5, 0);
    expect(sd(values) ** 2).toBeCloseTo(10, -1);
  });

  it("is always positive", () => {
    const rng = seeded();
    for (const n of collect(1000, () => chiSquared(rng.random, 1))) {
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it("rejects non-positive degrees of freedom", () => {
    expect(() => chiSquared(seeded().random, 0)).toThrow();
  });
});

describe("studentT", () => {
  it("is centred on zero", () => {
    const rng = seeded();
    const values = collect(20000, () => studentT(rng.random, 10));
    expect(quantile(values, 0.5)).toBeCloseTo(0, 1);
  });

  it("has variance df / (df - 2)", () => {
    const rng = seeded();
    const values = collect(20000, () => studentT(rng.random, 10));
    expect(sd(values) ** 2).toBeCloseTo(1.25, 0);
  });

  it("approaches a standard normal as df grows", () => {
    const rng = seeded();
    const values = collect(20000, () => studentT(rng.random, 200));
    expect(sd(values)).toBeCloseTo(1, 1);
  });

  it("rejects non-positive degrees of freedom", () => {
    expect(() => studentT(seeded().random, -1)).toThrow();
  });
});

describe("binomial", () => {
  it("has mean n * p and variance n * p * (1 - p)", () => {
    const rng = seeded();
    const values = collect(20000, () => binomial(rng.random, { n: 20, p: 0.3 }));
    expect(mean(values)).toBeCloseTo(6, 0);
    expect(sd(values) ** 2).toBeCloseTo(4.2, 0);
  });

  it("returns integers within [0, n]", () => {
    const rng = seeded();
    for (const n of collect(1000, () => binomial(rng.random, { n: 5, p: 0.5 }))) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it("is degenerate at the extremes of n and p", () => {
    const rng = seeded();
    expect(binomial(rng.random, { n: 0, p: 0.5 })).toBe(0);
    expect(binomial(rng.random, { n: 10, p: 0 })).toBe(0);
    expect(binomial(rng.random, { n: 10, p: 1 })).toBe(10);
  });

  it("rejects a bad n or p", () => {
    expect(() => binomial(seeded().random, { n: 1.5, p: 0.5 })).toThrow();
    expect(() => binomial(seeded().random, { n: -1, p: 0.5 })).toThrow();
    expect(() => binomial(seeded().random, { n: 10, p: 1.5 })).toThrow();
  });
});

describe("geometric", () => {
  it("has mean (1 - p) / p failures", () => {
    const rng = seeded();
    const values = collect(20000, () => geometric(rng.random, 0.25));
    expect(mean(values)).toBeCloseTo(3, 0);
  });

  it("returns non-negative integers", () => {
    const rng = seeded();
    for (const n of collect(1000, () => geometric(rng.random, 0.5))) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it("is always zero for a certain success", () => {
    const rng = seeded();
    expect(collect(50, () => geometric(rng.random, 1)).every((n) => n === 0)).toBe(true);
  });

  it("rejects a p outside (0, 1]", () => {
    expect(() => geometric(seeded().random, 0)).toThrow();
    expect(() => geometric(seeded().random, 1.5)).toThrow();
  });
});

describe("categorical", () => {
  it("picks indices in proportion to the weights", () => {
    const rng = seeded();
    const counts = [0, 0, 0];
    for (const i of collect(20000, () => categorical(rng.random, [5, 3, 2]))) counts[i]++;
    expect(counts[0] / 20000).toBeCloseTo(0.5, 1);
    expect(counts[1] / 20000).toBeCloseTo(0.3, 1);
    expect(counts[2] / 20000).toBeCloseTo(0.2, 1);
  });

  it("never picks a zero weight", () => {
    const rng = seeded();
    const seen = new Set(collect(2000, () => categorical(rng.random, [1, 0, 1])));
    expect(seen).toEqual(new Set([0, 2]));
  });

  it("always picks the only option", () => {
    const rng = seeded();
    expect(collect(50, () => categorical(rng.random, [3])).every((i) => i === 0)).toBe(true);
  });

  it("rejects empty, negative or all-zero weights", () => {
    expect(() => categorical(seeded().random, [])).toThrow();
    expect(() => categorical(seeded().random, [1, -1])).toThrow();
    expect(() => categorical(seeded().random, [0, 0])).toThrow();
  });
});

describe("RNG methods", () => {
  it("exposes every distribution", () => {
    const rng = seeded();
    expect(typeof rng.bernoulli(0.5)).toBe("boolean");
    expect(rng.exponential({ rate: 2 })).toBeGreaterThan(0);
    expect(rng.logNormal({ mu: 1 })).toBeGreaterThan(0);
    expect(Number.isFinite(rng.cauchy())).toBe(true);
    expect(Number.isFinite(rng.laplace())).toBe(true);
    expect(rng.pareto({ shape: 2 })).toBeGreaterThanOrEqual(1);
    expect(rng.weibull({ shape: 2 })).toBeGreaterThan(0);
    expect(rng.triangular({ min: 1, max: 2 })).toBeGreaterThanOrEqual(1);
    expect(rng.gamma({ shape: 2 })).toBeGreaterThan(0);
    expect(rng.beta({ alpha: 2, beta: 2 })).toBeLessThanOrEqual(1);
    expect(rng.chiSquared(3)).toBeGreaterThan(0);
    expect(Number.isFinite(rng.studentT(3))).toBe(true);
    expect(rng.binomial({ n: 4, p: 0.5 })).toBeLessThanOrEqual(4);
    expect(rng.geometric(0.5)).toBeGreaterThanOrEqual(0);
    expect(rng.categorical([1, 1])).toBeLessThan(2);
  });

  it("keeps gaussian and poisson identical to a direct call", () => {
    const a = seeded();
    const b = seeded();
    expect(collect(20, () => a.gaussian({ mean: 3, sd: 2 }))).toEqual(
      collect(20, () => gaussian(b.random, { mean: 3, sd: 2 })),
    );
    expect(collect(20, () => a.poisson(3))).toEqual(collect(20, () => poisson(b.random, 3)));
  });
});

describe("weightedSample", () => {
  it("picks values in proportion to their weights", () => {
    const rng = seeded();
    const counts = { circle: 0, square: 0, triangle: 0 };
    for (let i = 0; i < 20000; i++) {
      counts[
        rng.weightedSample<"circle" | "square" | "triangle">([
          [5, "circle"],
          [3, "square"],
          [2, "triangle"],
        ])
      ]++;
    }
    expect(counts.circle / 20000).toBeCloseTo(0.5, 1);
    expect(counts.square / 20000).toBeCloseTo(0.3, 1);
    expect(counts.triangle / 20000).toBeCloseTo(0.2, 1);
  });

  it("always returns the only case", () => {
    const rng = seeded();
    expect(collect(20, () => rng.weightedSample([[1, "only"]]))).toEqual(
      Array.from({ length: 20 }, () => "only"),
    );
  });

  it("rejects an empty set of cases", () => {
    expect(() => seeded().weightedSample([])).toThrow();
  });
});
