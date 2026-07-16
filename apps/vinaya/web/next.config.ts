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
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}
