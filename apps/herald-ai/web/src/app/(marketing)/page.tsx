import { LandingPage } from '@/components/portal/LandingPage'

// Always-public landing page — signed-in or signed-out. Reverts the
// signed-in redirect added in #487: the home page should render regardless
// of auth state, matching /home's original intent.
export default function HomePage() {
  return <LandingPage />
}
