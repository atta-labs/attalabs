import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: 'avatars.githubusercontent.com' }]
  },
  turbopack: {
    root: path.resolve(__dirname, '../../..')
  }
}

export default nextConfig
