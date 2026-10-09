import { cn } from '@/lib/utils'

/** A handful of well spaced dots, in the brand gradient. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-g)" />
      <g fill="white">
        <circle cx="9" cy="9.5" r="2.6" />
        <circle cx="20.5" cy="7.5" r="1.7" />
        <circle cx="15" cy="16" r="2.2" />
        <circle cx="24" cy="17" r="2.4" />
        <circle cx="8" cy="22" r="1.8" />
        <circle cx="17.5" cy="25" r="1.5" />
      </g>
    </svg>
  )
}
