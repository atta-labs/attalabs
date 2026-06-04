import type { NextConfig } from 'next'
import path from 'node:path'
import { existsSync } from 'node:fs'

// Walk up from the current file's directory to find the monorepo root —
// the directory that contains both turbo.json and node_modules. This is
// needed so Turbopack's root includes node_modules in both the main repo
// and git worktrees (where __dirname resolves to the worktree path, putting
// the shared node_modules outside the default 3-level-up root).
function findMonorepoRoot(start: string): string {
  let dir = start
  let best = start
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'turbo.json')) && existsSync(path.join(dir, 'node_modules'))) {
      best = dir // keep walking — outermost match wins
    }
    dir = path.dirname(dir)
  }
  return best
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: 'avatars.githubusercontent.com' }]
  },
  turbopack: {
    root: findMonorepoRoot(__dirname)
  }
}

export default nextConfig
