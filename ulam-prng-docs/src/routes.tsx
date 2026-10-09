import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import { DocsLayout } from '@/components/layout/DocsLayout'
import { RootLayout } from '@/components/layout/RootLayout'
import { NotFound } from '@/pages/NotFound'

/** A page loaded on first visit, so each route only downloads what it shows. */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return async () => ({ Component: (await load())[name] })
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { index: true, lazy: page(() => import('@/pages/Home'), 'Home') },
      {
        path: 'docs',
        element: <DocsLayout />,
        children: [
          { index: true, lazy: page(() => import('@/pages/Introduction'), 'Introduction') },
          { path: 'seeding', lazy: page(() => import('@/pages/Seeding'), 'Seeding') },
          { path: 'streams', lazy: page(() => import('@/pages/Streams'), 'Streams') },
          { path: 'serialisation', lazy: page(() => import('@/pages/Serialisation'), 'Serialisation') },
          { path: 'numbers', lazy: page(() => import('@/pages/Numbers'), 'Numbers') },
          { path: 'distributions', lazy: page(() => import('@/pages/Distributions'), 'Distributions') },
          { path: 'distributions/:id', lazy: page(() => import('@/pages/DistributionPage'), 'DistributionPage') },
          { path: 'points', lazy: page(() => import('@/pages/Points'), 'Points') },
          { path: 'vectors', lazy: page(() => import('@/pages/Vectors'), 'Vectors') },
          { path: 'collections', lazy: page(() => import('@/pages/Collections'), 'Collections') },
          { path: 'choosing', lazy: page(() => import('@/pages/Choosing'), 'Choosing') },
          { path: 'noise', lazy: page(() => import('@/pages/Noise'), 'Noise') },
          { path: 'walks', lazy: page(() => import('@/pages/Walks'), 'Walks') },
          { path: 'standalone', lazy: page(() => import('@/pages/Standalone'), 'Standalone') },
        ],
      },
      {
        element: <DocsLayout />,
        children: [
          { path: 'api', lazy: page(() => import('@/pages/ApiReference'), 'ApiReference') },
          { path: 'releases', lazy: page(() => import('@/pages/Releases'), 'Releases') },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]
