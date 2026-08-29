import type { Metadata } from 'next'
import { findAegRoot, listTranches, readRegistry } from '@/lib/repo-state'
import { TranchesTabs } from './TranchesTabs'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tranches · Vinaya Studio'
}

export default async function TranchesPage() {
  const [{ active, archived, forge }, registry] = await Promise.all([listTranches(), readRegistry()])
  // Registered project names — a board link resolves only to one of these
  // (`readProject` 404s on a retired name like `aeg`); passed to the client
  // tabs so `trancheHref` skips unregistered projects. `registryPresent` is
  // passed alongside since an EMPTY registry (present, zero rows) and an
  // ABSENT one both produce an empty `registeredProjects` array but must
  // resolve `trancheHref` differently (#811) — the array alone can't tell
  // them apart.
  const registryPresent = findAegRoot() !== null
  const registeredProjects = registry.map((p) => p.name)

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Tranches</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          All tranches across every project — active from open GitHub Milestones, archived from closed ones (plus a
          small, closed legacy set carried over from before this repo's forge-derived migration).
        </p>
      </header>

      <TranchesTabs
        active={active}
        archived={archived}
        forge={forge}
        registeredProjects={registeredProjects}
        registryPresent={registryPresent}
      />
    </div>
  )
}
