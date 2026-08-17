import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

export default async function config(): Promise<NextConfig> {
  await generateUIIndex('vinaya')
  const componentsRelPath = '../../../packages/ui/generated/vinaya/components.ts'
  return {
    output: 'standalone',
    webpack: (config) => {
      config.resolve.alias['@atta/ui/components'] = resolve(__dirname, componentsRelPath)
      return config
    },
    transpilePackages: ['@atta/ui'],
    // Studio is local-only and never deploys to Vercel (this task's Boundary:
    // no ProductSwitch, no isVercelDeploy gating — the app simply is not
    // deployed), so unlike `apps/vinaya/web`'s and `apps/vinaya-portal/web`'s
    // `next.config.ts`, there is deliberately no `outputFileTracingIncludes`
    // here: that setting exists solely to keep Vercel's serverless bundle from
    // silently dropping a computed-path read (`aeg-root/**`, `.vinaya/projects.md`)
    // that a `force-dynamic` route needs at request time. With no serverless
    // deploy target, `findAegRoot()`'s upward walk (`src/lib/repo-state/read-root.ts`)
    // just runs against the real filesystem, in every environment this app
    // actually runs in (`next dev`, a local `next build && next start`).
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
