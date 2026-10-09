import { ArrowDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { RNG } from 'ulam-prng'
import { CopyButton } from '@/components/docs/CopyButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Demo, SeedControl } from './controls'
import { useSeed } from './seed'

const preview = (rng: RNG, n = 4) => Array.from({ length: n }, () => rng.number().toFixed(6))

export function SerialiseDemo() {
  const { text, setText, seed, reroll } = useSeed('sunflower')
  const [drawn, setDrawn] = useState(3)
  const [pasted, setPasted] = useState<string | null>(null)

  const rng = new RNG(seed)
  const history = Array.from({ length: drawn }, () => rng.number().toFixed(6))
  const serialised = rng.toJSON()
  const next = preview(rng)

  const restoreFrom = pasted ?? serialised
  let restored: string[] | null = null
  let error: string | null = null
  try {
    restored = preview(RNG.fromJSON(restoreFrom))
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <Demo
      title="Save, restore, carry on"
      caption="Draw some numbers, then serialise. The restored generator continues with exactly the numbers the original would have drawn next."
      controls={<SeedControl text={text} setText={setText} reroll={reroll} className="sm:col-span-2" />}
    >
      <div className="space-y-4 p-5 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-muted-foreground">drawn</span>
          {history.map((h, i) => (
            <span key={i} className="rounded bg-muted px-2 py-1 tabular-nums">
              {h}
            </span>
          ))}
          <Button size="xs" variant="outline" onClick={() => setDrawn((d) => Math.min(d + 1, 12))}>
            <Plus /> draw
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setDrawn(0)}>
            reset
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-code py-1 pr-1 pl-3">
          <span className="text-muted-foreground">rng.toJSON() →</span>
          <span className="flex-1 truncate text-brand">{JSON.stringify(serialised)}</span>
          <CopyButton text={serialised} />
        </div>

        <ArrowDown className="mx-auto size-4 text-muted-foreground" />

        <div className="space-y-2">
          <label className="block text-muted-foreground">
            RNG.fromJSON(<span className="text-foreground">…</span>) — paste a string, or leave it to follow along
          </label>
          <Input
            value={pasted ?? serialised}
            onChange={(e) => setPasted(e.target.value)}
            className="font-mono text-xs"
            spellCheck={false}
            aria-label="Serialised generator"
          />
          {pasted !== null && (
            <Button size="xs" variant="ghost" onClick={() => setPasted(null)}>
              follow the original again
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-muted-foreground">original carries on</p>
            <div className="flex flex-wrap gap-1.5">
              {next.map((n, i) => (
                <span key={i} className="rounded bg-brand/12 px-2 py-1 text-brand tabular-nums">
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-muted-foreground">restored carries on</p>
            {error ? (
              <p className="text-destructive">Error: {error}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {restored!.map((n, i) => (
                  <span
                    key={i}
                    className={n === next[i] ? 'rounded bg-brand-2/15 px-2 py-1 text-brand-2 tabular-nums' : 'rounded bg-muted px-2 py-1 tabular-nums'}
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Demo>
  )
}
