import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { version } from '@/lib/version'
import { CommandMenu } from './CommandMenu'
import { GitHubIcon } from './GitHubIcon'
import { Logo } from './Logo'
import { SidebarNav } from './SidebarNav'
import { ThemeToggle } from './ThemeToggle'


const links = [
  { to: '/docs', label: 'Docs', match: (p: string) => p.startsWith('/docs') && !p.startsWith('/docs/distributions') },
  { to: '/docs/distributions', label: 'Distributions', match: (p: string) => p.startsWith('/docs/distributions') },
  { to: '/api', label: 'API', match: (p: string) => p === '/api' },
  { to: '/releases', label: 'Releases', match: (p: string) => p === '/releases' },
]

export function SiteHeader() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-4 sm:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 p-0">
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2">
                <Logo className="size-6" /> ulam-prng
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-3 py-4">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="mr-4 flex items-center gap-2.5">
          <Logo />
          <span className="font-heading text-lg font-semibold tracking-tight">ulam-prng</span>
          <span className="hidden rounded-full border px-2 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
            v{version}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors hover:text-foreground',
                l.match(pathname) ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <CommandMenu />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href="https://www.npmjs.com/package/ulam-prng" target="_blank" rel="noreferrer">
              npm
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com/jamesporter/ulam" target="_blank" rel="noreferrer" aria-label="GitHub">
              <GitHubIcon className="size-4" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
