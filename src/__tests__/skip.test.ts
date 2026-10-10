import { describe, expect, it } from "vitest";
import { RNG } from "../rng.js";

/** A generator moved along by calling `next()` the slow way. */
function stepped(seed: number | string, n: number): RNG {
  const rng = new RNG(seed);
  for (let i = 0; i < n; i++) rng.next();
  return rng;
}

describe("skip", () => {
  it("lands exactly where that many calls to next() would", () => {
    for (const n of [0, 1, 2, 3, 7, 64, 1000, 12345]) {
      const skipped = new RNG("sunflower").skip(n);
      expect(skipped.getState()).toEqual(stepped("sunflower", n).getState());
    }
  });

  it("goes on to draw the same sequence", () => {
    const a = new RNG(42).skip(500);
    const b = stepped(42, 500);
    for (let i = 0; i < 20; i++) expect(a.number()).toBe(b.number());
  });

  it("steps back with a negative count", () => {
    const rng = new RNG(7);
    rng.next();
    rng.next();
    const third = rng.next();
    expect(rng.skip(-1).next()).toBe(third);
  });

  it("undoes itself, however far it goes", () => {
    for (const n of [1, 2 ** 31, 2 ** 32, 2 ** 32 + 1, 2 ** 40 + 17, Number.MAX_SAFE_INTEGER]) {
      const rng = new RNG(1234);
      const before = rng.getState();
      rng.skip(n).skip(-n);
      expect(rng.getState()).toEqual(before);
    }
  });

  it("adds up: two skips are one skip of their sum", () => {
    const a = new RNG(5).skip(2 ** 31).skip(2 ** 31);
    const b = new RNG(5).skip(2 ** 32);
    expect(a.getState()).toEqual(b.getState());

    const c = new RNG(5).skip(123_456_789).skip(-23_456_789);
    const d = new RNG(5).skip(100_000_000);
    expect(c.getState()).toEqual(d.getState());
  });

  it("respects a custom increment", () => {
    const a = new RNG(1, 2, 0xdeadbeef, 0xcafef00d);
    const b = new RNG(1, 2, 0xdeadbeef, 0xcafef00d);
    for (let i = 0; i < 99; i++) a.next();
    expect(b.skip(99).getState()).toEqual(a.getState());
  });

  it("leaves streams alone, since it does not touch the seed", () => {
    const rng = new RNG("seed");
    const before = rng.stream("layer").next();
    rng.skip(1_000_000);
    expect(rng.stream("layer").next()).toBe(before);
  });

  it("survives serialisation", () => {
    const rng = new RNG("seed").skip(2 ** 45);
    const copy = RNG.fromJSON(rng.toJSON());
    expect(copy.next()).toBe(rng.next());
  });

  it("returns the generator, for chaining", () => {
    const rng = new RNG(1);
    expect(rng.skip(3)).toBe(rng);
  });

  it("rejects counts that are not safe integers", () => {
    const rng = new RNG(1);
    expect(() => rng.skip(1.5)).toThrow("n must be a safe integer");
    expect(() => rng.skip(Number.NaN)).toThrow("n must be a safe integer");
    expect(() => rng.skip(2 ** 60)).toThrow("n must be a safe integer");
  });
});
