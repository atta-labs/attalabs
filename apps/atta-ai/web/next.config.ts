import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
import type { NextConfig } from 'next'

export default async function config(): Promise<NextConfig> {
  await generateUIIndex('atta')
  return {
    images: {
      remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }]
    }
  }
}
