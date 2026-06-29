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

  // Role lookup from YAML `role` field — matches the normalization in start/route.ts.
  // Used for agents not in the AGENTS registry (e.g. Outside Read's AssumptionHunter).
  const specRoleByName: Record<string, string> = {}
  if (spec) {
    for (const a of spec.agents) {
      if (a.role) specRoleByName[a.name] = a.role
    }
  }
  const resolveRole = (name: string): string => AGENTS[name as AgentName]?.role ?? specRoleByName[name] ?? name

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
      specDefaultsByRole[resolveRole(agent.name)] = { provider, modelId }
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

  // Per-round phase title labels derived from the YAML spec round names.
  // Debate/panel round (spec.rounds[0], with optional repeats) maps to
  // transcript rounds 1..repeats. Synthesis (the non-audit middle round) maps
  // to transcript round 0. Falls back to ROUND_TITLES inside useRoundStrip.
  const phaseTitles: Record<number, string> = {}
  if (spec && spec.rounds.length > 0) {
    const debateRound = spec.rounds[0]
    if (debateRound?.name) {
      const repeats = debateRound.repeats ?? 1
      for (let i = 1; i <= repeats; i++) phaseTitles[i] = debateRound.name
    }
    // Synthesis round = first non-first round without an on_failure.action revise
    const synthRound = spec.rounds.find((r, i) => i > 0 && r.onFailure?.action !== 'revise')
    if (synthRound?.name) phaseTitles[0] = synthRound.name
  }

  // Per-round agent role arrays — drives which spheres appear in each round strip.
  // Panel/debate agents for transcript rounds 1+, synthesis agent for round 0.
  const agentsByRound: Record<number, string[]> = {}
  if (spec && spec.rounds.length > 0) {
    const debateRound = spec.rounds[0]
    const debateRoles = (debateRound?.agents ?? []).map((a) => resolveRole(a.name))
    const uniqueDebateRoles = Array.from(new Set(debateRoles))
    const repeats = debateRound?.repeats ?? 1
    for (let i = 1; i <= repeats; i++) agentsByRound[i] = uniqueDebateRoles
    const synthRound = spec.rounds.find((r, i) => i > 0 && r.onFailure?.action !== 'revise')
    if (synthRound) {
      agentsByRound[0] = Array.from(new Set((synthRound.agents ?? []).map((a) => resolveRole(a.name))))
    }
  }

  // Detect battlefield-map shape by checking any agent's output_schema for
  // the core_agreement field — the locked contract of the Outside Read synthesizer.
  const conclusionShape: 'debate' | 'battlefield-map' = spec?.agents.some((a) => {
    const schema = a.outputSchema as Record<string, unknown> | undefined
    return schema?.properties && 'core_agreement' in (schema.properties as object)
  })
    ? 'battlefield-map'
    : 'debate'

  // Map YAML agent names → visual roles for useDeliberation's agentRole resolution.
  // Same as specRoleByName; passed through to fix getAgentConfigByName fallback for
  // agents whose YAML names don't match the AGENTS registry.
  const agentRoleByName: Record<string, string> = specRoleByName

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
        phaseTitles={phaseTitles}
        agentsByRound={agentsByRound}
        conclusionShape={conclusionShape}
        agentRoleByName={agentRoleByName}
      />
    </CatalogProvider>
  )
}
