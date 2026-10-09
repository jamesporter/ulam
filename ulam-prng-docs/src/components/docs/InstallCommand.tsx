import { useState } from 'react'
import { Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CopyButton } from './CopyButton'

const managers = {
  pnpm: 'pnpm add ulam-prng',
  npm: 'npm install ulam-prng',
  yarn: 'yarn add ulam-prng',
  bun: 'bun add ulam-prng',
} as const

type Manager = keyof typeof managers

const storageKey = 'package-manager'

function initialManager(): Manager {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored && stored in managers) return stored as Manager
  } catch {
    // Fall through to the default
  }
  return 'pnpm'
}

/** The install command for each package manager, with a copy button. */
export function InstallCommand({ className }: { className?: string }) {
  const [manager, setManager] = useState<Manager>(initialManager)

  const choose = (m: Manager) => {
    setManager(m)
    try {
      localStorage.setItem(storageKey, m)
    } catch {
      // Only a convenience
    }
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-code', className)}>
      <div className="flex items-center gap-1 border-b px-2 pt-1.5" role="tablist" aria-label="Package manager">
        <Terminal className="mx-2 size-3.5 text-muted-foreground" />
        {(Object.keys(managers) as Manager[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={manager === m}
            onClick={() => choose(m)}
            className={cn(
              '-mb-px border-b-2 px-2.5 pb-1.5 font-mono text-xs transition-colors',
              manager === m
                ? 'border-brand text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 py-2 pr-2 pl-4">
        <code className="overflow-x-auto font-mono text-sm whitespace-nowrap">
          <span className="text-brand select-none">$ </span>
          {managers[manager]}
        </code>
        <CopyButton text={managers[manager]} />
      </div>
    </div>
  )
}
