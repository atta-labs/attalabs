import { LandingPage } from '@/components/portal/LandingPage'

// Always-public landing page — signed-in or signed-out. Same as
// (marketing)/page.tsx; reverts the signed-in redirect added in #487.
export default function HomePublicPage() {
  return <LandingPage />
}
