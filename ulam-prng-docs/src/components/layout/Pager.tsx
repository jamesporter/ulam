import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { sequence } from '@/content/nav'

export function Pager() {
  const { pathname } = useLocation()
  const i = sequence.findIndex((s) => s.to === pathname)
  if (i === -1) return null
  const prev = sequence[i - 1]
  const next = sequence[i + 1]

  return (
    <nav className="mt-16 grid grid-cols-2 gap-4 border-t pt-8">
      {prev ? (
        <Link to={prev.to} className="group rounded-xl border p-4 transition-colors hover:border-brand/50 hover:bg-accent/40">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" /> Previous
          </div>
          <div className="mt-1 font-medium">{prev.title}</div>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={next.to} className="group rounded-xl border p-4 text-right transition-colors hover:border-brand/50 hover:bg-accent/40">
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            Next <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="mt-1 font-medium">{next.title}</div>
        </Link>
      )}
    </nav>
  )
}
