import { permanentRedirect } from 'next/navigation'

export default function DocsRedirect() {
  permanentRedirect('/docs/reference')
}
