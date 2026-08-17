import { redirect } from 'next/navigation'

// This app serves `/studio/**` and nothing else — send the bare root there
// rather than 404ing on the first thing a developer tries.
export default function RootIndex() {
  redirect('/studio')
}
