import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

// Vinaya has no Sanity project of its own yet — borrows Atta's config/branding/library,
// same precedent as apps/aeg/web/studio (also 'atta'). See apps/vinaya/specs/vinaya-spec.md.
export default async function config(): Promise<NextConfig> {
  await generateUIIndex('atta')
  const componentsRelPath = '../../../packages/ui/generated/atta/components.ts'
  return {
    webpack: (config) => {
      config.resolve.alias['@atta/ui/components'] = resolve(__dirname, componentsRelPath)
      return config
    },
    transpilePackages: ['@atta/ui'],
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
