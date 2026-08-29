import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

export default async function config(): Promise<NextConfig> {
  await generateUIIndex('vinayaStudio')
  const componentsRelPath = '../../../packages/ui/generated/vinayaStudio/components.ts'
  return {
    output: 'standalone',
    webpack: (config) => {
      config.resolve.alias['@atta/ui/components'] = resolve(__dirname, componentsRelPath)
      return config
    },
    // @attalabs/* packages publish raw .ts source (no build step) via their
    // `exports` field, same as the workspace-local @atta/ui above — Turbopack
    // refuses to compile .ts under node_modules unless listed here.
    // `@attalabs/vinaya-sources` is deliberately absent: Studio has zero
    // imports of it (unlike `apps/vinaya-portal/web`).
    transpilePackages: ['@atta/ui', '@attalabs/aeg-core', '@attalabs/aeg-forge-state'],
    // Studio never deploys to Vercel, so `findAegRoot()`'s upward walk
    // (`src/lib/repo-state/read-root.ts`) needs no tracing help — it runs
    // against the real filesystem in every environment this app runs in
    // directly (`next dev`, a local `next build && next start`).
    //
    // BUT `output: 'standalone'` above still runs Next's static-import file
    // tracer regardless of deploy target — `vinaya-studio-artifact.yml`
    // builds this exact standalone output and ships it inside the published
    // `@attalabs/vinaya` npm package (`studio-standalone/`) for every
    // adopter's `vinaya studio`. `api/coherence/route.ts` spawns
    // `node_modules/@attalabs/aeg-core/bin/verify-coherence.ts` as a raw
    // subprocess path (`execFile`), never a static `import` — invisible to
    // the tracer, so the shipped standalone bundle silently omits it even
    // though `@attalabs/aeg-core` is a real `dependencies` entry above and
    // resolves fine under `next dev`. Found live: `vinaya studio` on a fresh
    // adopter install threw "Module not found" on that exact path; this repo
    // never caught it locally because dev/build-from-source always has the
    // real node_modules tree, only the traced/shipped bundle doesn't.
    outputFileTracingIncludes: {
      '/api/coherence': ['../../../node_modules/@attalabs/aeg-core/bin/verify-coherence.ts']
    },
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
