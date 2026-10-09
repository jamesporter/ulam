import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SiteHeader } from './SiteHeader'

/** Scrolls to the hash target after navigation, or to the top of a new page. */
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // Let the page render before looking for the target
      const id = decodeURIComponent(hash.slice(1))
      const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 30)
      return () => clearTimeout(t)
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
}

export function RootLayout() {
  useScrollOnNavigate()
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <div className="flex-1">
          <Outlet />
        </div>
        <footer className="border-t py-8 text-sm text-muted-foreground">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              MIT licensed. Named for Stanisław Ulam, who invented the Monte Carlo method while playing solitaire.
            </p>
            <div className="flex gap-4">
              <Link to="/releases" className="hover:text-foreground">Releases</Link>
              <a href="https://github.com/jamesporter/ulam" className="hover:text-foreground" target="_blank" rel="noreferrer">GitHub</a>
              <a href="https://www.npmjs.com/package/ulam-prng" className="hover:text-foreground" target="_blank" rel="noreferrer">npm</a>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
