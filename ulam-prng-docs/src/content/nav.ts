import { continuous, discrete, simplex } from './distributions'

export type NavItem = { title: string; to: string; badge?: string }
export type NavSection = { title: string; items: NavItem[] }

export const nav: NavSection[] = [
  {
    title: 'Getting started',
    items: [
      { title: 'Introduction', to: '/docs' },
      { title: 'Seeding', to: '/docs/seeding' },
      { title: 'Streams', to: '/docs/streams' },
      { title: 'Saving where you are', to: '/docs/serialisation' },
    ],
  },
  {
    title: 'Randomness',
    items: [
      { title: 'Numbers', to: '/docs/numbers' },
      { title: 'Distributions', to: '/docs/distributions' },
      { title: 'Points', to: '/docs/points' },
      { title: 'Vectors', to: '/docs/vectors' },
      { title: 'Collections', to: '/docs/collections' },
      { title: 'Choosing what to do', to: '/docs/choosing' },
      { title: 'Noise', to: '/docs/noise' },
      { title: 'Random walks', to: '/docs/walks' },
    ],
  },
  {
    title: 'Continuous distributions',
    items: continuous.map((d) => ({ title: d.title, to: `/docs/distributions/${d.id}` })),
  },
  {
    title: 'Discrete distributions',
    items: [...discrete, ...simplex].map((d) => ({ title: d.title, to: `/docs/distributions/${d.id}` })),
  },
  {
    title: 'Reference',
    items: [
      { title: 'Standalone functions', to: '/docs/standalone' },
      { title: 'API reference', to: '/api' },
      { title: 'Release notes', to: '/releases' },
    ],
  },
]

/** The guide pages in reading order, for previous and next links. */
export const sequence: NavItem[] = nav.flatMap((s) => s.items).filter((i) => i.to !== '/api' && i.to !== '/releases')
