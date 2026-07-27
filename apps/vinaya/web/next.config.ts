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
    // the same mechanism vada (`../yamls/**`) and herald use. `projects.md` is
    // the marker `findRepoRoot()` walks up to, so it must be present too.
    outputFileTracingIncludes: {
      '/**': ['../../../aeg-root/**', '../../../.vinaya/projects.md']
    },
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
