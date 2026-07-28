import { permanentRedirect } from 'next/navigation'

/** `/start` is a published URL retired as a content page: a reader arriving
 * at the section lands on the first thing they need. Its former conceptual
 * content (the nouns and the loop) lives at `/start/overview`. Same pattern
 * as `(site)/install/page.tsx`. */
export default function StartRedirect() {
  permanentRedirect('/start/quick')
}
