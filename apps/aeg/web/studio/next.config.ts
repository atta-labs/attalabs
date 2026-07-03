import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

export default async function config(): Promise<NextConfig> {
  await generateUIIndex('atta')
  const componentsRelPath = '../../../../packages/ui/generated/atta/components.ts'
  return {
    transpilePackages: ['@atta/ui', '@atta/aeg-core'],
    webpack: (config) => {
      config.resolve.alias['@atta/ui/components'] = resolve(__dirname, componentsRelPath)
      return config
    },
    turbopack: {
      root: resolve(__dirname, '../../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
