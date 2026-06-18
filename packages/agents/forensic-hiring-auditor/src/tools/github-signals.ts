export type RawSignal = {
  type: 'architecture' | 'data' | 'infra' | 'ai' | 'unknown'
  evidence: string
  source: { repo: string; file?: string; isPrivate: boolean }
  confidence: 'high' | 'medium' | 'low'
}

type GitHubRepo = {
  full_name: string
  name: string
  private: boolean
  pushed_at: string
  default_branch: string
  owner: { login: string; type: string }
}

type GitHubCommit = {
  sha: string
  commit: { message: string }
  files?: { filename: string }[]
}

type GitHubSearchItem = {
  title: string
  body: string | null
  html_url: string
}

type GitHubContentItem = {
  name: string
  type: string
}

const STRUCTURAL_PATTERNS: Record<string, { type: RawSignal['type']; label: string }> = {
  'turbo.json': { type: 'architecture', label: 'Turborepo monorepo configuration' },
  'pnpm-workspace.yaml': { type: 'architecture', label: 'pnpm workspace configuration' },
  'biome.json': { type: 'infra', label: 'Biome formatter/linter configuration' },
  '.eslintrc.js': { type: 'infra', label: 'ESLint configuration' },
  'drizzle.config.ts': { type: 'data', label: 'Drizzle ORM configuration' },
  'sanity.config.ts': { type: 'data', label: 'Sanity CMS configuration' },
  'docker-compose.yml': { type: 'infra', label: 'Docker Compose configuration' },
  'wrangler.toml': { type: 'infra', label: 'Cloudflare Workers configuration' }
}

const DEP_PATTERNS: Record<string, { type: RawSignal['type']; label: string }> = {
  next: { type: 'architecture', label: 'Next.js framework' },
  zod: { type: 'data', label: 'Zod schema validation' },
  '@radix-ui': { type: 'architecture', label: 'Radix UI headless primitives' },
  'drizzle-orm': { type: 'data', label: 'Drizzle ORM' },
  '@anthropic-ai/sdk': { type: 'ai', label: 'Anthropic Claude SDK' },
  '@ai-sdk': { type: 'ai', label: 'Vercel AI SDK' },
  openai: { type: 'ai', label: 'OpenAI SDK' },
  wagmi: { type: 'infra', label: 'Wagmi Web3 toolkit' },
  ethers: { type: 'infra', label: 'Ethers.js Web3 library' },
  '@sanity/client': { type: 'data', label: 'Sanity CMS client' },
  '@clerk/nextjs': { type: 'infra', label: 'Clerk authentication' },
  '@upstash/ratelimit': { type: 'infra', label: 'Upstash rate limiting' },
  tailwindcss: { type: 'architecture', label: 'Tailwind CSS' },
  'framer-motion': { type: 'architecture', label: 'Framer Motion animation' }
}

async function githubFetch<T>(path: string, token: string): Promise<T | null> {
  const url = path.startsWith('https://') ? path : `https://api.github.com${path}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  if (!res.ok) return null
  return res.json() as Promise<T>
}

async function getRecentRepos(username: string, token: string): Promise<GitHubRepo[]> {
  const [userRepos, allRepos] = await Promise.all([
    githubFetch<GitHubRepo[]>(`/users/${username}/repos?sort=pushed&per_page=10&type=owner`, token),
    githubFetch<GitHubRepo[]>('/user/repos?sort=pushed&per_page=20&affiliation=owner,organization_member', token)
  ])

  const seen = new Set<string>()
  const merged: GitHubRepo[] = []

  for (const repo of [...(allRepos ?? []), ...(userRepos ?? [])]) {
    if (seen.has(repo.full_name)) continue
    seen.add(repo.full_name)
    const isOwnedByUser = repo.owner.login.toLowerCase() === username.toLowerCase()
    const isOrgRepo = repo.owner.type === 'Organization'
    if (isOwnedByUser || isOrgRepo) {
      merged.push(repo)
    }
  }

  const top5 = merged.sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()).slice(0, 5)

  console.info('[Herald] GitHub repos fetched:', {
    userRepos: (userRepos ?? []).map((r) => `${r.full_name} (${r.private ? 'private' : 'public'})`),
    authenticatedRepos: (allRepos ?? []).length,
    merged: merged.length,
    selected: top5.map((r) => `${r.full_name} (${r.private ? 'private' : 'public'}, pushed: ${r.pushed_at})`)
  })

  return top5
}

async function getAuthorCommits(
  owner: string,
  repo: string,
  author: string,
  token: string
): Promise<{ count: number; paths: Set<string>; messages: string[] }> {
  let commits = await githubFetch<GitHubCommit[]>(`/repos/${owner}/${repo}/commits?author=${author}&per_page=30`, token)

  if (!commits || commits.length === 0) {
    const emails = await githubFetch<{ email: string }[]>('/user/emails', token)
    const primaryEmail = emails?.find((e) => e.email)?.email
    if (primaryEmail) {
      commits = await githubFetch<GitHubCommit[]>(
        `/repos/${owner}/${repo}/commits?author=${encodeURIComponent(primaryEmail)}&per_page=30`,
        token
      )
    }
  }
  if (!commits) return { count: 0, paths: new Set(), messages: [] }

  const paths = new Set<string>()
  const messages: string[] = []

  for (const c of commits) {
    messages.push(c.commit.message.split('\n')[0] ?? '')
    if (c.files) {
      for (const f of c.files) {
        const dir = f.filename.split('/').slice(0, 2).join('/')
        paths.add(dir)
      }
    }
  }

  return { count: commits.length, paths, messages }
}

async function getAuthorPRs(
  owner: string,
  repo: string,
  author: string,
  token: string
): Promise<{ count: number; titles: string[] }> {
  const result = await githubFetch<{ items: GitHubSearchItem[] }>(
    `https://api.github.com/search/issues?q=type:pr+author:${author}+repo:${owner}/${repo}&per_page=10`,
    token
  )
  if (!result) return { count: 0, titles: [] }

  return {
    count: result.items.length,
    titles: result.items.map((pr) => pr.title)
  }
}

async function getRepoRoot(owner: string, repo: string, token: string): Promise<string[]> {
  const contents = await githubFetch<GitHubContentItem[]>(`/repos/${owner}/${repo}/contents`, token)
  if (!contents) return []
  return contents.map((c) => c.name)
}

async function getPackageJsonDeps(owner: string, repo: string, token: string): Promise<string[]> {
  const res = await githubFetch<{ content: string }>(`/repos/${owner}/${repo}/contents/package.json`, token)
  if (!res?.content) return []

  try {
    const decoded = Buffer.from(res.content, 'base64').toString('utf-8')
    const pkg = JSON.parse(decoded)
    return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]
  } catch {
    return []
  }
}

async function extractSignalsFromRepo(repo: GitHubRepo, username: string, token: string): Promise<RawSignal[]> {
  const signals: RawSignal[] = []
  const owner = repo.owner.login
  const name = repo.name
  const source = { repo: repo.full_name, isPrivate: repo.private }

  const [commitData, prData, rootFiles, deps] = await Promise.all([
    getAuthorCommits(owner, name, username, token),
    getAuthorPRs(owner, name, username, token),
    getRepoRoot(owner, name, token),
    getPackageJsonDeps(owner, name, token)
  ])

  console.info(`[Herald] Scanning ${repo.full_name}:`, {
    commits: commitData.count,
    prs: prData.count,
    rootFiles: rootFiles.slice(0, 10),
    depsFound: deps.length
  })

  if (commitData.count > 0) {
    const paths = [...commitData.paths].filter(Boolean).slice(0, 5)
    const pathSuffix = paths.length > 0 ? ` across ${paths.join(', ')}` : ''
    signals.push({
      type: 'unknown',
      evidence: `Confirmed: Authored ${commitData.count} commits${pathSuffix}`,
      source,
      confidence: commitData.count >= 10 ? 'high' : 'medium'
    })
  }

  if (prData.count > 0) {
    signals.push({
      type: 'unknown',
      evidence: `Confirmed: Authored ${prData.count} pull requests including "${prData.titles[0]}"`,
      source,
      confidence: prData.count >= 5 ? 'high' : 'medium'
    })
  }

  for (const file of rootFiles) {
    const pattern = STRUCTURAL_PATTERNS[file]
    if (pattern) {
      signals.push({
        type: pattern.type,
        evidence: `Detected: ${pattern.label} (${file})`,
        source: { ...source, file },
        confidence: 'high'
      })
    }
  }

  for (const dep of deps) {
    for (const [pattern, meta] of Object.entries(DEP_PATTERNS)) {
      if (dep === pattern || dep.startsWith(pattern)) {
        signals.push({
          type: meta.type,
          evidence: `Observed: ${meta.label} in dependencies (${dep})`,
          source: { ...source, file: 'package.json' },
          confidence: 'high'
        })
        break
      }
    }
  }

  return signals
}

export async function extractSignals(username: string, token: string): Promise<RawSignal[]> {
  const repos = await getRecentRepos(username, token)
  if (repos.length === 0) return []

  const results = await Promise.all(repos.map((repo) => extractSignalsFromRepo(repo, username, token)))
  const all = results.flat()

  console.info('[Herald] Final signals:', {
    total: all.length,
    byType: {
      architecture: all.filter((s) => s.type === 'architecture').length,
      data: all.filter((s) => s.type === 'data').length,
      infra: all.filter((s) => s.type === 'infra').length,
      ai: all.filter((s) => s.type === 'ai').length,
      unknown: all.filter((s) => s.type === 'unknown').length
    },
    signals: all.map((s) => `[${s.type}] ${s.evidence} (${s.source.repo})`)
  })

  return all
}

// Per-tool-call budget for GitHub signal fetching. Kept at the same 3s as the
// retired deterministic pre-fetch so worst-case latency for the GitHub leg is
// unchanged.
export const GITHUB_SIGNAL_TIMEOUT_MS = 3000

export async function fetchGithubSignalsForHandle(handle: string): Promise<string[]> {
  const token = process.env.GITHUB_PAT
  if (!token || !handle) return []

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), GITHUB_SIGNAL_TIMEOUT_MS)

    const signals = await Promise.race([
      extractSignals(handle, token),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('Signal fetch timeout')))
      })
    ])

    clearTimeout(timer)
    return signals.map((s) => s.evidence)
  } catch {
    console.warn('[Herald] GitHub signal tool timed out or failed, returning empty evidence')
    return []
  }
}

export async function githubSignalToolHandler(args: Record<string, unknown>): Promise<string[]> {
  const raw = args.github_handle
  const handle = typeof raw === 'string' ? raw.trim() : ''
  return fetchGithubSignalsForHandle(handle)
}
