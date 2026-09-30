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
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
