import { getPublishedReleaseMetrics } from '@/lib/published-release-metrics'
import { LandingPage } from './_components/landing/LandingPage'

export default async function HomePage() {
  const releaseMetrics = await getPublishedReleaseMetrics()
  return <LandingPage releaseMetrics={releaseMetrics} />
}
