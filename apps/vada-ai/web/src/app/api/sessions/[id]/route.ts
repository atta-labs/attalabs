import { auth } from '@atta/auth/hooks'
import { getSessionWithTranscript } from '@/db/queries'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionWithTranscript(id)

  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 })
  }

  // Build the conclusion in the shape ConclusionPanel expects.
  // The DB row has: originalJson, revisedJson, terminalState, criticVerdict, etc.
  // Drizzle returns camelCase. But we also handle snake_case just in case.
  let conclusion: Record<string, unknown> | null = null

  if (session.conclusion) {
    const raw = session.conclusion as Record<string, unknown>
    const terminalState = (raw.terminalState ?? raw.terminal_state) as string | undefined

    // The conclusion JSON might be stored at different keys depending on Drizzle config:
    //   Drizzle camelCase: raw.originalJson, raw.revisedJson
    //   Or snake_case:     raw.original_json, raw.revised_json
    //   Or the conclusion might already be flattened with raw.recommendation at top level
    const originalJson = (raw.originalJson ?? raw.original_json) as Record<string, unknown> | null | undefined
    const revisedJson = (raw.revisedJson ?? raw.revised_json) as Record<string, unknown> | null | undefined

    if (raw.recommendation) {
      // Already flattened — use directly
      conclusion = raw
    } else if (terminalState === 'REVISED' && revisedJson) {
      conclusion = revisedJson
    } else if (originalJson) {
      conclusion = originalJson
    }

    console.info('📋 Session conclusion extraction:', {
      terminalState,
      hasOriginalJson: !!originalJson,
      hasRevisedJson: !!revisedJson,
      hasTopLevelRecommendation: !!raw.recommendation,
      extractedConclusion: conclusion ? 'yes' : 'null',
      rawKeys: Object.keys(raw)
    })
  }

  return Response.json({
    id: session.id,
    question: session.question,
    agents: session.agents,
    state: session.state,
    terminalState: session.terminalState,
    conclusion,
    transcriptEntries: session.transcriptEntries.map((e) => ({
      agent: e.agent,
      content: e.content,
      round: e.round
    }))
  })
}
