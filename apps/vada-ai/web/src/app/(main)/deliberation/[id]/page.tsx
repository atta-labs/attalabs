import { loadYamlFromCatalog } from '@atta/engine'
import { CatalogProvider, getCatalog, resolveVendorByPrefix } from '@atta/models'
import { Text } from '@atta/ui/components'
import { getBenchmarkMetrics, getSessionWithTranscript } from '@/db/queries'
import { extractRenderableConclusion } from '@/engine/conclusion-rescue'
import { AGENTS } from '@/components/agents/visuals'
import type { AgentName } from '@/components/agents/visuals'
import { CouncilFeed } from './components/CouncilFeed'
import { DeliberationFeed } from './components/DeliberationFeed'

const COUNCIL_SPEC_IDS = new Set(['vada-council', 'vada-council-synthesis'])

export default async function DeliberationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionWithTranscript(id)
  const benchmark = await getBenchmarkMetrics(id)
  // Fetch the models catalog so the client tree (CouncilFeed / DeliberationFeed)
  // can resolve `modelId → registry display name` via `useCatalog()` — Council
  // columns need the canonical label ("Claude Haiku 4.5") instead of the raw
  // model id. 24h-cached at the @atta/models layer; the cost is a single
  // cache hit per page render.
  const catalog = await getCatalog()

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
  // provider/modelId applies to every agent, otherwise the spec's YAML
  // default. The spec-default lookup is the final defensive fallback — it
  // covers older sessions written before `start/route.ts` started persisting
  // resolved spec defaults into `agentModels`; new sessions hit the first
  // branch and never reach it.
  const specCtx = (() => {
    if (!session.specId) return { teamName: 'Deliberation', hasSynthesizer: false, spec: null }
    try {
      const spec = loadYamlFromCatalog(session.specId)
      const hasSynth =
        spec.rounds.some((r) => r.onFailure?.action === 'revise') ||
        (spec.rounds.length > 1 && spec.rounds[spec.rounds.length - 1]!.agents.length === 1)
      return { teamName: spec.displayName, hasSynthesizer: hasSynth, spec }
    } catch {
      return { teamName: 'Deliberation', hasSynthesizer: false, spec: null }
    }
  })()
  const { teamName, hasSynthesizer, spec } = specCtx

  // Spec-default map keyed by the same normalized role space the rest of the
  // stack uses (see `start/route.ts`). Lookup-by-role for old sessions where
  // `session.agentModels` is null.
  const specDefaultsByRole: Record<string, { provider: string; modelId: string }> = {}
  if (spec) {
    const specDefaultModel = spec.defaults?.model
    for (const agent of spec.agents) {
      const modelId = agent.model ?? specDefaultModel
      if (!modelId) continue
      const provider = resolveVendorByPrefix(modelId)
      if (!provider) continue
      const roleKey = AGENTS[agent.name as AgentName]?.role ?? agent.role ?? agent.name
      specDefaultsByRole[roleKey] = { provider, modelId }
    }
  }

  const agentModels = (session.agentModels as Record<string, { provider: string; modelId: string }> | null) ?? null
  const globalDefault =
    session.provider && session.modelId ? { provider: session.provider, modelId: session.modelId } : null
  const modelByRole: Record<string, { provider: string; modelId: string }> = {}
  for (const role of session.agents) {
    const m = agentModels?.[role] ?? globalDefault ?? specDefaultsByRole[role]
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

  // Council teams (vada-council / vada-council-synthesis) render a distinct
  // view: N parallel answer columns, no rounds, no CONCLUSION/CLEAN badges,
  // optional Council synthesis read via the locked
  // `{agreements, disagreements, bottomLine}` contract. Everything else
  // (Reviewers, Sparring, Crucible, War-Room) still routes through
  // DeliberationFeed — those rounds components are intentionally untouched.
  const isCouncil = session.specId ? COUNCIL_SPEC_IDS.has(session.specId) : false
  if (isCouncil) {
    return (
      <CatalogProvider catalog={catalog}>
        <CouncilFeed
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
      </CatalogProvider>
    )
  }

  return (
    <CatalogProvider catalog={catalog}>
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
    </CatalogProvider>
  )
}
