import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCopy } from '@/lib/useCopy'

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const { copied, copy } = useCopy()

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        copied && 'text-brand',
        className,
      )}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  )
}
