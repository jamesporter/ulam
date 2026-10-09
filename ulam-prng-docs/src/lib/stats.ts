/**
 * The exact densities the visualisations draw over each histogram, so you can
 * see the samples settling onto the curve they are meant to follow.
 */

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

/** log Γ(x), by the Lanczos approximation; good to around fifteen digits. */
export function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x)
  x -= 1
  let a = 0.99999999999980993
  const t = x + 7.5
  for (let i = 0; i < LANCZOS.length; i++) a += LANCZOS[i] / (x + i + 1)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

export function logFactorial(k: number): number {
  return logGamma(k + 1)
}

export function logChoose(n: number, k: number): number {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

/** The error function, Abramowitz and Stegun 7.1.26 refined; plenty for drawing. */
export function erf(x: number): number {
  const sign = Math.sign(x)
  x = Math.abs(x)
  const t = 1 / (1 + 0.5 * x)
  const y =
    1 -
    t *
      Math.exp(
        -x * x -
          1.26551223 +
          t *
            (1.00002368 +
              t *
                (0.37409196 +
                  t *
                    (0.09678418 +
                      t *
                        (-0.18628806 +
                          t *
                            (0.27886807 +
                              t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
      )
  return sign * y
}

export function normalPdf(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI))
}

export function normalCdf(x: number, mean = 0, sd = 1): number {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)))
}

export function gammaPdf(x: number, shape: number, scale: number): number {
  if (x < 0) return 0
  if (x === 0) return shape === 1 ? 1 / scale : shape < 1 ? Infinity : 0
  return Math.exp((shape - 1) * Math.log(x) - x / scale - logGamma(shape) - shape * Math.log(scale))
}

export function betaPdf(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0
  const logB = logGamma(a) + logGamma(b) - logGamma(a + b)
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB)
}

export function studentTPdf(x: number, df: number): number {
  const logC = logGamma((df + 1) / 2) - logGamma(df / 2) - 0.5 * Math.log(df * Math.PI)
  return Math.exp(logC - ((df + 1) / 2) * Math.log(1 + (x * x) / df))
}

/** Summary statistics of a sample. */
export function describe(xs: ArrayLike<number>) {
  let n = 0
  let mean = 0
  let m2 = 0
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]
    if (!Number.isFinite(x)) continue
    n++
    const d = x - mean
    mean += d / n
    m2 += d * (x - mean)
  }
  return { n, mean, sd: n > 1 ? Math.sqrt(m2 / (n - 1)) : 0 }
}

/** A number for display: short, but with enough digits to compare. */
export function fmt(x: number | undefined, digits = 3): string {
  if (x === undefined || Number.isNaN(x)) return '—'
  if (x === Infinity) return '∞'
  if (x === -Infinity) return '−∞'
  if (x !== 0 && (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3)) return x.toExponential(2)
  return Number(x.toFixed(digits)).toString()
}
