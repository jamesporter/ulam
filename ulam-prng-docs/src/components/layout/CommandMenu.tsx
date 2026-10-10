import { BookOpen, Braces, Check, FileText, Package, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { apiGroups, apiHref } from '@/content/api'
import { nav } from '@/content/nav'

const pages = [
  { title: 'Home', to: '/', section: 'ulam-prng' },
  ...nav.flatMap((s) => s.items.map((i) => ({ title: i.title, to: i.to, section: s.title }))),
]

const installs = [
  { manager: 'pnpm', command: 'pnpm add ulam-prng' },
  { manager: 'npm', command: 'npm install ulam-prng' },
  { manager: 'yarn', command: 'yarn add ulam-prng' },
]

/**
 * Ranks items by plain substring matches rather than cmdk's fuzzy default,
 * which matches letters scattered anywhere. The first keyword is the item's
 * name; the rest are context, like its section, and count for less.
 */
function filter(value: string, search: string, keywords: string[] = []): number {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const [name = '', ...context] = keywords.map((k) => k.toLowerCase())
  if (name.startsWith(q)) return 1
  if (name.includes(q)) return 0.8
  if (context.some((k) => k.includes(q))) return 0.5
  return value.toLowerCase().includes(q) ? 0.3 : 0
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** The ⌘K palette: jump to any page or API entry, or copy an install command. */
export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCopied(null)
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Forget the last copy whenever the palette opens or closes
  const changeOpen = (next: boolean) => {
    setCopied(null)
    setOpen(next)
  }

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const copy = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(command)
      // Long enough to see the tick, then out of the way
      setTimeout(() => setOpen(false), 700)
    } catch {
      setCopied(null)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => changeOpen(true)}
        className="hidden h-8 w-56 justify-start gap-2 px-2.5 font-normal text-muted-foreground sm:inline-flex"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search docs…</span>
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </Button>
      <Button variant="ghost" size="icon" onClick={() => changeOpen(true)} className="sm:hidden" aria-label="Search docs">
        <Search />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={changeOpen}
        title="Search the docs"
        description="Jump to a page or an API entry, or copy an install command"
        className="sm:max-w-xl"
      >
        <Command filter={filter}>
          <CommandInput placeholder="Search pages, API, install…" />
          <CommandList className="max-h-[min(60vh,26rem)]">
            <CommandEmpty>Nothing matches.</CommandEmpty>

            <CommandGroup heading="Pages">
              {pages.map((p) => (
                <CommandItem key={p.to} value={`page ${p.to}`} keywords={[p.title, p.section]} onSelect={() => go(p.to)}>
                  <FileText />
                  <span>{p.title}</span>
                  <CommandShortcut className="tracking-normal">{p.section}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="API">
              {apiGroups.flatMap((g) =>
                g.entries.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`api ${e.id}`}
                    keywords={[e.name, g.title, e.kind]}
                    onSelect={() => go(apiHref(e))}
                  >
                    {e.kind === 'type' ? <Braces /> : <BookOpen />}
                    <code className="truncate font-mono text-[13px]">{e.name}</code>
                    <CommandShortcut className="tracking-normal">{g.title}</CommandShortcut>
                  </CommandItem>
                )),
              )}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Install">
              {installs.map((i) => (
                <CommandItem
                  key={i.manager}
                  value={`install ${i.manager}`}
                  keywords={[`install with ${i.manager}`, i.command, 'copy']}
                  onSelect={() => copy(i.command)}
                >
                  {copied === i.command ? <Check className="text-brand" /> : <Package />}
                  <span>Copy install with {i.manager}</span>
                  <CommandShortcut className="font-mono tracking-normal">
                    {copied === i.command ? 'Copied' : i.command}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
