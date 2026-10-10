import { describe, expect, it } from "vitest";
import { hashSeed } from "../hash.js";
import { RNG } from "../rng.js";

/**
 * An independent implementation of PCG32 (XSH RR 64/32), written against the
 * published algorithm with `BigInt` doing the 64 bit arithmetic that
 * {@link module:pcg} does by hand in 32 bit halves. Slow, but obviously
 * correct, which is the point: it is here to catch a mistake in the fast one.
 */
function reference(
  seedHi: number,
  seedLo: number,
  incHi = 0x14057b7e,
  incLo = 0xf767814f,
): () => number {
  const mask = (1n << 64n) - 1n;
  const multiplier = 6364136223846793005n;
  const increment = ((BigInt(incHi >>> 0) << 32n) | BigInt((incLo | 1) >>> 0)) & mask;
  let state = 0n;

  const next = (): number => {
    const old = state;
    state = (old * multiplier + increment) & mask;
    const xorshifted = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn);
    const rot = Number((old >> 59n) & 31n);
    return ((xorshifted >>> rot) | (xorshifted << ((32 - rot) & 31))) >>> 0;
  };

  // The same two step seeding the library does: churn once, add the seed,
  // churn again
  next();
  state = (state + (((BigInt(seedHi >>> 0) << 32n) | BigInt(seedLo >>> 0)) & mask)) & mask;
  next();
  return next;
}

/** Collect n values from a generator function. */
function collect<T>(n: number, fn: () => T): T[] {
  const res: T[] = [];
  for (let i = 0; i < n; i++) res.push(fn());
  return res;
}

describe("against a reference PCG32", () => {
  const cases: [string, [number, number], [number, number] | undefined][] = [
    ["zero", [0, 0], undefined],
    ["a small seed", [0, 42], undefined],
    ["a full 64 bit seed", [0x12345678, 0x9abcdef0], undefined],
    ["every bit set", [0xffffffff, 0xffffffff], undefined],
    ["a custom increment", [1234, 5678], [0xdeadbeef, 0xcafef00d]],
    ["an even increment, which must be forced odd", [1234, 5678], [0x1234, 0xabcde]],
  ];

  for (const [name, [seedHi, seedLo], increment] of cases) {
    it(`matches over 1000 draws with ${name}`, () => {
      const rng = increment
        ? new RNG(seedHi, seedLo, increment[0], increment[1])
        : new RNG(seedHi, seedLo);
      const ref = increment
        ? reference(seedHi, seedLo, increment[0], increment[1])
        : reference(seedHi, seedLo);
      expect(collect(1000, () => rng.next())).toEqual(collect(1000, () => ref()));
    });
  }

  it("matches for a string seed, through the hash", () => {
    const [hi, lo] = hashSeed("sunflower");
    expect(collect(500, () => new RNG("sunflower").next())[0]).toBe(reference(hi, lo)());
    const rng = new RNG("sunflower");
    const ref = reference(hi, lo);
    expect(collect(500, () => rng.next())).toEqual(collect(500, () => ref()));
  });

  it("matches after a re-seed in place", () => {
    const rng = new RNG(1);
    collect(17, () => rng.next());
    rng.seed(99);
    const ref = reference(0, 99);
    expect(collect(100, () => rng.next())).toEqual(collect(100, () => ref()));
  });
});

/**
 * Values recorded from this library, cross-checked against the reference
 * above. They pin the sequence: a refactor that changes any of them changes
 * every picture anyone has already drawn with this package, so it must be a
 * deliberate, breaking release rather than an accident.
 */
describe("golden vectors", () => {
  /** The first eight raw draws of a generator. */
  const firstEight = (rng: RNG) => collect(8, () => rng.next());

  it("pins the raw 32 bit output", () => {
    expect(firstEight(new RNG(42))).toEqual(NEXT42);
    expect(firstEight(new RNG(1234))).toEqual(NEXT1234);
    expect(firstEight(new RNG(0x12345678, 0x9abcdef0))).toEqual(NEXT64);
    expect(firstEight(new RNG("sunflower"))).toEqual(NEXT_STRING);
  });

  it("pins uniform numbers and integers", () => {
    const a = new RNG(42);
    expect(collect(5, () => a.number())).toEqual(NUMBER42);
    const b = new RNG(1234);
    expect(collect(12, () => b.integer(6))).toEqual(INTEGER);
    const c = new RNG(1234);
    expect(collect(6, () => c.uniformRandomInt({ from: 1, to: 10 }))).toEqual(UNIFORM_RANDOM_INT);
  });

  it("pins the distributions", () => {
    const a = new RNG(1234);
    expect(collect(4, () => a.gaussian())).toEqual(GAUSSIAN);
    const b = new RNG(1234);
    expect(collect(3, () => b.gamma({ shape: 2.5, scale: 2 }))).toEqual(GAMMA);
    const c = new RNG(1234);
    expect(collect(6, () => c.poisson(3))).toEqual(POISSON);
    const d = new RNG(1234);
    expect(collect(10, () => d.zipf({ n: 100 }))).toEqual(ZIPF);
    expect(new RNG(1234).dirichlet([1, 2, 3])).toEqual(DIRICHLET);
    const e = new RNG(1234);
    expect(collect(4, () => e.truncatedGaussian({ min: 0, max: 1, mean: 0.5, sd: 0.3 }))).toEqual(
      TRUNCATED,
    );
  });

  it("pins the collection helpers", () => {
    expect(new RNG(1234).shuffled([1, 2, 3, 4, 5, 6, 7, 8])).toEqual(SHUFFLED);
    const rng = new RNG(1234);
    expect(collect(6, () => rng.sample(["a", "b", "c", "d"]))).toEqual(SAMPLE);
  });

  it("pins the vectors", () => {
    const rng = new RNG(1234);
    expect(rng.onUnitCircle()).toEqual(ON_UNIT_CIRCLE);
    expect(rng.inUnitDisc()).toEqual(IN_UNIT_DISC);
    expect(rng.onUnitSphere()).toEqual(ON_UNIT_SPHERE);
  });

  it("pins Poisson disk points", () => {
    const points = new RNG(1234).poissonDiskPoints({ minDist: 0.1 });
    expect(points).toHaveLength(POISSON_DISK_COUNT);
    expect(points[0]).toEqual(POISSON_DISK_FIRST);
    expect(points[points.length - 1]).toEqual(POISSON_DISK_LAST);
  });

  it("pins the walk", () => {
    expect(new RNG(1234).walk({ steps: 3, stepSize: 0.1, momentum: 0.8 })).toEqual(WALK);
  });

  it("pins the noise fields", () => {
    const perlin = new RNG(1234).perlinNoise();
    expect([
      perlin.at(0.5),
      perlin.at(0.5, 1.5),
      perlin.at(0.5, 1.5, 2.5),
      perlin.fbm().at(0.25, 0.75),
    ]).toEqual(PERLIN);

    const value = new RNG(1234).valueNoise();
    expect([
      value.at(0.5),
      value.at(0.5, 1.5),
      value.at(0.5, 1.5, 2.5),
      value.fbm({ octaves: 3 }).at(0.25, 0.75),
    ]).toEqual(VALUE);
  });

  it("pins the string hash", () => {
    expect(hashSeed("sunflower")).toEqual(HASH_SUNFLOWER);
    expect(hashSeed("")).toEqual(HASH_EMPTY);
    expect(hashSeed("tree")).toEqual(HASH_TREE);
    expect(hashSeed("tres")).toEqual(HASH_TRES);
  });

  it("pins the serialised form", () => {
    expect(new RNG("sunflower").toJSON()).toBe(JSON_FRESH);

    const rng = new RNG("sunflower");
    collect(10, () => rng.number());
    expect(rng.toJSON()).toBe(JSON_ADVANCED);

    // And the string still stands for that exact position in the stream
    const restored = RNG.fromJSON(JSON_ADVANCED);
    expect(collect(4, () => restored.number())).toEqual(collect(4, () => rng.number()));
  });

  it("pins the streams", () => {
    const stream = new RNG("sunflower").stream("colour");
    expect(collect(4, () => stream.number())).toEqual(STREAM);
    const forked = new RNG("sunflower").fork();
    expect(collect(4, () => forked.number())).toEqual(FORK);
  });

  it("pins the 0.5.0 additions", () => {
    expect(new RNG(1234).skip(1_000_000_007).next()).toBe(SKIP);
    const rng = new RNG(1234);
    expect(collect(4, () => rng.vonMises({ mean: 1, kappa: 3 }))).toEqual(VON_MISES);
    expect(new RNG(1234).quasiRandomPoints({ n: 3 })).toEqual(QUASI_R2);
    expect(new RNG(1234).quasiRandomPoints({ n: 3, sequence: "halton" })).toEqual(QUASI_HALTON);
    expect(new RNG(1234).jitteredGridPoints({ columns: 2, rows: 1 })).toEqual(JITTERED);
    expect(new RNG(1234).inTriangle([0, 0], [1, 0], [0, 1])).toEqual(TRIANGLE);
    expect(
      new RNG(1234).inPolygon([
        [0, 0],
        [1, 0],
        [1, 0.5],
        [0.5, 0.5],
        [0.5, 1],
        [0, 1],
      ]),
    ).toEqual(POLYGON);
    expect(new RNG(1234).inAnnulus({ inner: 0.5 })).toEqual(ANNULUS);
    const simplex = new RNG(1234).simplexNoise();
    expect([simplex.at(0.3), simplex.at(0.3, 1.7), simplex.at(0.3, 1.7, 2.9)]).toEqual(SIMPLEX);
    const draw = new RNG(1234).weightedSampler([
      [5, "a"],
      [3, "b"],
      [2, "c"],
    ]);
    expect(collect(8, draw)).toEqual(WEIGHTED_SAMPLER);
    expect(new RNG(1234).reservoirSample(3, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual(RESERVOIR);

    const varying = new RNG(1234).poissonDiskPoints({
      minDist: ([x]) => 0.05 + 0.1 * x,
      maxDist: 0.15,
    });
    expect([varying.length, varying[varying.length - 1]]).toEqual(POISSON_VARYING);
    const shaped = new RNG(1234).poissonDiskPoints({
      minDist: 0.1,
      contains: ([x, y]) => (x - 0.5) ** 2 + (y - 0.5) ** 2 < 0.16,
    });
    expect([shaped.length, shaped[shaped.length - 1]]).toEqual(POISSON_SHAPED);
  });
});

// The recorded values themselves, kept at the end so the tests read first.
const NEXT42 = [
  3270867926, 1795671209, 1924641435, 1143034755, 4121910957, 1757328946, 3418829100, 3589261271,
];
const NEXT1234 = [
  2653504168, 209608674, 1195720523, 3249742110, 76957682, 3144134622, 2510553852, 2126586030,
];
const NEXT64 = [
  1129897928, 689246165, 17769723, 3219780061, 2503233616, 1385957503, 1440891452, 2028510725,
];
const NEXT_STRING = [
  1291544606, 2659478249, 1106615781, 3791815035, 1640995854, 856308814, 465246171, 790653809,
];
const NUMBER42 = [
  0.7397302147566239, 0.679392270986327, 0.42125959833146553, 0.9445235243749676,
  0.7304993999658423,
];
const INTEGER = [4, 0, 5, 0, 2, 0, 0, 0, 5, 1, 0, 2];
const UNIFORM_RANDOM_INT = [6, 9, 2, 5, 5, 6];
const GAUSSIAN = [
  0.5139338984218526, -0.4760169722045104, -1.0949683681707287, -0.3428076754585085,
];
const GAMMA = [6.029230252871225, 2.035734008090541, 3.400452279698196];
const POISSON = [3, 2, 3, 3, 5, 4];
const ZIPF = [6, 1, 47, 12, 10, 7, 74, 6, 41, 1];
const DIRICHLET = [0.2937985652736812, 0.17232748591609076, 0.533873948810228];
const TRUNCATED = [0.5274422455727571, 0.7390907273305845, 0.2259865825552439, 0.43847529012012754];
const SHUFFLED = [8, 7, 4, 2, 3, 1, 6, 5];
const SAMPLE = ["c", "d", "a", "b", "b", "c"];
const ON_UNIT_CIRCLE = [-0.9681231467683453, -0.2504746947125734];
const IN_UNIT_DISC = [0.546276931949901, 0.7205593471742698];
const ON_UNIT_SPHERE = [-0.9411525592584742, 0.28627338973117766, -0.17966470586357675];
const POISSON_DISK_COUNT = 70;
const POISSON_DISK_FIRST = [0.5402933442846882, 0.8176242591808067];
const POISSON_DISK_LAST = [0.028684083798001914, 0.6012096440141628];
const WALK = [
  [0, 0],
  [-0.09681231467683454, -0.02504746947125734],
  [-0.18432867451878276, -0.07343018084644415],
  [-0.27739823145918935, -0.11000965010060931],
];
const PERLIN = [0, -0.22236704553141645, 0.12079126825366118, -0.13609584290640508];
const VALUE = [
  -0.015642760058224625, -0.4341479355233635, -0.33028974604696354, -0.16143895806446534,
];
const HASH_SUNFLOWER = [98175459, 3357136283];
const HASH_EMPTY = [279781504, 3047680502];
const HASH_TREE = [255579455, 1157004191];
const HASH_TRES = [3521686368, 1223098730];
const JSON_FRESH = "BdoJ48gZ1ZtXbRYS2XPecRQFe373Z4FP";
const JSON_ADVANCED = "BdoJ48gZ1ZtOPTsYtlKKxRQFe373Z4FP";
const STREAM = [0.21704127257012495, 0.9720315390785176, 0.42661575236012916, 0.024517535382690858];
const FORK = [0.878260038485517, 0.04846660843087536, 0.7077035755841997, 0.05290566401459673];
const SKIP = 137420005;
const VON_MISES = [1.6313885234270729, 0.5743103345969481, 1.053378064651965, 1.208152529719033];
const QUASI_R2 = [
  [0.29517101053138095, 0.38746455017885983],
  [0.0500486767780739, 0.9573048411769132],
  [0.804926343024766, 0.5271451321749661],
];
const QUASI_HALTON = [
  [0.040293344284688226, 0.15095759251413998],
  [0.7902933442846882, 0.48429092584747346],
  [0.2902933442846882, 0.9287353702919179],
];
const JITTERED = [
  [0.2701466721423441, 0.8176242591808067],
  [0.5733794154646129, 0.4101676470682116],
];
const TRIANGLE = [0.4597066557153118, 0.18237574081919328];
const POLYGON = [0.14675883092922581, 0.4101676470682116];
const ANNULUS = [0.333678904086038, -0.7374811164914373];
const SIMPLEX = [0.29990132865, -0.07399219660081796, -0.25093663973662683];
const WEIGHTED_SAMPLER = ["b", "c", "a", "b", "b", "b", "a", "b"];
const RESERVOIR = [10, 2, 7];
const POISSON_VARYING = [92, [0.01743878108362449, 0.21435821015004158]];
const POISSON_SHAPED = [34, [0.3035172467074013, 0.162191873502898]];
