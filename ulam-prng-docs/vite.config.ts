import { readFileSync } from 'node:fs'
import path from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The docs run against the library's own source rather than a published
// build, so every example and visualisation reflects the code in ../src.
const librarySource = path.resolve(import.meta.dirname, '../src/index.ts')
const libraryVersion: string = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '../package.json'), 'utf8'),
).version

// https://vite.dev/config/
export default defineConfig({
  base: process.env.DOCS_BASE ?? '/',
  define: {
    __LIBRARY_VERSION__: JSON.stringify(libraryVersion),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'ulam-prng': librarySource,
    },
  },
  server: {
    fs: { allow: ['..'] },
  },
})
