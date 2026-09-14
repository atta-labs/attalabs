import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import { resolveRepo } from '@attalabs/aeg-forge-state'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { forgeProjectSegment } from '@/app/studio/_lib/tranche-href'
import { listProjectViews } from '@/lib/repo-state'
import { withDefaultBoardEntry } from '@/lib/repo-state/default-board-slug'
import { StudioShell } from './_components/StudioShell'
import type { StudioProjectLink, StudioRepoFooter } from './_components/StudioSidebar'

export const metadata: Metadata = {
  title: 'Vinaya Studio',
  description: 'Local governance studio for Vinaya artifacts.'
}

const execFileAsync = promisify(execFile)
const requireFromHere = createRequire(import.meta.url)

// Same process-lifetime caching discipline as `resolveRepo` itself (below):
// a deterministic outcome (a real branch name, or a definitively-detached
// HEAD) is worth caching; a spawn failure is transient and retried instead.
let cachedBranch: string | null | undefined

async function resolveBranch(): Promise<string | null> {
  if (cachedBranch !== undefined) return cachedBranch
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 5000 })
    const branch = stdout.trim()
    cachedBranch = branch && branch !== 'HEAD' ? branch : null
  } catch {
    return null
  }
  return cachedBranch
}

function resolveInstalledVinayaVersion(): string {
  try {
    return (requireFromHere('@attalabs/vinaya/package.json') as { version: string }).version
  } catch {
    return 'unknown'
  }
}

async function resolveFooter(): Promise<StudioRepoFooter> {
  const [repo, branch] = await Promise.all([resolveRepo(), resolveBranch()])
  return {
    repoLabel: repo ? `${repo.owner}/${repo.repo}` : null,
    branch,
    vinayaVersion: resolveInstalledVinayaVersion()
  }
}

async function resolveProjectLinks(): Promise<StudioProjectLink[]> {
  const listing = await listProjectViews()
  if (listing.registryPresent) {
    return listing.projects.map((p) => ({ segment: p.name, href: `/studio/projects/${p.name}`, label: p.name }))
  }
  return withDefaultBoardEntry(listing.projects).map((p) => {
    const segment = forgeProjectSegment(p.name)
    return { segment, href: `/studio/projects/${segment}`, label: 'label' in p ? p.label : p.name }
  })
}

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const [{ branding }, projectLinks, footer] = await Promise.all([
    getProductCms('vinayaStudio'),
    resolveProjectLinks(),
    resolveFooter()
  ])
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <>
      <TopBar
        logo={
          <NextLink href='/studio' variant='unstyled' className='flex items-center gap-2'>
            <Logo dark={logoUrl ?? undefined} alt='Vinaya Studio' size='h-10' text={['Vinaya', 'Studio']} />
          </NextLink>
        }
        withAuth={false}
      />
      <StudioShell projectLinks={projectLinks} footer={footer}>
        {children}
      </StudioShell>
    </>
  )
}
