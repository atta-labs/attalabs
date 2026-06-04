import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@atta/ui', '@atta/cms', '@atta/db', '@atta/herald-ai-mcp'],
  images: {
    remotePatterns: [{ hostname: 'avatars.githubusercontent.com' }]
  }
}

export default nextConfig
