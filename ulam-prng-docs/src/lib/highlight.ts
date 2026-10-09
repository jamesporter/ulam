import type { HighlighterCore } from 'shiki/core'

export type CodeLang = 'ts' | 'bash'

let highlighter: Promise<HighlighterCore> | undefined

/** One highlighter for the whole site, loaded on first use with only what it needs. */
function getHighlighter() {
  highlighter ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
    ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [import('@shikijs/themes/rose-pine-dawn'), import('@shikijs/themes/rose-pine-moon')],
        langs: [import('@shikijs/langs/typescript'), import('@shikijs/langs/shellscript')],
        engine: createJavaScriptRegexEngine(),
      }),
  )
  return highlighter
}

const langIds: Record<CodeLang, string> = {
  ts: 'typescript',
  bash: 'shellscript',
}

const cache = new Map<string, string>()

export function cachedHighlight(code: string, lang: CodeLang): string | undefined {
  return cache.get(`${lang}\0${code}`)
}

export async function highlight(code: string, lang: CodeLang): Promise<string> {
  const key = `${lang}\0${code}`
  const hit = cache.get(key)
  if (hit) return hit
  const h = await getHighlighter()
  const html = h.codeToHtml(code, {
    lang: langIds[lang],
    themes: { light: 'rose-pine-dawn', dark: 'rose-pine-moon' },
    defaultColor: 'light',
  })
  cache.set(key, html)
  return html
}
