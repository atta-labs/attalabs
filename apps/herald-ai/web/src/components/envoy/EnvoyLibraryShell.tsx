'use client'

import type { UILibrary } from '@atta/ui/lib/library-loader'
import { LibraryProvider } from '@atta/ui/lib/library-provider'
import { PreviewThemeListener } from '@atta/ui/lib/preview-theme-listener'
import { useState } from 'react'

export function EnvoyLibraryShell({
  initialLibrary,
  children
}: {
  initialLibrary: UILibrary
  children: React.ReactNode
}) {
  const [library, setLibrary] = useState<UILibrary>(initialLibrary)

  return (
    <>
      <PreviewThemeListener onLibraryChange={(lib) => setLibrary(lib as UILibrary)} />
      <LibraryProvider library={library}>{children}</LibraryProvider>
    </>
  )
}
