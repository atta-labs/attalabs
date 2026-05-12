import { loadYamlFromCatalog } from '@atta/engine'
import { Text } from '@atta/ui'
import { getBenchmarkMetrics, getSessionWithTranscript } from '@/db/queries'
import { extractRenderableConclusion } from '@/engine/conclusion-rescue'
import { DeliberationFeed } from './components/DeliberationFeed'

export default async function DeliberationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionWithTranscript(id)
  const benchmark = await getBenchmarkMetrics(id)

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
  const extractedConclusion = extractRenderableConclusion(conclusionRow)

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
  const { teamName, hasSynthesizer } = (() => {
    if (!session.specId) return { teamName: 'Deliberation', hasSynthesizer: false }
    try {
      const spec = loadYamlFromCatalog(session.specId)
      return { teamName: spec.displayName, hasSynthesizer: !!(spec.flow?.synthesis) }
    } catch {
      return { teamName: 'Deliberation', hasSynthesizer: false }
    }
  })()

  const agentModels = (session.agentModels as Record<string, { provider: string; modelId: string }> | null) ?? null
  const globalDefault =
    session.provider && session.modelId ? { provider: session.provider, modelId: session.modelId } : null
  const modelByRole: Record<string, { provider: string; modelId: string }> = {}
  for (const role of session.agents) {
    const m = agentModels?.[role] ?? globalDefault
    if (m) modelByRole[role] = m
  }

  // Minimal benchmark view the client needs to decide whether to fire the
  // judge call. Full row lives at /deliberation/[id]/benchmark.
  const benchmarkClient = benchmark
    ? {
        baselineAvailable: !!benchmark.baselineAnswer,
        baselineAnswer: benchmark.baselineAnswer ?? null,
        judgeAvailable: !!benchmark.judgeResponse
      }
    : null

  return (
    <DeliberationFeed
      sessionId={id}
      question={session.question}
      agentRoles={session.agents}
      agentModels={agentModels ?? undefined}
      modelByRole={modelByRole}
      defaultProvider={session.provider ?? null}
      defaultModelId={session.modelId ?? null}
      initialEntries={initialEntries}
      initialConclusion={initialConclusion}
      initialState={session.state}
      initialTerminalState={session.terminalState ?? null}
      benchmark={benchmarkClient}
      teamName={teamName}
      specId={session.specId ?? undefined}
      hasSynthesizer={hasSynthesizer}
    />
  )
}
