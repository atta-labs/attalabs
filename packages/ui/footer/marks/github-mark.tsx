import { siGithub } from 'simple-icons'

// lucide-react dropped brand/wordmark icons (no `Github` export) — this renders the
// official GitHub mark from simple-icons instead, componentized like every other
// mark in this directory rather than an inline <svg> at the call site.
export function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' className={className}>
      <path d={siGithub.path} />
    </svg>
  )
}
