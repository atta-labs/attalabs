'use client'

// This component is superseded by DeliberationFeed.tsx.
// Kept to avoid breaking imports until page.tsx is updated in the next commit.

interface DeliberationViewProps {
  sessionId: string
  question?: string
  initialEntries?: Array<{ agent: string; content: string; round: number }>
  initialConclusion?: Record<string, unknown> | null
  initialState?: string
  agentRoles?: string[]
}

export function DeliberationView(_props: DeliberationViewProps) {
  return null
}
