import { describe, expect, it } from "vitest";
import { hashSeed } from "../hash.js";
import { RNG } from "../rng.js";

/** Collect n values from a generator function. */
function collect<T>(n: number, fn: () => T): T[] {
  const res: T[] = [];
  for (let i = 0; i < n; i++) res.push(fn());
  return res;
}

describe("hashSeed", () => {
  it("gives the same words for the same string", () => {
    expect(hashSeed("sunflower")).toEqual(hashSeed("sunflower"));
  });

  it("gives two unsigned 32 bit words", () => {
    for (const s of ["", "a", "sunflower", "a rather longer seed, with spaces"]) {
      const [hi, lo] = hashSeed(s);
      for (const word of [hi, lo]) {
        expect(Number.isInteger(word)).toBe(true);
        expect(word).toBeGreaterThanOrEqual(0);
        expect(word).toBeLessThanOrEqual(0xffffffff);
      }
    }
  });

  it("separates strings that differ by one character", () => {
    expect(hashSeed("tree")).not.toEqual(hashSeed("tres"));
    expect(hashSeed("seed1")).not.toEqual(hashSeed("seed2"));
    expect(hashSeed("a")).not.toEqual(hashSeed("b"));
  });

  it("separates the empty string from a single character", () => {
    expect(hashSeed("")).not.toEqual(hashSeed("\0"));
  });

  it("does not collide over a large family of similar strings", () => {
    const seen = new Set(collect(5000, () => 0).map((_, i) => hashSeed(`sketch-${i}`).join(",")));
    expect(seen.size).toBe(5000);
  });
});

describe("seeding from a string", () => {
  it("gives the same sequence for the same string", () => {
    const a = new RNG("sunflower");
    const b = new RNG("sunflower");
    expect(collect(50, () => a.number())).toEqual(collect(50, () => b.number()));
  });

  it("gives different sequences for different strings", () => {
    const a = new RNG("sunflower");
    const b = new RNG("sunflowes");
    expect(collect(20, () => a.number())).not.toEqual(collect(20, () => b.number()));
  });

  it("matches seeding with the hashed words directly", () => {
    const [hi, lo] = hashSeed("sunflower");
    const a = new RNG("sunflower");
    const b = new RNG(hi, lo);
    expect(collect(10, () => a.number())).toEqual(collect(10, () => b.number()));
  });

  it("accepts the empty string as a seed", () => {
    const a = collect(10, () => new RNG("").number());
    const b = collect(10, () => new RNG("").number());
    expect(a).toEqual(b);
    expect(a).not.toEqual(collect(10, () => new RNG("x").number()));
  });

  it("keeps a string seed and the same string as an id apart", () => {
    const a = new RNG("sunflower");
    const b = new RNG("sunflower").stream("sunflower");
    expect(collect(10, () => a.number())).not.toEqual(collect(10, () => b.number()));
  });

  it("re-seeds in place from a string", () => {
    const rng = new RNG(1234);
    rng.seed("sunflower");
    const fresh = new RNG("sunflower");
    expect(collect(10, () => rng.number())).toEqual(collect(10, () => fresh.number()));
  });

  it("still produces well spread numbers", () => {
    const rng = new RNG("sunflower");
    const ns = collect(5000, () => rng.number());
    const mean = ns.reduce((a, b) => a + b, 0) / ns.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);

    // And the first draw of a string seeded generator is not itself skewed
    const firsts = collect(500, () => new RNG(`sketch-${Math.random()}`).number());
    const firstMean = firsts.reduce((a, b) => a + b, 0) / firsts.length;
    expect(firstMean).toBeGreaterThan(0.42);
    expect(firstMean).toBeLessThan(0.58);
  });
});
