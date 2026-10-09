import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { cachedHighlight, highlight, type CodeLang } from '@/lib/highlight'
import { CopyButton } from './CopyButton'

type CodeBlockProps = {
  code: string
  lang?: CodeLang
  title?: string
  className?: string
  /** Leave off the copy button, for fragments nobody would paste */
  noCopy?: boolean
}

/** Syntax highlighted code, readable as plain text until the highlighter arrives. */
export function CodeBlock({ code, lang = 'ts', title, className, noCopy }: CodeBlockProps) {
  const source = code.replace(/^\n+|\s+$/g, '')
  const [html, setHtml] = useState(() => cachedHighlight(source, lang))

  useEffect(() => {
    let live = true
    highlight(source, lang).then((h) => live && setHtml(h))
    return () => {
      live = false
    }
  }, [source, lang])

  return (
    <div
      className={cn(
        'group relative my-5 overflow-hidden rounded-xl border bg-code text-[13px] leading-relaxed',
        className,
      )}
    >
      {title && (
        <div className="flex items-center gap-2 border-b px-4 py-2 font-mono text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-brand" />
          {title}
        </div>
      )}
      {!noCopy && (
        <CopyButton
          text={source}
          className={cn(
            'absolute right-2 z-10 bg-code/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
            title ? 'top-11' : 'top-2',
          )}
        />
      )}
      {html ? (
        <div
          className="overflow-x-auto font-mono [&_pre]:px-4 [&_pre]:py-3.5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto px-4 py-3.5 font-mono">
          <code>{source}</code>
        </pre>
      )}
    </div>
  )
}
