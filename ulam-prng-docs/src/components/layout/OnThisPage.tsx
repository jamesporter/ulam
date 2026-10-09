import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { cn } from '@/lib/utils'

type Heading = { id: string; text: string; level: number }

/** A table of contents built from the article's headings, tracking the one in view. */
export function OnThisPage() {
  const { pathname } = useLocation()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState<string>()

  useEffect(() => {
    let observer: IntersectionObserver | undefined
    // Wait a frame so the new page's headings are in the document
    const raf = requestAnimationFrame(() => {
      const article = document.querySelector('[data-article]')
      if (!article) return
      const found = [...article.querySelectorAll<HTMLElement>('h2[id], h3[id][data-toc]')].map((h) => ({
        id: h.id,
        text: h.dataset.tocLabel ?? h.textContent ?? '',
        level: h.tagName === 'H2' ? 2 : 3,
      }))
      setHeadings(found)

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          if (visible[0]) setActive(visible[0].target.id)
        },
        { rootMargin: '-80px 0px -65% 0px' },
      )
      for (const h of found) {
        const el = document.getElementById(h.id)
        if (el) observer.observe(el)
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [pathname])

  if (headings.length < 2) return null

  return (
    <div className="text-sm">
      <h4 className="mb-2 font-sans text-xs font-semibold tracking-wide text-muted-foreground uppercase">On this page</h4>
      <ul className="space-y-1 border-l">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                '-ml-px block border-l py-0.5 transition-colors',
                h.level === 3 ? 'pl-6 font-mono text-xs' : 'pl-3',
                active === h.id
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
