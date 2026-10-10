import type { RNG } from 'ulam-prng'
import {
  betaPdf,
  gammaPdf,
  logChoose,
  logFactorial,
  logGamma,
  normalCdf,
  normalPdf,
  studentTPdf,
  vonMisesPdf,
} from '@/lib/stats'

export type Values = Record<string, number>

/** A slider on a distribution's page, and the option it sets. */
export type Control = {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
}

/** One documented option of a distribution's method. */
export type Option = {
  name: string
  type: string
  default?: string
  description: string
}

type Common = {
  id: string
  /** The method name, which is also the standalone function's name */
  method: string
  title: string
  /** A line for the index card */
  tagline: string
  tags: string[]
  signature: string
  standalone: string
  description: string[]
  options: Option[]
  returns: string
  throws?: string[]
  algorithm?: string
  controls: Control[]
  /** Fixes up slider values that would otherwise be invalid together */
  constrain?: (v: Values) => Values
  /** The method call for these values, as it would be written */
  call: (v: Values) => string
  mean?: (v: Values) => number
  variance?: (v: Values) => number
}

export type ContinuousDistribution = Common & {
  kind: 'continuous'
  sample: (rng: RNG, v: Values) => number
  pdf: (x: number, v: Values) => number
  view: (v: Values) => [number, number]
}

export type DiscreteDistribution = Common & {
  kind: 'discrete'
  sample: (rng: RNG, v: Values) => number
  pmf: (k: number, v: Values) => number
  support: (v: Values) => [number, number]
  label?: (k: number, v: Values) => string
}

export type SimplexDistribution = Common & {
  kind: 'simplex'
  sample: (rng: RNG, v: Values) => number[]
}

export type Distribution = ContinuousDistribution | DiscreteDistribution | SimplexDistribution

/** A number as it would be typed in source. */
export const lit = (x: number) => String(Number(x.toFixed(4)))

/** `{ a: 1, b: 2 }`, leaving out anything at its default. */
function config(v: Values, keys: string[], defaults: Values = {}): string {
  const parts = keys.filter((k) => defaults[k] === undefined || v[k] !== defaults[k]).map((k) => `${k}: ${lit(v[k])}`)
  return parts.length ? `{ ${parts.join(', ')} }` : ''
}

const gammaFn = (x: number) => Math.exp(logGamma(x))

export const continuous: ContinuousDistribution[] = [
  {
    kind: 'continuous',
    id: 'gaussian',
    method: 'gaussian',
    title: 'Gaussian',
    tagline: 'The bell curve: most values near the mean, fewer further out.',
    tags: ['bell', 'unbounded'],
    signature: 'gaussian(config?: { mean?: number; sd?: number }): number',
    standalone: 'gaussian(rng: RandomSource, config?: { mean?: number; sd?: number }): number',
    description: [
      'The normal distribution. About two thirds of draws land within one standard deviation of the mean, and 95% within two — the shape that sums of many small effects settle into.',
      'Reach for it whenever something should be *about* a value: a jittered size, a position scattered around a centre, a hue that wobbles.',
    ],
    options: [
      { name: 'mean', type: 'number', default: '0', description: 'The centre of the bell' },
      { name: 'sd', type: 'number', default: '1', description: 'Standard deviation: how wide the bell is' },
    ],
    returns: 'A real number; any value is possible, but extreme ones are vanishingly rare.',
    algorithm: 'Box–Muller, using two uniform draws per number.',
    controls: [
      { key: 'mean', label: 'mean', min: -5, max: 5, step: 0.1, default: 0 },
      { key: 'sd', label: 'sd', min: 0.1, max: 4, step: 0.05, default: 1 },
    ],
    call: (v) => `gaussian(${config(v, ['mean', 'sd'], { mean: 0, sd: 1 })})`,
    sample: (rng, v) => rng.gaussian({ mean: v.mean, sd: v.sd }),
    pdf: (x, v) => normalPdf(x, v.mean, v.sd),
    view: (v) => [v.mean - 4 * v.sd, v.mean + 4 * v.sd],
    mean: (v) => v.mean,
    variance: (v) => v.sd ** 2,
  },
  {
    kind: 'continuous',
    id: 'log-normal',
    method: 'logNormal',
    title: 'Log-normal',
    tagline: 'Always positive, skewed right: mostly small, sometimes large.',
    tags: ['positive', 'skewed'],
    signature: 'logNormal(config?: { mu?: number; sigma?: number }): number',
    standalone: 'logNormal(rng: RandomSource, config?: { mu?: number; sigma?: number }): number',
    description: [
      '`exp` of a gaussian, so always positive, and skewed to the right. Note that `mu` and `sigma` describe the underlying gaussian — the *logarithm* of the values — not the values themselves. The median is `exp(mu)`.',
      'Good for sizes and scales: a field of circles that are mostly modest, with the occasional big one.',
    ],
    options: [
      { name: 'mu', type: 'number', default: '0', description: 'Mean of the underlying gaussian' },
      { name: 'sigma', type: 'number', default: '1', description: 'Standard deviation of the underlying gaussian' },
    ],
    returns: 'A positive number.',
    controls: [
      { key: 'mu', label: 'mu', min: -1, max: 2, step: 0.05, default: 0 },
      { key: 'sigma', label: 'sigma', min: 0.05, max: 1.5, step: 0.05, default: 0.5 },
    ],
    call: (v) => `logNormal(${config(v, ['mu', 'sigma'], { mu: 0, sigma: 1 })})`,
    sample: (rng, v) => rng.logNormal({ mu: v.mu, sigma: v.sigma }),
    pdf: (x, v) => (x <= 0 ? 0 : normalPdf(Math.log(x), v.mu, v.sigma) / x),
    view: (v) => [0, Math.exp(v.mu + 2.6 * v.sigma)],
    mean: (v) => Math.exp(v.mu + v.sigma ** 2 / 2),
    variance: (v) => (Math.exp(v.sigma ** 2) - 1) * Math.exp(2 * v.mu + v.sigma ** 2),
  },
  {
    kind: 'continuous',
    id: 'exponential',
    method: 'exponential',
    title: 'Exponential',
    tagline: 'Waiting times between events that arrive at random.',
    tags: ['positive', 'skewed'],
    signature: 'exponential(config?: { rate?: number }): number',
    standalone: 'exponential(rng: RandomSource, config?: { rate?: number }): number',
    description: [
      'The waiting time until the next event, when events arrive independently at `rate` per unit — so the mean wait is `1 / rate`. Short gaps are the most common, long ones rarer and rarer.',
      'Use it to space things out irregularly: gaps between stripes, intervals between strokes, distances along a path.',
    ],
    options: [{ name: 'rate', type: 'number', default: '1', description: 'Events per unit; the mean is `1 / rate`' }],
    returns: 'A non-negative number.',
    throws: ['if `rate` is not positive'],
    algorithm: 'Inversion: `-log(1 - u) / rate`.',
    controls: [{ key: 'rate', label: 'rate', min: 0.1, max: 5, step: 0.05, default: 1 }],
    call: (v) => `exponential(${config(v, ['rate'], { rate: 1 })})`,
    sample: (rng, v) => rng.exponential({ rate: v.rate }),
    pdf: (x, v) => (x < 0 ? 0 : v.rate * Math.exp(-v.rate * x)),
    view: (v) => [0, 6 / v.rate],
    mean: (v) => 1 / v.rate,
    variance: (v) => 1 / v.rate ** 2,
  },
  {
    kind: 'continuous',
    id: 'laplace',
    method: 'laplace',
    title: 'Laplace',
    tagline: 'A sharp peak with fatter tails than a gaussian.',
    tags: ['bell', 'unbounded'],
    signature: 'laplace(config?: { mean?: number; scale?: number }): number',
    standalone: 'laplace(rng: RandomSource, config?: { mean?: number; scale?: number }): number',
    description: [
      'The double exponential: an exponential reflected about the mean. It has a pointed peak — more values *very* near the centre than a gaussian — and also more far out.',
      'Good for jitter that is mostly tiny but occasionally pronounced.',
    ],
    options: [
      { name: 'mean', type: 'number', default: '0', description: 'The location of the peak' },
      { name: 'scale', type: 'number', default: '1', description: 'How spread out it is; the variance is `2 * scale²`' },
    ],
    returns: 'A real number.',
    throws: ['if `scale` is not positive'],
    controls: [
      { key: 'mean', label: 'mean', min: -5, max: 5, step: 0.1, default: 0 },
      { key: 'scale', label: 'scale', min: 0.1, max: 3, step: 0.05, default: 1 },
    ],
    call: (v) => `laplace(${config(v, ['mean', 'scale'], { mean: 0, scale: 1 })})`,
    sample: (rng, v) => rng.laplace({ mean: v.mean, scale: v.scale }),
    pdf: (x, v) => Math.exp(-Math.abs(x - v.mean) / v.scale) / (2 * v.scale),
    view: (v) => [v.mean - 6 * v.scale, v.mean + 6 * v.scale],
    mean: (v) => v.mean,
    variance: (v) => 2 * v.scale ** 2,
  },
  {
    kind: 'continuous',
    id: 'cauchy',
    method: 'cauchy',
    title: 'Cauchy',
    tagline: 'Bell shaped, but so heavy tailed it has no mean at all.',
    tags: ['bell', 'heavy tailed'],
    signature: 'cauchy(config?: { median?: number; scale?: number }): number',
    standalone: 'cauchy(rng: RandomSource, config?: { median?: number; scale?: number }): number',
    description: [
      'Looks like a bell from a distance, but its tails fall away so slowly that it has no mean and no variance: average as many draws as you like and the result never settles. Watch the sample mean below jump about as you change the seed.',
      'Wild outliers are the point — use it when you want most things in place and a few flung far away.',
    ],
    options: [
      { name: 'median', type: 'number', default: '0', description: 'The centre' },
      { name: 'scale', type: 'number', default: '1', description: 'Half the width of the bell at half its height' },
    ],
    returns: 'A real number, sometimes an enormous one.',
    throws: ['if `scale` is not positive'],
    controls: [
      { key: 'median', label: 'median', min: -5, max: 5, step: 0.1, default: 0 },
      { key: 'scale', label: 'scale', min: 0.1, max: 3, step: 0.05, default: 1 },
    ],
    call: (v) => `cauchy(${config(v, ['median', 'scale'], { median: 0, scale: 1 })})`,
    sample: (rng, v) => rng.cauchy({ median: v.median, scale: v.scale }),
    pdf: (x, v) => 1 / (Math.PI * v.scale * (1 + ((x - v.median) / v.scale) ** 2)),
    view: (v) => [v.median - 10 * v.scale, v.median + 10 * v.scale],
    mean: () => Number.NaN,
    variance: () => Number.NaN,
  },
  {
    kind: 'continuous',
    id: 'pareto',
    method: 'pareto',
    title: 'Pareto',
    tagline: 'A power law: at least `scale`, occasionally enormous.',
    tags: ['positive', 'heavy tailed'],
    signature: 'pareto(config: { shape: number; scale?: number }): number',
    standalone: 'pareto(rng: RandomSource, config: { shape: number; scale?: number }): number',
    description: [
      'The 80/20 distribution. Never below `scale`, and heavy tailed above it: a smaller `shape` makes huge values more likely. At a `shape` of 1 or below there is no finite mean.',
      'Use it for things where a few are dominant: the sizes of islands, the lengths of branches.',
    ],
    options: [
      { name: 'shape', type: 'number', description: 'The tail index; smaller is heavier' },
      { name: 'scale', type: 'number', default: '1', description: 'The minimum possible value' },
    ],
    returns: 'A number of at least `scale`.',
    throws: ['if `shape` or `scale` is not positive'],
    algorithm: 'Inversion: `scale / (1 - u) ** (1 / shape)`.',
    controls: [
      { key: 'shape', label: 'shape', min: 0.3, max: 6, step: 0.05, default: 1.5 },
      { key: 'scale', label: 'scale', min: 0.2, max: 4, step: 0.05, default: 1 },
    ],
    call: (v) => `pareto(${config(v, ['shape', 'scale'], { scale: 1 })})`,
    sample: (rng, v) => rng.pareto({ shape: v.shape, scale: v.scale }),
    pdf: (x, v) => (x < v.scale ? 0 : (v.shape * v.scale ** v.shape) / x ** (v.shape + 1)),
    view: (v) => [0, Math.min(v.scale * 0.04 ** (-1 / v.shape), v.scale * 12)],
    mean: (v) => (v.shape <= 1 ? Infinity : (v.shape * v.scale) / (v.shape - 1)),
    variance: (v) => (v.shape <= 2 ? Infinity : (v.scale ** 2 * v.shape) / ((v.shape - 1) ** 2 * (v.shape - 2))),
  },
  {
    kind: 'continuous',
    id: 'weibull',
    method: 'weibull',
    title: 'Weibull',
    tagline: 'Crowds near zero, or an exponential, or a hump — by `shape`.',
    tags: ['positive', 'flexible'],
    signature: 'weibull(config: { shape: number; scale?: number }): number',
    standalone: 'weibull(rng: RandomSource, config: { shape: number; scale?: number }): number',
    description: [
      'A shape-shifter. With `shape` below 1 values crowd near zero; at exactly 1 it is the exponential; above 1 it becomes a hump around `scale`, getting narrower and more symmetrical as `shape` grows.',
      'Originally a model of how long things last before they break — useful wherever lengths or lifetimes need a tunable feel.',
    ],
    options: [
      { name: 'shape', type: 'number', description: 'Below 1 crowds near zero; above 1 a hump' },
      { name: 'scale', type: 'number', default: '1', description: 'Stretches the whole distribution' },
    ],
    returns: 'A non-negative number.',
    throws: ['if `shape` or `scale` is not positive'],
    controls: [
      { key: 'shape', label: 'shape', min: 0.5, max: 8, step: 0.05, default: 2 },
      { key: 'scale', label: 'scale', min: 0.2, max: 4, step: 0.05, default: 1 },
    ],
    call: (v) => `weibull(${config(v, ['shape', 'scale'], { scale: 1 })})`,
    sample: (rng, v) => rng.weibull({ shape: v.shape, scale: v.scale }),
    pdf: (x, v) =>
      x < 0 ? 0 : (v.shape / v.scale) * (x / v.scale) ** (v.shape - 1) * Math.exp(-((x / v.scale) ** v.shape)),
    view: (v) => [0, v.scale * (-Math.log(0.002)) ** (1 / v.shape)],
    mean: (v) => v.scale * gammaFn(1 + 1 / v.shape),
    variance: (v) => v.scale ** 2 * (gammaFn(1 + 2 / v.shape) - gammaFn(1 + 1 / v.shape) ** 2),
  },
  {
    kind: 'continuous',
    id: 'triangular',
    method: 'triangular',
    title: 'Triangular',
    tagline: 'Bounded, peaking at `mode`: “around here, but not exactly”.',
    tags: ['bounded'],
    signature: 'triangular(config?: { min?: number; max?: number; mode?: number }): number',
    standalone: 'triangular(rng: RandomSource, config?: { min?: number; max?: number; mode?: number }): number',
    description: [
      'Never outside `[min, max]`, and most likely at `mode`, falling away in straight lines either side. A cheap and very readable way to say “roughly here”, with hard limits.',
    ],
    options: [
      { name: 'min', type: 'number', default: '0', description: 'The lowest possible value' },
      { name: 'max', type: 'number', default: '1', description: 'The highest possible value' },
      { name: 'mode', type: 'number', default: '(min + max) / 2', description: 'The most likely value' },
    ],
    returns: 'A number in `[min, max]`.',
    throws: ['if `max` is not above `min`', 'if `mode` falls outside the bounds'],
    controls: [
      { key: 'min', label: 'min', min: -2, max: 1.9, step: 0.05, default: 0 },
      { key: 'max', label: 'max', min: -1.9, max: 3, step: 0.05, default: 1 },
      { key: 'mode', label: 'mode', min: -2, max: 3, step: 0.05, default: 0.7 },
    ],
    constrain: (v) => {
      const min = Math.min(v.min, v.max - 0.1)
      const max = Math.max(v.max, min + 0.1)
      return { min, max, mode: Math.min(max, Math.max(min, v.mode)) }
    },
    call: (v) => `triangular(${config(v, ['min', 'max', 'mode'])})`,
    sample: (rng, v) => rng.triangular({ min: v.min, max: v.max, mode: v.mode }),
    pdf: (x, v) => {
      const { min: a, max: b, mode: c } = v
      if (x < a || x > b) return 0
      if (x < c) return (2 * (x - a)) / ((b - a) * (c - a))
      if (x === c) return 2 / (b - a)
      return (2 * (b - x)) / ((b - a) * (b - c))
    },
    view: (v) => [v.min - (v.max - v.min) * 0.05, v.max + (v.max - v.min) * 0.05],
    mean: (v) => (v.min + v.max + v.mode) / 3,
    variance: (v) => {
      const { min: a, max: b, mode: c } = v
      return (a * a + b * b + c * c - a * b - a * c - b * c) / 18
    },
  },
  {
    kind: 'continuous',
    id: 'gamma',
    method: 'gamma',
    title: 'Gamma',
    tagline: 'Positive and flexible, with mean `shape × scale`.',
    tags: ['positive', 'flexible'],
    signature: 'gamma(config: { shape: number; scale?: number }): number',
    standalone: 'gamma(rng: RandomSource, config: { shape: number; scale?: number }): number',
    description: [
      'The waiting time for `shape` events in a row of an exponential process, generalised to any positive `shape`. Small shapes are sharply skewed; large ones approach a gaussian.',
      'It is also the building block from which the library makes `beta`, `chiSquared`, `studentT` and `dirichlet`.',
    ],
    options: [
      { name: 'shape', type: 'number', description: 'k: how skewed it is; larger is more symmetrical' },
      { name: 'scale', type: 'number', default: '1', description: 'θ: stretches the whole distribution' },
    ],
    returns: 'A positive number, with mean `shape * scale`.',
    throws: ['if `shape` or `scale` is not positive'],
    algorithm: 'Marsaglia and Tsang’s method, with Johnk’s boost for shapes below one.',
    controls: [
      { key: 'shape', label: 'shape', min: 0.3, max: 12, step: 0.1, default: 2 },
      { key: 'scale', label: 'scale', min: 0.1, max: 3, step: 0.05, default: 1 },
    ],
    call: (v) => `gamma(${config(v, ['shape', 'scale'], { scale: 1 })})`,
    sample: (rng, v) => rng.gamma({ shape: v.shape, scale: v.scale }),
    pdf: (x, v) => gammaPdf(x, v.shape, v.scale),
    view: (v) => [0, v.shape * v.scale + 5 * Math.sqrt(v.shape) * v.scale],
    mean: (v) => v.shape * v.scale,
    variance: (v) => v.shape * v.scale ** 2,
  },
  {
    kind: 'continuous',
    id: 'beta',
    method: 'beta',
    title: 'Beta',
    tagline: 'A proportion between 0 and 1: hump, U, slope or flat.',
    tags: ['bounded', 'flexible'],
    signature: 'beta(config: { alpha: number; beta: number }): number',
    standalone: 'beta(rng: RandomSource, config: { alpha: number; beta: number }): number',
    description: [
      'A number in `[0, 1]` with mean `alpha / (alpha + beta)`. Both parameters above 1 gives a hump; both below gives a U that piles up at the ends; both exactly 1 is uniform.',
      'Handy for proportions: how much of a shape to fill, how far along an edge to put something, how to mix two colours.',
    ],
    options: [
      { name: 'alpha', type: 'number', description: 'Pulls values towards 1' },
      { name: 'beta', type: 'number', description: 'Pulls values towards 0' },
    ],
    returns: 'A number in `[0, 1]`.',
    throws: ['if either parameter is not positive'],
    algorithm: 'As the ratio `X / (X + Y)` of two gamma draws.',
    controls: [
      { key: 'alpha', label: 'alpha', min: 0.2, max: 10, step: 0.1, default: 2 },
      { key: 'beta', label: 'beta', min: 0.2, max: 10, step: 0.1, default: 5 },
    ],
    call: (v) => `beta({ alpha: ${lit(v.alpha)}, beta: ${lit(v.beta)} })`,
    sample: (rng, v) => rng.beta({ alpha: v.alpha, beta: v.beta }),
    pdf: (x, v) => betaPdf(x, v.alpha, v.beta),
    view: () => [0, 1],
    mean: (v) => v.alpha / (v.alpha + v.beta),
    variance: (v) => (v.alpha * v.beta) / ((v.alpha + v.beta) ** 2 * (v.alpha + v.beta + 1)),
  },
  {
    kind: 'continuous',
    id: 'chi-squared',
    method: 'chiSquared',
    title: 'Chi-squared',
    tagline: 'The sum of `df` squared standard normals.',
    tags: ['positive', 'skewed'],
    signature: 'chiSquared(df: number): number',
    standalone: 'chiSquared(rng: RandomSource, df: number): number',
    description: [
      'The sum of the squares of `df` independent standard normals, so with mean `df`. A gamma in disguise: shape `df / 2`, scale 2.',
    ],
    options: [{ name: 'df', type: 'number', description: 'Degrees of freedom; need not be a whole number' }],
    returns: 'A positive number, with mean `df`.',
    throws: ['if `df` is not positive'],
    controls: [{ key: 'df', label: 'df', min: 0.5, max: 20, step: 0.5, default: 3 }],
    call: (v) => `chiSquared(${lit(v.df)})`,
    sample: (rng, v) => rng.chiSquared(v.df),
    pdf: (x, v) => gammaPdf(x, v.df / 2, 2),
    view: (v) => [0, v.df + 5 * Math.sqrt(2 * v.df) + 1],
    mean: (v) => v.df,
    variance: (v) => 2 * v.df,
  },
  {
    kind: 'continuous',
    id: 'student-t',
    method: 'studentT',
    title: 'Student’s t',
    tagline: 'A gaussian with heavier tails, tuned by `df`.',
    tags: ['bell', 'heavy tailed'],
    signature: 'studentT(df: number): number',
    standalone: 'studentT(rng: RandomSource, df: number): number',
    description: [
      'A bell centred on zero, with tails that get lighter as the degrees of freedom grow: at `df` 1 it is the Cauchy, and by 30 or so it is hard to tell from a standard gaussian (shown dashed for comparison).',
      'A dial between “well behaved” and “prone to outliers”.',
    ],
    options: [{ name: 'df', type: 'number', description: 'Degrees of freedom; smaller means heavier tails' }],
    returns: 'A real number.',
    throws: ['if `df` is not positive'],
    controls: [{ key: 'df', label: 'df', min: 0.5, max: 30, step: 0.5, default: 3 }],
    call: (v) => `studentT(${lit(v.df)})`,
    sample: (rng, v) => rng.studentT(v.df),
    pdf: (x, v) => studentTPdf(x, v.df),
    view: () => [-6, 6],
    mean: (v) => (v.df > 1 ? 0 : Number.NaN),
    variance: (v) => (v.df > 2 ? v.df / (v.df - 2) : v.df > 1 ? Infinity : Number.NaN),
  },
  {
    kind: 'continuous',
    id: 'truncated-gaussian',
    method: 'truncatedGaussian',
    title: 'Truncated gaussian',
    tagline: 'A bell confined to bounds — sampled properly, not clamped.',
    tags: ['bell', 'bounded'],
    signature: 'truncatedGaussian(config?: { mean?: number; sd?: number; min?: number; max?: number }): number',
    standalone:
      'truncatedGaussian(rng: RandomSource, config?: { mean?: number; sd?: number; min?: number; max?: number }): number',
    description: [
      'A normal draw confined to `[min, max]`, drawn from the part of the bell inside those bounds. Clamping a gaussian instead would pile values up on the ends; this keeps the shape intact however narrow the window.',
      'It costs exactly one uniform draw, so it still works far out in the tail, where rejecting until something lands would never finish. Bounds are optional either side, so `{ min: 0 }` is a positive-only normal.',
    ],
    options: [
      { name: 'mean', type: 'number', default: '0', description: 'Centre of the untruncated bell' },
      { name: 'sd', type: 'number', default: '1', description: 'Standard deviation of the untruncated bell' },
      { name: 'min', type: 'number', default: '-Infinity', description: 'Lower bound' },
      { name: 'max', type: 'number', default: 'Infinity', description: 'Upper bound' },
    ],
    returns: 'A number in `[min, max]`.',
    throws: [
      'if `sd` is not positive',
      'if `min` is not below `max`',
      'if the bounds are so far into the tail that no draw could land in them',
    ],
    algorithm: 'Inversion of the normal CDF, with Acklam’s quantile refined by a Halley step.',
    controls: [
      { key: 'mean', label: 'mean', min: -2, max: 2, step: 0.05, default: 0.5 },
      { key: 'sd', label: 'sd', min: 0.05, max: 2, step: 0.05, default: 0.5 },
      { key: 'min', label: 'min', min: -3, max: 2.9, step: 0.05, default: 0 },
      { key: 'max', label: 'max', min: -2.9, max: 3, step: 0.05, default: 1 },
    ],
    constrain: (v) => ({ ...v, max: Math.max(v.max, v.min + 0.05) }),
    call: (v) => `truncatedGaussian(${config(v, ['mean', 'sd', 'min', 'max'])})`,
    sample: (rng, v) => rng.truncatedGaussian({ mean: v.mean, sd: v.sd, min: v.min, max: v.max }),
    pdf: (x, v) => {
      if (x < v.min || x > v.max) return 0
      const z = normalCdf(v.max, v.mean, v.sd) - normalCdf(v.min, v.mean, v.sd)
      return normalPdf(x, v.mean, v.sd) / z
    },
    view: (v) => {
      const pad = (v.max - v.min) * 0.08
      return [Math.max(v.min, v.mean - 4 * v.sd) - pad, Math.min(v.max, v.mean + 4 * v.sd) + pad]
    },
    mean: (v) => {
      const a = (v.min - v.mean) / v.sd
      const b = (v.max - v.mean) / v.sd
      const z = normalCdf(b) - normalCdf(a)
      return v.mean + (v.sd * (normalPdf(a) - normalPdf(b))) / z
    },
    variance: (v) => {
      const a = (v.min - v.mean) / v.sd
      const b = (v.max - v.mean) / v.sd
      const z = normalCdf(b) - normalCdf(a)
      const d = (normalPdf(a) - normalPdf(b)) / z
      return v.sd ** 2 * (1 + (a * normalPdf(a) - b * normalPdf(b)) / z - d * d)
    },
  },  {
    kind: 'continuous',
    id: 'von-mises',
    method: 'vonMises',
    title: 'Von Mises',
    tagline: 'A bell curve wrapped round a circle: angles that cluster about a heading.',
    tags: ['circular', 'angles'],
    signature: 'vonMises(config?: { mean?: number; kappa?: number }): number',
    standalone: 'vonMises(rng: RandomSource, config?: { mean?: number; kappa?: number }): number',
    description: [
      'The circular counterpart of a gaussian: an angle that clusters about `mean`, as tightly as the concentration `kappa` says. At 0 every direction is equally likely; as it grows the angles bunch ever tighter, until it behaves like a gaussian with standard deviation `1 / sqrt(kappa)`.',
      'Reach for it for headings, orientations and hue offsets — anything that wraps round. A gaussian taken as an angle has no idea that −π and π are the same place; this does.',
    ],
    options: [
      { name: 'mean', type: 'number', default: '0', description: 'The heading the angles cluster about, in radians' },
      { name: 'kappa', type: 'number', default: '1', description: 'Concentration: 0 is uniform, larger is tighter' },
    ],
    returns: 'An angle in radians, within π either side of `mean`.',
    throws: ['if `kappa` is negative'],
    algorithm: 'Best and Fisher’s rejection method, in the form Python’s standard library uses.',
    controls: [
      { key: 'mean', label: 'mean', min: -3, max: 3, step: 0.05, default: 0 },
      { key: 'kappa', label: 'kappa', min: 0, max: 20, step: 0.1, default: 2 },
    ],
    call: (v) => `vonMises(${config(v, ['mean', 'kappa'], { mean: 0, kappa: 1 })})`,
    sample: (rng, v) => rng.vonMises({ mean: v.mean, kappa: v.kappa }),
    pdf: (x, v) => vonMisesPdf(x, v.mean, v.kappa),
    view: (v) => [v.mean - Math.PI, v.mean + Math.PI],
    mean: (v) => v.mean,
    variance: (v) => {
      // The variance of the angle itself, measured from the mean, numerically
      const steps = 400
      const h = (2 * Math.PI) / steps
      let total = 0
      for (let i = 0; i <= steps; i++) {
        const t = -Math.PI + i * h
        const w = i === 0 || i === steps ? 1 : i % 2 ? 4 : 2
        total += w * t * t * vonMisesPdf(v.mean + t, v.mean, v.kappa)
      }
      return (total * h) / 3
    },
  },
]

const zipfNorm = (v: Values) => {
  let h = 0
  for (let k = 1; k <= v.n; k++) h += k ** -v.exponent
  return h
}

export const discrete: DiscreteDistribution[] = [
  {
    kind: 'discrete',
    id: 'bernoulli',
    method: 'bernoulli',
    title: 'Bernoulli',
    tagline: 'A weighted coin toss: `true` with probability `p`.',
    tags: ['boolean'],
    signature: 'bernoulli(p?: number): boolean',
    standalone: 'bernoulli(rng: RandomSource, p?: number): boolean',
    description: [
      'The simplest distribution there is: `true` with probability `p`, `false` otherwise. The building block of every “sometimes”.',
      'If you want to *do* something some of the time, rather than know whether to, see [`doProportion`](/docs/choosing#doProportion).',
    ],
    options: [{ name: 'p', type: 'number', default: '0.5', description: 'The probability of `true`' }],
    returns: 'A boolean.',
    controls: [{ key: 'p', label: 'p', min: 0, max: 1, step: 0.01, default: 0.3 }],
    call: (v) => `bernoulli(${v.p === 0.5 ? '' : lit(v.p)})`,
    sample: (rng, v) => (rng.bernoulli(v.p) ? 1 : 0),
    pmf: (k, v) => (k === 1 ? v.p : 1 - v.p),
    support: () => [0, 1],
    label: (k) => (k === 1 ? 'true' : 'false'),
    mean: (v) => v.p,
    variance: (v) => v.p * (1 - v.p),
  },
  {
    kind: 'discrete',
    id: 'binomial',
    method: 'binomial',
    title: 'Binomial',
    tagline: 'How many of `n` trials succeed, each with probability `p`.',
    tags: ['count', 'bounded'],
    signature: 'binomial(config: { n: number; p: number }): number',
    standalone: 'binomial(rng: RandomSource, config: { n: number; p: number }): number',
    description: [
      'Toss `n` weighted coins and count the heads. The result is between 0 and `n`, centred on `n * p`.',
    ],
    options: [
      { name: 'n', type: 'number', description: 'How many trials; a non-negative integer' },
      { name: 'p', type: 'number', description: 'The probability each one succeeds' },
    ],
    returns: 'An integer from 0 to `n`.',
    throws: ['if `n` is not a non-negative integer', 'if `p` is outside `[0, 1]`'],
    algorithm: 'Simulates the trials directly, so it costs `n` draws.',
    controls: [
      { key: 'n', label: 'n', min: 1, max: 60, step: 1, default: 20 },
      { key: 'p', label: 'p', min: 0, max: 1, step: 0.01, default: 0.3 },
    ],
    call: (v) => `binomial({ n: ${lit(v.n)}, p: ${lit(v.p)} })`,
    sample: (rng, v) => rng.binomial({ n: v.n, p: v.p }),
    pmf: (k, v) => {
      if (v.p === 0) return k === 0 ? 1 : 0
      if (v.p === 1) return k === v.n ? 1 : 0
      return Math.exp(logChoose(v.n, k) + k * Math.log(v.p) + (v.n - k) * Math.log(1 - v.p))
    },
    support: (v) => [0, v.n],
    mean: (v) => v.n * v.p,
    variance: (v) => v.n * v.p * (1 - v.p),
  },
  {
    kind: 'discrete',
    id: 'geometric',
    method: 'geometric',
    title: 'Geometric',
    tagline: 'How many failures before the first success.',
    tags: ['count'],
    signature: 'geometric(p: number): number',
    standalone: 'geometric(rng: RandomSource, p: number): number',
    description: [
      'Keep trying something that succeeds with probability `p`, and count the failures before it first does. Zero is always the most likely answer; each extra failure is `1 - p` times as likely as the last.',
    ],
    options: [{ name: 'p', type: 'number', description: 'The probability of success on each trial, in `(0, 1]`' }],
    returns: 'A non-negative integer.',
    throws: ['if `p` is not in `(0, 1]`'],
    algorithm: 'Inversion, so one draw however long the run of failures.',
    controls: [{ key: 'p', label: 'p', min: 0.05, max: 1, step: 0.01, default: 0.25 }],
    call: (v) => `geometric(${lit(v.p)})`,
    sample: (rng, v) => rng.geometric(v.p),
    pmf: (k, v) => (1 - v.p) ** k * v.p,
    support: (v) => [0, v.p >= 1 ? 1 : Math.max(4, Math.ceil(Math.log(0.004) / Math.log(1 - v.p)))],
    mean: (v) => (1 - v.p) / v.p,
    variance: (v) => (1 - v.p) / v.p ** 2,
  },
  {
    kind: 'discrete',
    id: 'poisson',
    method: 'poisson',
    title: 'Poisson',
    tagline: 'A count of random events, with mean and variance `lambda`.',
    tags: ['count'],
    signature: 'poisson(lambda: number): number',
    standalone: 'poisson(rng: RandomSource, lambda: number): number',
    description: [
      'How many events land in a unit of time or space when they occur independently at an average rate of `lambda`. Both the mean and the variance are `lambda`.',
      'Ideal for “how many?”: spots on a shape, leaves on a branch, stars in a cell of the sky.',
    ],
    options: [{ name: 'lambda', type: 'number', description: 'The mean (and variance)' }],
    returns: 'A non-negative integer.',
    throws: ['if `lambda` is negative'],
    algorithm: 'Knuth’s multiplication method; cost grows with `lambda`.',
    controls: [{ key: 'lambda', label: 'lambda', min: 0.1, max: 30, step: 0.1, default: 4 }],
    call: (v) => `poisson(${lit(v.lambda)})`,
    sample: (rng, v) => rng.poisson(v.lambda),
    pmf: (k, v) => Math.exp(k * Math.log(v.lambda) - v.lambda - logFactorial(k)),
    support: (v) => [0, Math.max(6, Math.ceil(v.lambda + 4.5 * Math.sqrt(v.lambda) + 2))],
    mean: (v) => v.lambda,
    variance: (v) => v.lambda,
  },
  {
    kind: 'discrete',
    id: 'categorical',
    method: 'categorical',
    title: 'Categorical',
    tagline: 'An index, chosen in proportion to its weight.',
    tags: ['index'],
    signature: 'categorical(weights: number[]): number',
    standalone: 'categorical(rng: RandomSource, weights: number[]): number',
    description: [
      'Picks an index into `weights`, in proportion to the weight at that index. Weights are relative, so they need not sum to anything in particular.',
      'If you want the value rather than its index, see [`weightedSample`](/docs/collections#weightedSample); to run a function, [`proportionately`](/docs/choosing#proportionately).',
    ],
    options: [{ name: 'weights', type: 'number[]', description: 'One non-negative weight per index' }],
    returns: 'An integer index into `weights`.',
    throws: ['if `weights` is empty', 'if any weight is negative', 'if the weights do not sum to something positive'],
    controls: [
      { key: 'w0', label: 'weights[0]', min: 0, max: 10, step: 0.5, default: 5 },
      { key: 'w1', label: 'weights[1]', min: 0, max: 10, step: 0.5, default: 3 },
      { key: 'w2', label: 'weights[2]', min: 0, max: 10, step: 0.5, default: 2 },
      { key: 'w3', label: 'weights[3]', min: 0, max: 10, step: 0.5, default: 0.5 },
    ],
    call: (v) => `categorical([${[v.w0, v.w1, v.w2, v.w3].map(lit).join(', ')}])`,
    sample: (rng, v) => rng.categorical([v.w0, v.w1, v.w2, v.w3]),
    pmf: (k, v) => {
      const w = [v.w0, v.w1, v.w2, v.w3]
      return w[k] / w.reduce((a, b) => a + b, 0)
    },
    support: () => [0, 3],
    mean: (v) => {
      const w = [v.w0, v.w1, v.w2, v.w3]
      return w.reduce((s, x, i) => s + x * i, 0) / w.reduce((a, b) => a + b, 0)
    },
  },
  {
    kind: 'discrete',
    id: 'zipf',
    method: 'zipf',
    title: 'Zipf',
    tagline: 'A rank from 1 to `n`, falling away by a power law.',
    tags: ['rank', 'bounded'],
    signature: 'zipf(config: { n: number; exponent?: number }): number',
    standalone: 'zipf(rng: RandomSource, config: { n: number; exponent?: number }): number',
    description: [
      'A rank from 1 to `n`, where rank `k` comes up in proportion to `k ** -exponent`. The first rank dominates, the second gets about half as much (at the default exponent), and the tail is long but bounded.',
      'How sizes fall when they follow an order: city populations, word frequencies, the biggest shape on the canvas and everything after it.',
    ],
    options: [
      { name: 'n', type: 'number', description: 'How many ranks; the largest value it can return' },
      { name: 'exponent', type: 'number', default: '1', description: 'How fast the ranks fall away' },
    ],
    returns: 'An integer from 1 to `n`.',
    throws: ['if `n` is not a positive integer', 'if `exponent` is not positive'],
    algorithm: 'Rejection inversion (Hörmann and Derflinger), so the cost does not grow with `n`.',
    controls: [
      { key: 'n', label: 'n', min: 2, max: 40, step: 1, default: 20 },
      { key: 'exponent', label: 'exponent', min: 0.2, max: 3, step: 0.05, default: 1 },
    ],
    call: (v) => `zipf(${config(v, ['n', 'exponent'], { exponent: 1 })})`,
    sample: (rng, v) => rng.zipf({ n: v.n, exponent: v.exponent }),
    pmf: (k, v) => k ** -v.exponent / zipfNorm(v),
    support: (v) => [1, v.n],
    mean: (v) => {
      let s = 0
      for (let k = 1; k <= v.n; k++) s += k * k ** -v.exponent
      return s / zipfNorm(v)
    },
  },
]

export const simplex: SimplexDistribution[] = [
  {
    kind: 'simplex',
    id: 'dirichlet',
    method: 'dirichlet',
    title: 'Dirichlet',
    tagline: 'Random shares of a whole, summing to one.',
    tags: ['vector', 'proportions'],
    signature: 'dirichlet(alpha: number[]): number[]',
    standalone: 'dirichlet(rng: RandomSource, alpha: number[]): number[]',
    description: [
      'Splits one thing into random parts: a vector of proportions, each positive and all summing to one, with one concentration in `alpha` per share.',
      'Concentrations below one push most of the whole into a single share; above one, the shares even out; larger concentrations relative to the others claim more. The triangle below plots each draw of three shares — the corners are “all in one share”, the middle is “a third each”.',
    ],
    options: [{ name: 'alpha', type: 'number[]', description: 'One positive concentration per share' }],
    returns: 'An array as long as `alpha`, of positive numbers summing to 1.',
    throws: ['if `alpha` is empty', 'if any concentration is not positive'],
    algorithm: 'Normalised gamma draws, one per share.',
    controls: [
      { key: 'a0', label: 'alpha[0]', min: 0.1, max: 12, step: 0.1, default: 1 },
      { key: 'a1', label: 'alpha[1]', min: 0.1, max: 12, step: 0.1, default: 1 },
      { key: 'a2', label: 'alpha[2]', min: 0.1, max: 12, step: 0.1, default: 1 },
    ],
    call: (v) => `dirichlet([${[v.a0, v.a1, v.a2].map(lit).join(', ')}])`,
    sample: (rng, v) => rng.dirichlet([v.a0, v.a1, v.a2]),
  },
]

export const distributions: Distribution[] = [...continuous, ...discrete, ...simplex]

export function distributionById(id: string | undefined): Distribution | undefined {
  return distributions.find((d) => d.id === id)
}

export function defaults(d: Distribution): Values {
  return Object.fromEntries(d.controls.map((c) => [c.key, c.default]))
}
