import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

export default async function config(): Promise<NextConfig> {
  await generateUIIndex('attalabs')
  const componentsRelPath = '../../../packages/ui/generated/attalabs/components.ts'
  return {
    images: {
      remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }]
    },
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
