# ulam-prng docs

The documentation site for [ulam-prng](https://www.npmjs.com/package/ulam-prng):
Vite, React, Tailwind CSS v4, shadcn/ui and React Router, with syntax
highlighting by Shiki.

Every example and visualisation runs against the library's **source** in
`../src`, through a Vite alias (`ulam-prng` → `../src/index.ts`), so the docs
always show the code as it is on this branch — no build or publish needed.

This folder is entirely separate from the package: it is not in the package's
`files`, has its own dependencies and lockfile, and is excluded from the root
lint and format checks.

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # type checks, then builds to dist/
pnpm preview  # serve the build
pnpm lint
```

## Layout

- `src/content/` — the words: `api.ts` documents every export once, and both
  the guides and the API reference page render from it; `distributions.ts`
  holds each distribution's parameters, exact density and moments;
  `releases.ts` is the release history; `nav.ts` the sidebar.
- `src/pages/` — one file per route, loaded lazily.
- `src/components/viz/` — the interactive demos.
- `src/components/docs/` — code blocks, install command, API entries, prose.
- `src/components/ui/` — shadcn/ui components (`pnpm dlx shadcn@latest add …`).

When the library gains a method, add it to `src/content/api.ts` (with the
release it arrived in) and it appears in the API reference straight away. A new
release gets an entry at the top of `src/content/releases.ts`; the version in
the header is read from the library's `package.json` at build time.

## Deploying

The site uses browser history routing, so the host needs to serve
`index.html` for unknown paths (on GitHub Pages, copy `dist/index.html` to
`dist/404.html`). To serve from a subpath, set `DOCS_BASE`:

```sh
DOCS_BASE=/ulam/ pnpm build
```
