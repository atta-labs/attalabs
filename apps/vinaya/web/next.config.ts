import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

export default async function config(): Promise<NextConfig> {
  await generateUIIndex('vinaya')
  const componentsRelPath = '../../../packages/ui/generated/vinaya/components.ts'
  return {
    webpack: (config) => {
      config.resolve.alias['@atta/ui/components'] = resolve(__dirname, componentsRelPath)
      return config
    },
    transpilePackages: ['@atta/ui'],
    // The landing, /the-harness and /docs derive their content live from the
    // AEG doctrine files at request time (root layout is `force-dynamic`, the
    // house pattern). On Vercel the serverless bundle only ships what tracing
    // detects, and these reads use computed paths, so bundle them explicitly —
    // the same mechanism vada (`../yamls/**`) and herald use.
    //
    // The MARKER FILES BELONG HERE TOO, and they are the half that has broken
    // twice. Neither loader is handed a root: `findRepoRoot()`
    // (`src/lib/github-links.ts`) walks up from `process.cwd()` for
    // `vinaya.config.json`, and `read-root.ts` walks up for
    // `.vinaya/projects.md`. Ship the doctrine without the marker and the walk
    // throws before a single doctrine file is read — a 500 that only ever
    // appears in production, on exactly the routes that call it. So: changing
    // either marker constant means changing this list in the same commit.
    outputFileTracingIncludes: {
      '/**': ['../../../aeg-root/**', '../../../vinaya.config.json', '../../../.vinaya/projects.md']
    },
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
