import type { NextConfig } from 'next'
import { resolve } from 'node:path'
import { generateUIIndex } from '@atta/ui/scripts/generate-ui'

const nextConfig = async (): Promise<NextConfig> => {
  await generateUIIndex('herald')
  const componentsRelPath = '../../../packages/ui/generated/herald/components.ts'
  return {
    images: {
      remotePatterns: [{ hostname: 'avatars.githubusercontent.com' }]
    },
    transpilePackages: [
      '@atta/ui',
      '@atta/cms',
      '@atta/db',
      '@atta/herald-ai-mcp',
      '@atta/engine',
      '@atta/adapter-langgraph'
    ],
    outputFileTracingIncludes: {
      '/**': ['./yamls/**']
    },
    webpack: (config) => {
      config.resolve.alias['@atta/ui/components'] = resolve(__dirname, componentsRelPath)
      return config
    },
    turbopack: {
      root: resolve(__dirname, '../../..'),
      resolveAlias: {
        '@atta/ui/components': componentsRelPath
      }
    }
  }
}

export default nextConfig
