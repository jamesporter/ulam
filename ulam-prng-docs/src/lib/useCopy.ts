import { useEffect, useState } from 'react'

/** Copies text to the clipboard, and remembers for a moment that it did. */
export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), timeout)
    return () => clearTimeout(t)
  }, [copied, timeout])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return { copied, copy }
}
