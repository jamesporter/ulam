import { ChevronLeft, ChevronRight, Maximize, Minimize, Presentation as PresentationIcon, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Link } from 'react-router'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Logo } from '@/components/layout/Logo'
import { deck, sections } from '@/components/slides/deck'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** The slide a hash names, by id or by number. */
function indexFromHash(): number {
  const h = decodeURIComponent(window.location.hash.slice(1))
  if (!h) return 0
  const byId = deck.findIndex((s) => s.id === h)
  if (byId >= 0) return byId
  const n = Number(h)
  return Number.isInteger(n) && n >= 1 && n <= deck.length ? n - 1 : 0
}

/** Whether a key press belongs to whatever has focus rather than to the deck. */
function isEditing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  return target.getAttribute('role') === 'slider'
}

/** Plain substring ranking, as the docs palette does: the title counts most. */
function filter(_value: string, search: string, keywords: string[] = []): number {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const [title = '', ...context] = keywords.map((k) => k.toLowerCase())
  if (title.startsWith(q)) return 1
  if (title.includes(q)) return 0.8
  return context.some((k) => k.includes(q)) ? 0.5 : 0
}

/**
 * A fullscreen tour of pseudo random number generation and of the library:
 * arrow keys to move, `/` to search, and every slide live.
 */
export function Presentation() {
  const [index, setIndex] = useState(indexFromHash)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [searching, setSearching] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const slide = deck[index]
  const Current = slide.Component

  const go = (next: number) => {
    const i = Math.max(0, Math.min(deck.length - 1, next))
    if (i === index) return
    setDirection(i > index ? 1 : -1)
    setIndex(i)
  }

  useEffect(() => {
    const id = `#${deck[index].id}`
    if (window.location.hash !== id) window.history.replaceState(window.history.state, '', id)
    document.title = `${deck[index].title} · ulam-prng presentation`
  }, [index])

  useEffect(() => {
    const onHash = () => {
      const i = indexFromHash()
      setIndex(i)
      // A number or an unknown name becomes the slide's own id
      window.history.replaceState(window.history.state, '', `#${deck[i].id}`)
    }
    const onFullscreen = () => setFullscreen(document.fullscreenElement !== null)
    window.addEventListener('hashchange', onHash)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('fullscreenchange', onFullscreen)
      document.title = 'ulam-prng'
    }
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (searching || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        return
      }
      if (isEditing(e.target)) return
      const onButton = e.target instanceof HTMLElement && e.target.closest('button, a') !== null
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault()
          go(index + 1)
          break
        case ' ':
          if (onButton) return
          e.preventDefault()
          go(index + (e.shiftKey ? -1 : 1))
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          go(index - 1)
          break
        case 'Home':
          e.preventDefault()
          go(0)
          break
        case 'End':
          e.preventDefault()
          go(deck.length - 1)
          break
        case '/':
          e.preventDefault()
          setSearching(true)
          break
        case 'f':
          toggleFullscreen()
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touch.current = isEditing(e.target) || (e.target as HTMLElement).closest('[role=slider], input') ? null : { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current
    touch.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) go(index + (dx < 0 ? 1 : -1))
  }

  const sectionTitle = sections.find((s) => s.id === slide.section)?.title ?? ''

  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed inset-0 overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute -top-60 left-1/3 h-[480px] w-[900px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--brand)_10%,transparent),transparent)] blur-2xl" />

        <main
          key={slide.id}
          className={cn(
            'absolute inset-0 overflow-y-auto duration-300 animate-in fade-in lg:overflow-hidden',
            direction > 0 ? 'slide-in-from-right-6' : 'slide-in-from-left-6',
          )}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${deck.length}: ${slide.title}`}
        >
          <Current />
        </main>

        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 py-3 sm:px-5">
          <div className="pointer-events-auto flex min-w-0 items-center gap-1.5 rounded-xl border bg-background/80 p-1 pr-3 shadow-sm backdrop-blur-lg">
            <Link to="/" className="rounded-lg p-0.5" aria-label="ulam-prng home" title="Back to the docs">
              <Logo className="size-7" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearching(true)}
              className="h-8 gap-2 px-2 font-normal text-muted-foreground"
              aria-label="Search slides"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search slides</span>
              <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline">/</kbd>
            </Button>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="truncate text-xs text-muted-foreground">
              <span className="font-mono text-foreground tabular-nums">{index + 1}</span>
              <span className="font-mono"> / {deck.length}</span>
              <span className="hidden md:inline"> · {sectionTitle}</span>
            </span>
          </div>
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border bg-background/80 p-1 shadow-sm backdrop-blur-lg">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={fullscreen ? 'Leave fullscreen' : 'Fullscreen'} title="Fullscreen (F)">
              {fullscreen ? <Minimize /> : <Maximize />}
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/docs" aria-label="Close the presentation" title="Close">
                <X />
              </Link>
            </Button>
          </div>
        </header>

        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <div className="flex items-end justify-between gap-2 px-3 pb-3 sm:px-5">
            <p className="hidden items-center gap-3 rounded-lg bg-background/70 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur lg:flex">
              <span>
                <kbd className="font-mono">← →</kbd> move
              </span>
              <span>
                <kbd className="font-mono">/</kbd> search
              </span>
              <span>
                <kbd className="font-mono">F</kbd> fullscreen
              </span>
              <span>
                <kbd className="font-mono">Esc</kbd> leave a control
              </span>
            </p>
            <div className="pointer-events-auto ml-auto flex items-center gap-0.5 rounded-xl border bg-background/80 p-1 shadow-sm backdrop-blur-lg">
              <Button variant="ghost" size="icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => go(index + 1)} disabled={index === deck.length - 1} aria-label="Next slide">
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="h-1 bg-muted/60">
            <div className="h-full brand-gradient transition-[width] duration-300" style={{ width: `${((index + 1) / deck.length) * 100}%` }} />
          </div>
        </footer>

        <CommandDialog
          open={searching}
          onOpenChange={setSearching}
          title="Search the slides"
          description="Jump to any slide by its title or topic"
          className="sm:max-w-xl"
        >
          <Command filter={filter}>
            <CommandInput placeholder="Search slides…" />
            <CommandList className="max-h-[min(60vh,28rem)]">
              <CommandEmpty>No slide matches.</CommandEmpty>
              {sections.map((section) => (
                <CommandGroup key={section.id} heading={section.title}>
                  {deck.map((s, i) =>
                    s.section === section.id ? (
                      <CommandItem
                        key={s.id}
                        value={`slide ${s.id}`}
                        keywords={[s.title, section.title, ...(s.keywords ?? [])]}
                        onSelect={() => {
                          setSearching(false)
                          go(i)
                        }}
                      >
                        <PresentationIcon className={cn(i === index && 'text-brand')} />
                        <span className={cn(i === index && 'font-medium text-brand')}>{s.title}</span>
                        <CommandShortcut className="font-mono tracking-normal">{i + 1}</CommandShortcut>
                      </CommandItem>
                    ) : null,
                  )}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </CommandDialog>
      </div>
    </TooltipProvider>
  )
}
