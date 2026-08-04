import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  return {
    icons: { icon: `/${username}/icon` }
  }
}

// This layout intentionally does NOT wrap children in a
// library provider. The public profile is wrapped by (profile)/layout.tsx with
// the user's library (EnvoyLibraryShell); the owner sub-routes /ui + /settings
// are wrapped by (owner)/layout.tsx with the build-time CMS library. Putting a
// provider here would cross the two paths and re-introduce the earlier library-resolution regression.
export default function UsernameLayout({ children }: { children: ReactNode }) {
  return children
}
