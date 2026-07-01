import type { NextConfig } from 'next'
import { resolve } from 'node:path'

const config: NextConfig = {
  transpilePackages: ['@atta/ui', '@atta/aeg-core'],
  turbopack: {
    root: resolve(__dirname, '../../../..')
  }
}

export default config
