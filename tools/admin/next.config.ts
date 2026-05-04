import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  transpilePackages: ['@atta/ui', '@atta/cms'],
  turbopack: {
    root: path.resolve(__dirname, '../..')
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }]
  }
}

export default nextConfig
