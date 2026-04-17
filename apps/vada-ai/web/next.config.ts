import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'

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
  return {
    images: {
      remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }]
    }
  }
}
