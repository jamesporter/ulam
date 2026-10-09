import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'

/**
 * Just enough inline markdown for API prose: `code`, **bold**, *emphasis* and
 * [links](/somewhere).
 */
export function Md({ children, noLinks }: { children: string; noLinks?: boolean }) {
  return <>{renderInline(children, noLinks)}</>
}

const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g

function renderInline(text: string, noLinks = false): ReactNode[] {
  return text.split(pattern).map((part, i) => {
    if (part.startsWith('`')) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link) {
      const [, label, href] = link
      if (noLinks) return <Fragment key={i}>{renderInline(label, true)}</Fragment>
      const className = 'font-medium text-brand underline-offset-4 hover:underline'
      return href.startsWith('/') ? (
        <Link key={i} to={href} className={className}>
          {renderInline(label)}
        </Link>
      ) : (
        <a key={i} href={href} className={className} target="_blank" rel="noreferrer">
          {renderInline(label)}
        </a>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}
