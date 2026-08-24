# Ideas

Possible features and improvements for `ulam-prng`. Roughly grouped, not
ordered by priority.

## Seeding and streams

- [x] Seed from a string, so `new RNG("sunflower")` is a valid, reproducible seed (done 2026-08-24)
- [x] Independent substreams: `fork()`, `split(n)` and `stream(id)` for handing separate, reproducible generators to subroutines (done 2026-08-24)
- [ ] Jump ahead in O(log n) with `skip(n)`, using the closed form for advancing an LCG, rather than calling `next()` in a loop
- [ ] Serialise state to and from a short string (`toJSON()` / `RNG.fromJSON()`), so a sketch can put its exact position in a URL
- [ ] Seed from `crypto.getRandomValues` when available, instead of `Math.random()`, for a full 64 bits of entropy on an unseeded generator

## Distributions

- [ ] Von Mises: the circular analogue of a gaussian, for angles that cluster around a heading
- [ ] Dirichlet: a set of proportions that sum to one, for splitting an area into random shares
- [ ] Zipf / discrete power law, for sizes that follow a rank order
- [ ] Truncated gaussian: a normal draw constrained to `[min, max]`, sampled properly rather than clamped
- [ ] Mixture distributions: combine weighted component distributions into one sampler
- [ ] A `Distribution` object interface (`sample()`, `samples(n)`, `mean`, `variance`) so distributions can be passed around as values
- [ ] Ziggurat or polar Box-Muller for `gaussian`, keeping the second normal of each pair instead of throwing it away

## Points and geometry

- [ ] Poisson disk sampling in three dimensions
- [ ] Variable radius Poisson disk sampling, with `minDist` given as a function of position, for density that varies across the canvas
- [ ] Poisson disk sampling inside an arbitrary region, via a `contains(point)` predicate or mask
- [ ] Jittered grid sampling: stratified points that are more even than uniform but far cheaper than Poisson disk
- [ ] Low discrepancy sequences (Halton, Sobol, R2) for evenly spread points without rejection
- [ ] Random points in a triangle, polygon, annulus or on an ellipse boundary
- [ ] Random rotations: a uniform quaternion, a 2D angle-and-matrix helper, and a random orthonormal basis
- [ ] Correlated multivariate gaussian from a covariance matrix, for elongated or tilted blurs

## Noise and walks

- [ ] Seeded value and gradient (Perlin/simplex) noise in 1, 2 and 3 dimensions
- [ ] Fractal Brownian motion built on that noise, with octaves, lacunarity and gain
- [ ] Random walks: a `walk` helper producing correlated steps, with optional momentum and drift

## Collections and API

- [ ] Sample `n` distinct elements without replacement, and a weighted version of the same
- [ ] Reservoir sampling, for taking `k` items from an iterable of unknown length
- [ ] The alias method for `categorical`, so repeated draws from fixed weights are O(1)
- [ ] Lazy iterator helpers: `rng.take(n, fn)` and an infinite iterator of draws

## Project

- [ ] Golden test vectors checked against the reference PCG implementation, so the output sequence is pinned across refactors
- [ ] A benchmark suite (`pnpm bench`) comparing against `Math.random` and other seeded generators
- [ ] Generated API documentation from the existing TSDoc, published to GitHub Pages
