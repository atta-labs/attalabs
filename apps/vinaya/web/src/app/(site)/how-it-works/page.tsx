import { permanentRedirect } from 'next/navigation'

// The methodology page was renamed to "The Harness" and moved to `/the-harness`
// (D-127). This permanent (308) redirect preserves external inbound links to the
// old `/how-it-works` URL; in-app links point at `/the-harness` directly. Mirrors
// the `/studio/docs` → `/docs` redirect shape (#587). The page had no sub-paths,
// so a single stub covers every inbound URL.
export default function HowItWorksRedirect() {
  permanentRedirect('/the-harness')
}
