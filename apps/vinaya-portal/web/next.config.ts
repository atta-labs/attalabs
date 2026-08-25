import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

export default async function config(): Promise<NextConfig> {
  await generateUIIndex('vinayaPortal')
  const componentsRelPath = '../../../packages/ui/generated/vinayaPortal/components.ts'
  return {
    output: 'standalone',
    // /roadmap renders `roadmapMilestone.image` (a Sanity CDN asset) via
    // next/image — without this, Next refuses to optimize any remote host it
    // wasn't told about, and the image 500s the moment a milestone gets one.
    images: {
      remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }]
    },
    webpack: (config) => {
      config.resolve.alias['@atta/ui/components'] = resolve(__dirname, componentsRelPath)
      return config
    },
    // @attalabs/* packages publish raw .ts source (no build step) via their
    // `exports` field, same as the workspace-local @atta/ui above — Turbopack
    // refuses to compile .ts under node_modules unless listed here.
    transpilePackages: ['@atta/ui', '@attalabs/aeg-core', '@attalabs/aeg-forge-state', '@attalabs/vinaya-sources'],
    // The landing, /the-harness and /docs derive their content live from the
    // AEG doctrine files at request time (root layout is `force-dynamic`, the
    // house pattern). On Vercel the serverless bundle only ships what tracing
    // detects, and these reads use computed paths, so bundle them explicitly —
    // the same mechanism vada (`../yamls/**`) and herald use.
    //
    // The MARKER FILES BELONG HERE TOO, and they are the half that has broken
    // twice. `findRepoRoot()` (`src/lib/github-links.ts`) walks up from
    // `process.cwd()` for `vinaya.config.json`. The doctrine itself no longer
    // lives in this repo — attalabs carries no local `aeg-root/`; `findAegRoot()`
    // (same file) resolves the installed `@attalabs/vinaya` package's own
    // bundled `aeg-root/` via `require.resolve`, and `docs/load-aeg-docs.ts`
    // reads every `.md` under whatever directory that resolves to via computed
    // fs calls — still undetectable by tracing, just rooted in `node_modules`
    // now instead of the repo root. Ship the doctrine without the marker and
    // the read throws/comes up empty before a single doctrine file is read — a
    // 500 that only ever appears in production, on exactly the routes that
    // call it. So: changing either marker means changing this list in the same
    // commit. `src/lib/tracing-markers.test.ts` is the mechanical half of that
    // rule — it discovers the walks rather than trusting this comment.
    outputFileTracingIncludes: {
      '/**': ['../../../node_modules/@attalabs/vinaya/aeg-root/**', '../../../vinaya.config.json']
    },
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
