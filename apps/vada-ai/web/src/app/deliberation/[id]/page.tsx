import { auth } from '@atta/auth/hooks'
import { Text } from '@atta/ui'
import { redirect } from 'next/navigation'
import { getSessionWithTranscript } from '@/db/queries'
import { DeliberationFeed } from './components/DeliberationFeed'

export default async function DeliberationPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/?signin=1')

  const { id } = await params
  const session = await getSessionWithTranscript(id)

  if (!session) {
    return (
      <div className='flex min-h-dvh items-center justify-center'>
        <Text as='p' muted>
          Session not found.
        </Text>
      </div>
    )
  }

  const initialEntries = session.transcriptEntries.map((e) => ({
    agent: e.agent,
    content: e.content,
    round: e.round
  }))

  // Extract the rendered-shape conclusion from the DB row. The row holds
  // `originalJson`, `revisedJson`, and the Critic's verdicts — the UI needs
  // the inner JSON (recommendation / key_condition / unresolved_points …).
  // Prefer the revised copy when a REVISE pass ran; otherwise fall back to
  // the original. Thread the Critic's verdicts through so the panel can
  // explain WHY an UNCONVERGED conclusion was flagged — the deliberation's
  // synthesis and the audit reason are both useful, so we show both.
  const conclusionRow = session.conclusion as {
    originalJson?: Record<string, unknown> | null
    revisedJson?: Record<string, unknown> | null
    criticVerdict?: string | null
    criticReVerdict?: string | null
  } | null
  let extractedConclusion = conclusionRow ? (conclusionRow.revisedJson ?? conclusionRow.originalJson ?? null) : null

  // Rescue #1 — old engine wrote `{ raw: "...full JSON string...", error: "..." }`
  // when schema validation failed. The raw field often contains a perfectly
  // valid JSON synthesis that we can unpack and render. Try it.
  if (extractedConclusion && typeof extractedConclusion.raw === 'string' && !extractedConclusion.recommendation) {
    try {
      const parsed = JSON.parse(extractedConclusion.raw) as Record<string, unknown>
      if (parsed && typeof parsed.recommendation === 'string') {
        extractedConclusion = parsed
      }
    } catch {
      // not JSON — leave as-is; the banner will still show with the raw text
      // surfaced via _criticVerdict
    }
  }

  // Rescue #2 — pre-lenient salvage stuffed the whole raw JSON string into
  // `recommendation`, leaving key_condition / unresolved_points as placeholder
  // strings. Detect and re-parse so the real synthesis renders.
  //
  // Uses the same multi-strategy extraction as the engine so content with
  // prose-then-JSON, outer ```json wrappers, or nested ``` code fences inside
  // string values still unwraps correctly.
  const repairJson = (s: string): string =>
    s.replace(/([^\\])"(\s+)"([A-Za-z_][A-Za-z0-9_]*)"(\s*):/g, '$1", "$3"$4:').replace(/,(\s*[}\]])/g, '$1')
  const tryExtractJson = (raw: string): Record<string, unknown> | null => {
    const trimmed = raw.trim()
    const slices: string[] = []
    const outer = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(trimmed)
    if (outer?.[1]) slices.push(outer[1].trim())
    const first = trimmed.indexOf('{')
    const last = trimmed.lastIndexOf('}')
    if (first !== -1 && last > first) slices.push(trimmed.slice(first, last + 1))
    slices.push(trimmed)
    for (const s of slices) {
      for (const candidate of [s, repairJson(s)]) {
        try {
          const parsed = JSON.parse(candidate) as Record<string, unknown>
          if (parsed && typeof parsed.recommendation === 'string') return parsed
        } catch {
          // try next
        }
      }
    }
    return null
  }
  if (extractedConclusion && typeof extractedConclusion.recommendation === 'string') {
    const rec = extractedConclusion.recommendation
    if (rec.includes('{') && rec.includes('}')) {
      const parsed = tryExtractJson(rec)
      if (parsed) extractedConclusion = parsed
    }
  }

  const initialConclusion = extractedConclusion
    ? {
        ...extractedConclusion,
        _criticVerdict: conclusionRow?.criticReVerdict ?? conclusionRow?.criticVerdict ?? null
      }
    : null

  // Build the canonical model-per-role map the UI uses to render model pills
  // on every round + in the conclusion. Matches the orchestrator's resolution
  // order: session.agentModels[role] wins, otherwise session's global
  // provider/modelId applies to every agent.
  const agentModels = (session.agentModels as Record<string, { provider: string; modelId: string }> | null) ?? null
  const globalDefault =
    session.provider && session.modelId ? { provider: session.provider, modelId: session.modelId } : null
  const modelByRole: Record<string, { provider: string; modelId: string }> = {}
  for (const role of session.agents) {
    const m = agentModels?.[role] ?? globalDefault
    if (m) modelByRole[role] = m
  }

  return (
    <DeliberationFeed
      sessionId={id}
      question={session.question}
      agentRoles={session.agents}
      agentModels={agentModels ?? undefined}
      modelByRole={modelByRole}
      initialEntries={initialEntries}
      initialConclusion={initialConclusion}
      initialState={session.state}
      initialTerminalState={session.terminalState ?? null}
    />
  )
}
