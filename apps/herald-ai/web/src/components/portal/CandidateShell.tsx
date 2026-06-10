'use client'

import type { UILibrary } from '@atta/ui/lib/library-loader'
import { LibraryProvider } from '@atta/ui/lib/library-provider'

export function CandidateShell({ initialLibrary, children }: { initialLibrary: UILibrary; children: React.ReactNode }) {
  return <LibraryProvider library={initialLibrary}>{children}</LibraryProvider>
}
