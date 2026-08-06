import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'
import { resolve } from 'node:path'

// BYOK architecture: browser calls providers directly (see /trust).
// If a Content-Security-Policy is ever added to this app, `connect-src` MUST
// allow these hosts or the deliberation loop will break silently:
//   https://api.anthropic.com
//   https://api.openai.com
//   https://generativelanguage.googleapis.com
//   https://api.groq.com
//   https://openrouter.ai
// The /trust page documents the user-facing contract these calls implement.

export default async function config(): Promise<NextConfig> {
  await generateUIIndex('vada')
  const componentsRelPath = '../../../packages/ui/generated/vada/components.ts'
  return {
    images: {
      remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }]
    },
    transpilePackages: ['@atta/ui', '@atta/adapter-langgraph', '@atta/engine'],
    // listPublicSpecs() (`@atta/engine`'s catalog-loader.ts) reads this
    // directory with readdirSync at runtime. Vercel's tracer cannot detect a
    // dynamically-joined path, so it must be declared here explicitly.
    // Moving/renaming the catalog without updating this entry returns
    // vada.attalabs.dev to a production-only 500 on every catalog-backed
    // route (/teams, /deliberate, /deliberation/[id], api/deliberation/*).
    outputFileTracingIncludes: {
      '/**': ['../../../packages/agents/vada-deliberation/yamls/**']
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
