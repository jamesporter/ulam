import { describe, expect, it } from "vitest";
import { RNG } from "../rng.js";

/** Collect n values from a generator function. */
function collect<T>(n: number, fn: () => T): T[] {
  const res: T[] = [];
  for (let i = 0; i < n; i++) res.push(fn());
  return res;
}

describe("stream", () => {
  it("is reproducible for the same seed and id", () => {
    const a = new RNG("sunflower").stream("colour");
    const b = new RNG("sunflower").stream("colour");

    expect(collect(20, () => a.number())).toEqual(collect(20, () => b.number()));
  });

  it("differs between ids", () => {
    const rng = new RNG("sunflower");
    const colour = rng.stream("colour");
    const layout = rng.stream("layout");
    expect(collect(20, () => colour.number())).not.toEqual(collect(20, () => layout.number()));
  });

  it("differs between seeds", () => {
    const a = new RNG("sunflower").stream("colour");
    const b = new RNG("moonflower").stream("colour");
    expect(collect(20, () => a.number())).not.toEqual(collect(20, () => b.number()));
  });

  it("differs from the generator it came from", () => {
    const rng = new RNG(1234);
    const stream = rng.stream("colour");
    const plain = new RNG(1234);
    expect(collect(20, () => stream.number())).not.toEqual(collect(20, () => plain.number()));
  });

  it("does not depend on how far along the parent is", () => {
    const early = new RNG(1234);
    const late = new RNG(1234);
    collect(1000, () => late.number());
    expect(collect(20, () => early.stream("colour").number())).toEqual(
      collect(20, () => late.stream("colour").number()),
    );
  });

  it("does not advance the generator it came from", () => {
    const rng = new RNG(1234);
    const untouched = new RNG(1234);
    rng.stream("colour").number();
    expect(collect(10, () => rng.number())).toEqual(collect(10, () => untouched.number()));
  });

  it("follows a re-seed", () => {
    const rng = new RNG(1234);
    rng.seed("sunflower");
    expect(collect(10, () => rng.stream("colour").number())).toEqual(
      collect(10, () => new RNG("sunflower").stream("colour").number()),
    );
  });

  it("takes a number as an id, matching its decimal string", () => {
    const rng = new RNG(1234);
    expect(collect(10, () => rng.stream(5).number())[0]).toBe(
      collect(10, () => rng.stream("5").number())[0],
    );
    expect(collect(10, () => rng.stream(5).number())[0]).not.toBe(
      collect(10, () => rng.stream(6).number())[0],
    );
  });

  it("can be nested, each stream having streams of its own", () => {
    const nested = new RNG("sunflower").stream("petals").stream("colour");
    const same = new RNG("sunflower").stream("petals").stream("colour");
    expect(collect(10, () => nested.number())).toEqual(collect(10, () => same.number()));

    const shallow = new RNG("sunflower").stream("colour");
    const deep = new RNG("sunflower").stream("petals").stream("colour");
    expect(collect(10, () => shallow.number())).not.toEqual(collect(10, () => deep.number()));
  });
});

describe("fork", () => {
  it("is reproducible from the same parent seed", () => {
    const a = new RNG("sunflower").fork();
    const b = new RNG("sunflower").fork();
    expect(collect(20, () => a.number())).toEqual(collect(20, () => b.number()));
  });

  it("gives a different generator each time", () => {
    const rng = new RNG(1234);
    const first = rng.fork();
    const second = rng.fork();
    expect(collect(20, () => first.number())).not.toEqual(collect(20, () => second.number()));
  });

  it("differs from its parent", () => {
    const rng = new RNG(1234);
    const child = rng.fork();
    const plain = new RNG(1234);
    expect(collect(20, () => child.number())).not.toEqual(collect(20, () => plain.number()));
  });

  it("leaves the parent's sequence untouched however much the child draws", () => {
    const restrained = new RNG(1234);
    const greedy = new RNG(1234);

    const quiet = restrained.fork();
    const loud = greedy.fork();
    quiet.number();
    collect(1000, () => loud.number());

    expect(collect(10, () => restrained.number())).toEqual(collect(10, () => greedy.number()));
  });

  it("advances the parent by four draws", () => {
    const forked = new RNG(1234);
    const skipped = new RNG(1234);
    forked.fork();
    collect(4, () => skipped.next());
    expect(collect(10, () => forked.number())).toEqual(collect(10, () => skipped.number()));
  });

  it("produces well spread numbers", () => {
    const child = new RNG("sunflower").fork();
    const ns = collect(5000, () => child.number());
    const mean = ns.reduce((a, b) => a + b, 0) / ns.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });
});

describe("split", () => {
  it("gives n independent generators", () => {
    const rng = new RNG("sunflower");
    const [a, b, c] = rng.split(3);
    const as = collect(20, () => a.number());
    const bs = collect(20, () => b.number());
    const cs = collect(20, () => c.number());
    expect(as).not.toEqual(bs);
    expect(bs).not.toEqual(cs);
    expect(as).not.toEqual(cs);
  });

  it("matches forking n times", () => {
    const split = new RNG(1234).split(3);
    const rng = new RNG(1234);
    const forked = [rng.fork(), rng.fork(), rng.fork()];
    for (let i = 0; i < 3; i++) {
      expect(collect(10, () => split[i].number())).toEqual(collect(10, () => forked[i].number()));
    }
  });

  it("gives nothing for zero", () => {
    expect(new RNG(1234).split(0)).toEqual([]);
  });

  it("throws on a negative or fractional count", () => {
    expect(() => new RNG(1234).split(-1)).toThrow();
    expect(() => new RNG(1234).split(1.5)).toThrow();
  });
});
