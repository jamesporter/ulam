import { describe, expect, it, vi } from "vitest";
import { decodeWords, encodeWords } from "../codec.js";
import { randomSeedWords } from "../entropy.js";
import { RNG } from "../rng.js";

/** Collect n values from a generator function. */
function collect<T>(n: number, fn: () => T): T[] {
  const res: T[] = [];
  for (let i = 0; i < n; i++) res.push(fn());
  return res;
}

describe("encoding words", () => {
  it("round trips every kind of word", () => {
    const words = [0, 1, 0xffffffff, 0x80000000, 0x12345678, 0xdeadbeef];
    expect(decodeWords(encodeWords(words), words.length)).toEqual(words);
  });

  it("uses four characters for every three bytes", () => {
    expect(encodeWords([0, 0, 0, 0, 0, 0])).toHaveLength(32);
    expect(encodeWords([1, 2, 3])).toHaveLength(16);
  });

  it("stays URL safe", () => {
    for (let i = 0; i < 200; i++) {
      const rng = new RNG(i);
      const encoded = encodeWords(collect(6, () => rng.next()));
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(encodeURIComponent(encoded)).toBe(encoded);
    }
  });

  it("rejects a string of the wrong length", () => {
    expect(() => decodeWords("abc", 6)).toThrow();
    expect(() => decodeWords("", 6)).toThrow();
    expect(() => decodeWords(`${encodeWords([1, 2, 3, 4, 5, 6])}x`, 6)).toThrow();
  });

  it("rejects characters outside the alphabet", () => {
    const encoded = encodeWords([1, 2, 3, 4, 5, 6]);
    expect(() => decodeWords(`${encoded.slice(0, -1)}*`, 6)).toThrow();
    expect(() => decodeWords(`${encoded.slice(0, -1)}+`, 6)).toThrow();
  });
});

describe("toJSON and fromJSON", () => {
  it("gives a short URL safe string", () => {
    const encoded = new RNG("sunflower").toJSON();
    expect(encoded).toHaveLength(32);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it("carries on exactly where the original left off", () => {
    const rng = new RNG("sunflower");
    collect(37, () => rng.number());

    const restored = RNG.fromJSON(rng.toJSON());
    expect(collect(20, () => restored.number())).toEqual(collect(20, () => rng.number()));
  });

  it("round trips from a fresh generator too", () => {
    const rng = new RNG(1234);
    const restored = RNG.fromJSON(rng.toJSON());
    expect(collect(20, () => restored.number())).toEqual(collect(20, () => rng.number()));
  });

  it("brings the streams back with it", () => {
    const rng = new RNG("sunflower");
    collect(5, () => rng.number());
    const restored = RNG.fromJSON(rng.toJSON());

    expect(collect(10, () => restored.stream("colour").number())).toEqual(
      collect(10, () => rng.stream("colour").number()),
    );
  });

  it("keeps a custom stream's own increment", () => {
    const stream = new RNG("sunflower").stream("colour");
    collect(3, () => stream.number());
    const restored = RNG.fromJSON(stream.toJSON());
    expect(collect(10, () => restored.number())).toEqual(collect(10, () => stream.number()));
  });

  it("gives a different string at every position", () => {
    const rng = new RNG(1234);
    const seen = new Set(
      collect(100, () => {
        rng.number();
        return rng.toJSON();
      }),
    );
    expect(seen.size).toBe(100);
  });

  it("is picked up by JSON.stringify", () => {
    const rng = new RNG("sunflower");
    expect(JSON.stringify(rng)).toBe(`"${rng.toJSON()}"`);
    expect(JSON.stringify({ rng })).toBe(`{"rng":"${rng.toJSON()}"}`);
  });

  it("throws on anything that is not one of its own strings", () => {
    expect(() => RNG.fromJSON("")).toThrow();
    expect(() => RNG.fromJSON("nonsense")).toThrow();
    expect(() => RNG.fromJSON("!".repeat(32))).toThrow();
  });
});

describe("seeding without a seed", () => {
  it("uses both words, not just the low one", () => {
    // A generator seeded with only 32 bits would repeat its high word
    const highWords = new Set(collect(50, () => new RNG().getState()[0] >>> 0));
    expect(highWords.size).toBeGreaterThan(45);
  });

  it("gives a different sequence every time", () => {
    const firsts = new Set(collect(200, () => new RNG().number()));
    expect(firsts.size).toBe(200);
  });

  it("takes its words from the platform's cryptographic generator", () => {
    const getRandomValues = vi.fn((array: Uint32Array) => {
      array[0] = 0x12345678;
      array[1] = 0x9abcdef0;
      return array;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    try {
      expect(randomSeedWords()).toEqual([0x12345678, 0x9abcdef0]);
      expect(getRandomValues).toHaveBeenCalledTimes(1);

      const a = new RNG();
      const b = new RNG(0x12345678, 0x9abcdef0);
      expect(collect(10, () => a.number())).toEqual(collect(10, () => b.number()));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("falls back to Math.random where there is no such generator", () => {
    vi.stubGlobal("crypto", undefined);
    try {
      const words = randomSeedWords();
      expect(words).toHaveLength(2);
      for (const word of words) {
        expect(Number.isInteger(word)).toBe(true);
        expect(word).toBeGreaterThanOrEqual(0);
        expect(word).toBeLessThanOrEqual(0xffffffff);
      }
      expect(new RNG().number()).not.toBe(new RNG().number());
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
