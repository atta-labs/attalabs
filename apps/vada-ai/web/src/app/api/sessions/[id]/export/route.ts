import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionWithTranscriptForUser } from '@/db/queries'

function formatConclusion(session: {
  question: string
  conclusion: {
    originalJson: unknown
    revisedJson: unknown
    terminalState: string
    criticVerdict: string
  } | null
}): string {
  if (!session.conclusion) return 'No conclusion available.'

  const c = session.conclusion
  const json = (c.terminalState === 'REVISED' && c.revisedJson ? c.revisedJson : c.originalJson) as Record<
    string,
    unknown
  >

  const lines: string[] = []
  lines.push('DELIBERATION CONCLUSION')
  lines.push(`Status: ${c.terminalState}`)
  lines.push('')
  lines.push(`Question: ${session.question}`)
  lines.push('')
  lines.push(`Recommendation: ${json.recommendation ?? 'N/A'}`)
  lines.push('')
  lines.push(`Key Condition: ${json.key_condition ?? 'N/A'}`)
  lines.push('')

  const unresolved = json.unresolved_points as Array<{ point: string; agents_involved: string[] }> | undefined
  if (unresolved?.length) {
    lines.push('Unresolved Points:')
    for (const p of unresolved) {
      lines.push(`  - ${p.point} (${p.agents_involved.join(', ')})`)
    }
    lines.push('')
  }

  if (json.review_by) {
    lines.push(`Review By: ${json.review_by}`)
  }

  return lines.join('\n')
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await getOrCreateUser(clerkId, '')
  const { id } = await params
  const session = await getSessionWithTranscriptForUser(id, user.id)

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  const text = formatConclusion(session)

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  })
}
