import { useState } from 'react'

const words = [
  'sunflower', 'tide', 'ember', 'lattice', 'fern', 'quartz', 'harbour', 'meadow', 'comet', 'saffron',
  'pebble', 'aurora', 'thistle', 'cinder', 'orchard', 'nebula', 'kestrel', 'marble', 'drizzle', 'coral',
]

/** A seed as typed: all digits is a number, anything else a string. */
export type Seed = number | string

export function parseSeed(text: string): Seed {
  return /^\d{1,9}$/.test(text.trim()) ? Number(text.trim()) : text
}

export function seedLiteral(seed: Seed): string {
  return typeof seed === 'number' ? String(seed) : JSON.stringify(seed)
}

export function useSeed(initial: Seed = 'sunflower') {
  const [text, setText] = useState(String(initial))
  const seed = parseSeed(text)
  const reroll = () => {
    let next = text
    while (next === text) next = words[Math.floor(Math.random() * words.length)]
    setText(next)
  }
  return { text, setText, seed, reroll }
}
