import { ArrowRight } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Link } from 'react-router'
import { InstallCommand } from '@/components/docs/InstallCommand'
import { Button } from '@/components/ui/button'
import { HeroArt } from '@/components/viz/HeroArt'
import { version } from '@/lib/version'
import { ChoosingSlide, CountsSlide, RandomOrderSlide, ReservoirSlide, SamplingSlide, ShuffleSlide, WeightedSlide } from './collections'
import { FbmSlide, FlowSlide, NoiseSlide, WalkSlide } from './noise'
import { CircleSlide, DiscSlide, GaussianVecSlide, PerturbSlide, PoissonSlide, ShapesSlide, SphereSlide, SpreadsSlide } from './geometry'
import { distributionSlides, InverseSlide } from './distributions'
import { ForkSlide, SeedingSlide, SerialiseSlide, SkipSlide, StreamsSlide } from './library'
import { IntegerSlide, LatticeSlide, LowBitsSlide, MonteCarloSlide, NumberSlide, PcgSlide, RepeatableSlide, StateSlide } from './intro'

export type SlideDef = {
  id: string
  title: string
  section: string
  /** More words to find it by in search */
  keywords?: string[]
  Component: ComponentType
}

export const sections = [
  { id: 'start', title: 'Welcome' },
  { id: 'prng', title: 'Pseudo random numbers' },
  { id: 'seeds', title: 'Seeds, streams and state' },
  { id: 'continuous', title: 'Continuous distributions' },
  { id: 'discrete', title: 'Discrete distributions and proportions' },
  { id: 'geometry', title: 'Points, shapes and directions' },
  { id: 'collections', title: 'Collections and choices' },
  { id: 'noise', title: 'Noise and walks' },
  { id: 'end', title: 'Wrapping up' },
]

function TitleSlide() {
  const [seed, setSeed] = useState('sunflower')
  const firsts = sections.slice(1).map((s) => ({ ...s, slide: deck.findIndex((d) => d.section === s.id) }))
  return (
    <div className="grid min-h-full items-center gap-10 px-5 pt-20 pb-16 sm:px-10 lg:h-full lg:grid-cols-[1.15fr_1fr] lg:px-16 2xl:px-28">
      <div>
        <p className="font-mono text-xs font-medium tracking-wide text-brand uppercase">A presentation · ulam-prng v{version}</p>
        <h1 className="mt-4 text-5xl leading-[1.02] font-bold tracking-tight xl:text-6xl 2xl:text-7xl">
          Seeded randomness, <span className="brand-gradient-text">from bits to pictures</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground 2xl:text-xl">
          How a pseudo random number generator works, how its uniform bits are bent into every distribution you need, and
          how ulam-prng turns them into the randomness a generative artist actually reaches for. Every slide is live —
          move the sliders and watch.
        </p>
        <ol className="mt-8 grid max-w-2xl gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {firsts.map((s, i) => (
            <li key={s.id}>
              <a href={`#${deck[s.slide].id}`} className="group flex items-baseline gap-2 text-muted-foreground hover:text-foreground">
                <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
                <ArrowRight className="size-3 self-center opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-8 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {[
            ['→', 'next'],
            ['←', 'back'],
            ['/', 'search'],
            ['F', 'fullscreen'],
          ].map(([k, label]) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
              <kbd className="font-mono text-foreground">{k}</kbd> {label}
            </span>
          ))}
        </p>
      </div>
      <div className="relative mx-auto w-full" style={{ maxWidth: 'min(100%, 68svh)' }}>
        <div className="absolute -inset-4 -z-10 brand-gradient opacity-15 blur-2xl" />
        <div className="overflow-hidden border bg-card shadow-xl">
          <HeroArt seed={seed} />
          <div className="flex items-center gap-2 border-t px-4 py-2.5 font-mono text-sm">
            <span className="text-muted-foreground">new RNG(</span>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="min-w-0 flex-1 rounded-md bg-muted px-2 py-1 text-brand outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Seed for the picture"
              spellCheck={false}
            />
            <span className="text-muted-foreground">)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClosingSlide() {
  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-8 px-5 pt-20 pb-16 sm:px-10">
      <div>
        <p className="font-mono text-xs font-medium tracking-wide text-brand uppercase">That’s the tour</p>
        <h2 className="mt-3 text-5xl font-bold xl:text-6xl">
          One seed, <span className="brand-gradient-text">the same picture</span>, every time
        </h2>
      </div>
      <p className="text-lg leading-relaxed text-muted-foreground">
        A PCG32 core with good statistics and a 2⁶⁴ period; uniform bits shaped into twenty-one distributions; directions,
        shapes and even spreads; collections, choices, noise and walks — named seeds and independent streams keeping all of
        it reproducible. Every function is also exported standalone, taking any <code className="font-mono text-foreground">() =&gt; number</code>.
      </p>
      <InstallCommand className="max-w-lg" />
      <div className="flex flex-wrap gap-3">
        <Button size="lg" asChild className="h-10 px-5">
          <Link to="/docs">
            Read the docs <ArrowRight />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild className="h-10 px-5">
          <Link to="/api">API reference</Link>
        </Button>
        <Button size="lg" variant="ghost" asChild className="h-10 px-5">
          <a href="https://github.com/jamesporter/ulam" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </Button>
      </div>
    </div>
  )
}

export const deck: SlideDef[] = [
  { id: 'welcome', title: 'Seeded randomness, from bits to pictures', section: 'start', keywords: ['title', 'contents'], Component: TitleSlide },
  { id: 'monte-carlo', title: 'Ulam’s solitaire', section: 'prng', keywords: ['monte carlo', 'pi', 'estimate'], Component: MonteCarloSlide },
  { id: 'repeatable', title: 'Random, but repeatable', section: 'prng', keywords: ['seed', 'deterministic', 'von neumann'], Component: RepeatableSlide },
  { id: 'state', title: 'A state, and a step', section: 'prng', keywords: ['period', 'cycle', 'hull dobell', 'lcg'], Component: StateSlide },
  { id: 'lattice', title: 'Random numbers fall mainly in the planes', section: 'prng', keywords: ['randu', 'lcg', 'marsaglia', 'spectral'], Component: LatticeSlide },
  { id: 'low-bits', title: 'The trouble with the low bits', section: 'prng', keywords: ['lcg', 'bits', 'period'], Component: LowBitsSlide },
  { id: 'pcg', title: 'PCG: a permuted congruential generator', section: 'prng', keywords: ['next', 'xorshift', 'rotate', "o'neill"], Component: PcgSlide },
  { id: 'number', title: 'Uniform doubles: number()', section: 'prng', keywords: ['uniform', 'float', 'chi squared', '53 bits'], Component: NumberSlide },
  { id: 'integer', title: 'Integers without bias: integer(max)', section: 'prng', keywords: ['modulo bias', 'rejection', 'dice'], Component: IntegerSlide },
  { id: 'seeding', title: 'Name a picture, not just number it', section: 'seeds', keywords: ['hashSeed', 'string seed', 'avalanche'], Component: SeedingSlide },
  { id: 'streams', title: 'Streams: change one thing, keep the rest', section: 'seeds', keywords: ['stream', 'increment', 'independent'], Component: StreamsSlide },
  { id: 'fork', title: 'Hand out generators with fork()', section: 'seeds', keywords: ['fork', 'split', 'children'], Component: ForkSlide },
  { id: 'skip', title: 'Jumping ahead: skip(n)', section: 'seeds', keywords: ['skip', 'jump ahead', 'advance', 'log n'], Component: SkipSlide },
  { id: 'serialise', title: 'Saving where you are: toJSON()', section: 'seeds', keywords: ['toJSON', 'fromJSON', 'url', 'serialisation', 'getState', 'setState'], Component: SerialiseSlide },
  { id: 'inverse', title: 'Bending uniform numbers into any shape', section: 'continuous', keywords: ['inverse transform', 'cdf', 'quantile'], Component: InverseSlide },
  ...distributionSlides.map((d) => ({
    id: d.id,
    title: d.title,
    section: d.kind === 'continuous' ? 'continuous' : 'discrete',
    keywords: d.keywords,
    Component: d.Component,
  })),
  { id: 'perturb', title: 'Nudging things: perturb', section: 'geometry', keywords: ['perturb', 'perturbVec2', 'perturbVec3', 'schotter', 'jitter'], Component: PerturbSlide },
  { id: 'poisson-disk', title: 'Poisson disk points: random, but never too close', section: 'geometry', keywords: ['poissonDiskPoints', 'forPoissonDiskPoints', 'bridson', 'blue noise', 'stipple'], Component: PoissonSlide },
  { id: 'spreads', title: 'Even spreads: grids and quasi-random sequences', section: 'geometry', keywords: ['jitteredGridPoints', 'quasiRandomPoints', 'halton', 'r2', 'low discrepancy'], Component: SpreadsSlide },
  { id: 'shapes', title: 'Inside any shape, uniform by area', section: 'geometry', keywords: ['inPolygon', 'inTriangle', 'pointInPolygon'], Component: ShapesSlide },
  { id: 'disc', title: 'Discs and rings: inAnnulus', section: 'geometry', keywords: ['inAnnulus', 'inUnitDisc', 'radius', 'sqrt'], Component: DiscSlide },
  { id: 'circle', title: 'Random directions, done properly', section: 'geometry', keywords: ['onUnitCircle', 'randomAngle', 'direction', 'normalise'], Component: CircleSlide },
  { id: 'sphere', title: 'Points on a sphere, and in a ball', section: 'geometry', keywords: ['onUnitSphere', 'inUnitBall', 'archimedes', '3d'], Component: SphereSlide },
  { id: 'gaussian-vec', title: 'Round blurs: gaussianVec2', section: 'geometry', keywords: ['gaussianVec2', 'gaussianVec3', 'gaussianVec4', 'uniformVec2', 'uniformVec3', 'rayleigh'], Component: GaussianVecSlide },
  { id: 'shuffle', title: 'Shuffling fairly: Fisher–Yates', section: 'collections', keywords: ['shuffle', 'shuffled', 'fisher yates', 'bias', 'permutation'], Component: ShuffleSlide },
  { id: 'sampling', title: 'Sampling, with and without replacement', section: 'collections', keywords: ['sample', 'samples', 'sampleWithoutReplacement', 'samplesWithoutReplacement', 'birthday'], Component: SamplingSlide },
  { id: 'weighted', title: 'Weighted choices in constant time: the alias method', section: 'collections', keywords: ['weightedSample', 'weightedSampler', 'alias', 'vose', 'categorical'], Component: WeightedSlide },
  { id: 'counts', title: 'Exactly so many of each: drawing from counts', section: 'collections', keywords: ['sampleWithoutReplacementWithCounts', 'samplesWithoutReplacementWithCounts', 'bag', 'deck'], Component: CountsSlide },
  { id: 'reservoir', title: 'One pass, any length: reservoirSample', section: 'collections', keywords: ['reservoirSample', 'algorithm r', 'stream', 'iterable'], Component: ReservoirSlide },
  { id: 'choosing', title: 'proportionately and doProportion', section: 'collections', keywords: ['proportionately', 'doProportion', 'choose', 'callback', 'sometimes'], Component: ChoosingSlide },
  { id: 'random-order', title: 'When order matters: withRandomOrder', section: 'collections', keywords: ['withRandomOrder', 'layering', 'order'], Component: RandomOrderSlide },
  { id: 'noise', title: 'Coherent noise: smooth randomness', section: 'noise', keywords: ['simplexNoise', 'perlinNoise', 'valueNoise', 'NoiseField'], Component: NoiseSlide },
  { id: 'fbm', title: 'Detail at every scale: fbm', section: 'noise', keywords: ['fbm', 'octaves', 'lacunarity', 'gain', 'fractal', 'terrain'], Component: FbmSlide },
  { id: 'flow-field', title: 'Flow fields: everything together', section: 'noise', keywords: ['flow field', 'streams', 'hero', 'strokes'], Component: FlowSlide },
  { id: 'walk', title: 'Paths that remember: walk', section: 'noise', keywords: ['walk', 'momentum', 'drift', 'brownian'], Component: WalkSlide },
  { id: 'thanks', title: 'One seed, the same picture, every time', section: 'end', keywords: ['install', 'summary', 'end'], Component: ClosingSlide },
]
