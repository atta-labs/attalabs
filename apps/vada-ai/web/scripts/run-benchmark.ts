// Conditions-matrix benchmark runner — T9 (Issue #184).
//
// Executes any subset of the eight pinned benchmark conditions (A0, A1, VR-NS,
// VR-S-same, VR-S-cross, MW, FUSION-default, FUSION-native) against one
// question, and writes one benchmark_runs row per condition. Judge columns
// are left null — T10 (Issue #185) fills them in a separate pass.
//
// The per-condition input contract, judged artifact, and invocation
// parameters this script implements are pinned in
// apps/vada-ai/specs/vada-reviewers-spec.md §6a — read that before changing
// condition behavior here.
//
// Usage:
//   bun scripts/run-benchmark.ts --conditions A0,A1 --question T1
//   bun scripts/run-benchmark.ts --conditions A0,A1,VR-NS,VR-S-same,VR-S-cross,MW,FUSION-default,FUSION-native --question T1 --label dry-run --cheap
//
// Flags:
//   --conditions <csv>   required. Any of: A0,A1,VR-NS,VR-S-same,VR-S-cross,MW,FUSION-default,FUSION-native
//   --question <id|text> required. A corpus id from scripts/bench/corpus.ts, or literal question text.
//   --label <tag>        optional. Added to benchmark_runs.tags (in addition to the condition code).
//   --model <modelId>    optional. Overrides the A0/A1 primary-draft model (default: claude-sonnet-4-6, the YAML default).
//   --cheap              optional. Downgrades reviewer/panel/synthesizer models to cheap tiers — for dry runs only.

import { compileFlow, loadYamlFromCatalog } from '@atta/engine'
import { LangGraphAdapter, webSearchHandler } from '@atta/adapter-langgraph'
import { resolveVendorByPrefix } from '@atta/models'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { db } from '@/db'
import { benchmarkRuns, mcpSessions } from '@/db/schema'
import { hashQuestion } from '@/lib/question-hash'
import { corpus } from './bench/corpus'
import { mwCorpus } from './bench/mw-corpus'

// ── CLI args ─────────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

const ALL_CONDITIONS = [
  'A0',
  'A1',
  'VR-NS',
  'VR-S-same',
  'VR-S-cross',
  'MW',
  'FUSION-default',
  'FUSION-native'
] as const
type Condition = (typeof ALL_CONDITIONS)[number]

const conditionsArg = getArg('conditions')
if (!conditionsArg) {
  console.error(`--conditions is required. One or more of: ${ALL_CONDITIONS.join(', ')}`)
  process.exit(1)
}
const requestedConditions = conditionsArg.split(',').map((c) => c.trim()) as Condition[]
for (const c of requestedConditions) {
  if (!ALL_CONDITIONS.includes(c)) {
    console.error(`Unknown condition '${c}'. Valid: ${ALL_CONDITIONS.join(', ')}`)
    process.exit(1)
  }
}

const questionArg = getArg('question')
if (!questionArg) {
  console.error('--question is required (a corpus id from scripts/bench/corpus.ts, or literal question text)')
  process.exit(1)
}
const corpusMatch = corpus.find((q) => q.id === questionArg)
const question = corpusMatch ?? { id: `adhoc-${hashQuestion(questionArg).slice(0, 8)}`, text: questionArg }

const batchLabel = getArg('label')
const primaryModel = getArg('model') ?? 'claude-sonnet-4-6'
const cheap = hasFlag('cheap')

// ── Keys ─────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const XAI_API_KEY = process.env.XAI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const providerKeys = {
  ...(ANTHROPIC_API_KEY ? { anthropic: ANTHROPIC_API_KEY } : {}),
  ...(GOOGLE_API_KEY ? { google: GOOGLE_API_KEY } : {}),
  ...(OPENAI_API_KEY ? { openai: OPENAI_API_KEY } : {}),
  ...(XAI_API_KEY ? { xai: XAI_API_KEY } : {}),
  ...(OPENROUTER_API_KEY ? { openrouter: OPENROUTER_API_KEY } : {})
}

console.info('API keys:')
console.info(`  anthropic:  ${ANTHROPIC_API_KEY ? 'set' : 'MISSING'}`)
console.info(`  google:     ${GOOGLE_API_KEY ? 'set' : 'MISSING'}`)
console.info(`  openai:     ${OPENAI_API_KEY ? 'set' : 'MISSING'}`)
console.info(`  xai:        ${XAI_API_KEY ? 'set' : 'MISSING'}`)
console.info(`  openrouter: ${OPENROUTER_API_KEY ? 'set' : 'MISSING'}`)

// ── Pricing (USD per million tokens) ────────────────────────────────────────
// Mirrors packages/adapter-langgraph/src/adapter.ts's internal (unexported)
// table — that table is never returned to callers (see §6a "Part 3" / PR body
// design notes), so every caller in this codebase keeps its own copy
// (apps/vada-ai/mcp-server/src/tools/{deliberate,consult}.ts do the same).
// Unknown models silently skip cost tracking rather than erroring.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'claude-haiku-4-5': { input: 0.8, output: 4.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'grok-2': { input: 2.0, output: 10.0 },
  'grok-3': { input: 3.0, output: 15.0 }
}

function costFor(model: string, tokensInput: number, tokensOutput: number): number | null {
  const p = PRICING[model]
  if (!p) return null
  return (tokensInput * p.input + tokensOutput * p.output) / 1_000_000
}

// ── Condition result shape ──────────────────────────────────────────────────

interface ConditionResult {
  response: string
  transcript: unknown
  terminalState: string
  tokensInput: number
  tokensOutput: number
  elapsedMs: number
  costUsd: number | null
}

function artifactText(conclusion: { content: string; structured?: unknown }): string {
  return conclusion.structured ? JSON.stringify(conclusion.structured, null, 2) : conclusion.content
}

function costFromTranscript(transcript: { model: string; tokensInput: number; tokensOutput: number }[]): number | null {
  let total = 0
  let anyKnown = false
  for (const o of transcript) {
    const c = costFor(o.model, o.tokensInput, o.tokensOutput)
    if (c != null) {
      anyKnown = true
      total += c
    }
  }
  return anyKnown ? total : null
}

// ── Reviewer-condition cheap-tier overrides (dry runs only) ─────────────────

const CHEAP_REVIEWER_OVERRIDES: Record<string, string> = {
  Gemini: 'gemini-2.5-flash-lite',
  GPT: 'gpt-5-mini',
  Grok: 'grok-3',
  AssumptionHunter: 'claude-haiku-4-5-20251001',
  BaseRate: 'gemini-2.5-flash-lite',
  FailureMode: 'gpt-5-mini',
  SecondOrder: 'grok-3',
  BattlefieldSynthesizer: 'claude-haiku-4-5-20251001'
}

// ── A0 / A1 (no draft dependency) ───────────────────────────────────────────

async function runSolo(yamlId: 'a0-baseline' | 'a1-baseline'): Promise<ConditionResult> {
  const flow = loadYamlFromCatalog(yamlId)
  const plan = compileFlow(flow, question.text, primaryModel)
  const adapter = new LangGraphAdapter({ apiKey: ANTHROPIC_API_KEY })
  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 300_000 })
  return {
    response: artifactText(conclusion),
    transcript: conclusion.transcript,
    terminalState: conclusion.terminalState,
    tokensInput: conclusion.totalTokensInput,
    tokensOutput: conclusion.totalTokensOutput,
    elapsedMs: conclusion.totalElapsedMs,
    costUsd: costFromTranscript(conclusion.transcript)
  }
}

// ── Shared reviewer input (draft is computed once per question, reused by
//    every VR-* condition — §6a "common input contract" / §11 identical-input
//    constraint) ────────────────────────────────────────────────────────────

let cachedDraft: { structured: unknown; result: ConditionResult } | undefined

async function getPrimaryDraft(): Promise<{ structured: unknown; result: ConditionResult }> {
  if (cachedDraft) return cachedDraft
  const flow = loadYamlFromCatalog('a1-baseline')
  const plan = compileFlow(flow, question.text, primaryModel)
  const adapter = new LangGraphAdapter({ apiKey: ANTHROPIC_API_KEY })
  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 300_000 })
  cachedDraft = {
    structured: conclusion.structured,
    result: {
      response: artifactText(conclusion),
      transcript: conclusion.transcript,
      terminalState: conclusion.terminalState,
      tokensInput: conclusion.totalTokensInput,
      tokensOutput: conclusion.totalTokensOutput,
      elapsedMs: conclusion.totalElapsedMs,
      costUsd: costFromTranscript(conclusion.transcript)
    }
  }
  return cachedDraft
}

function buildReviewBrief(draftStructured: unknown): string {
  return [
    '## Question',
    question.text,
    '',
    "## Primary AI's draft answer",
    JSON.stringify(draftStructured, null, 2),
    '',
    '## Your task',
    'You are one of several independent reviewers examining the draft above. Critique it per your system prompt instructions.'
  ].join('\n')
}

async function runReviewRound(
  yamlId: 'vada-reviewers' | 'vada-reviewers-synthesis',
  brief: string,
  reviewerConfig: Record<string, string> | undefined
): Promise<{ conclusion: Awaited<ReturnType<LangGraphAdapter['execute']>> }> {
  const flow = loadYamlFromCatalog(yamlId)
  const plan = compileFlow(flow, brief)
  const adapter = new LangGraphAdapter({
    providerKeys,
    reviewerConfig,
    customTools: { web_search: webSearchHandler }
  })
  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 1_200_000 })
  return { conclusion }
}

// ── VR-NS: reviewers, no synthesizer round in the YAML — the "primary AI's
//    conversational synthesis" named in §5.2/brief §6 is reconstructed here as
//    a harness-only follow-up call (same pattern bench/runner.ts and
//    bench/judge-brokered.ts already use for baseline/judge calls — no
//    engine/adapter/YAML change). ───────────────────────────────────────────

async function runVrNs(): Promise<ConditionResult> {
  const draft = await getPrimaryDraft()
  const brief = buildReviewBrief(draft.structured)
  const reviewerConfig = cheap
    ? {
        Gemini: CHEAP_REVIEWER_OVERRIDES.Gemini,
        GPT: CHEAP_REVIEWER_OVERRIDES.GPT,
        Grok: CHEAP_REVIEWER_OVERRIDES.Grok
      }
    : undefined
  const { conclusion } = await runReviewRound('vada-reviewers', brief, reviewerConfig)

  const reviewerBlock = conclusion.transcript
    .map((o) => `[${o.agentName}]\n${o.error ? `(no response — ${o.error})` : o.content}`)
    .join('\n\n---\n\n')

  const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY })
  const synthStart = Date.now()
  const synthResult = await generateText({
    model: anthropic(primaryModel),
    system:
      "You are the primary AI assistant. You previously drafted an answer to the user's question. Independent reviewers then critiqued your draft. Write your final answer to the user: a conversational synthesis that integrates the reviewers' critiques where they strengthen your answer, and explains where you disagree and why. This is not a structured report — respond the way you would actually reply to the user in conversation.",
    prompt: `## Question\n${question.text}\n\n## Your draft\n${JSON.stringify(draft.structured, null, 2)}\n\n## Independent reviewer critiques\n${reviewerBlock}\n\nWrite your final conversational answer to the user now.`
  })
  const synthElapsedMs = Date.now() - synthStart
  const synthTokensIn = synthResult.usage.inputTokens ?? 0
  const synthTokensOut = synthResult.usage.outputTokens ?? 0
  const synthCost = costFor(primaryModel, synthTokensIn, synthTokensOut)

  const reviewCost = costFromTranscript(conclusion.transcript)

  return {
    response: synthResult.text,
    transcript: [
      ...conclusion.transcript,
      {
        agentName: 'ConversationalSynthesis',
        model: primaryModel,
        content: synthResult.text,
        tokensInput: synthTokensIn,
        tokensOutput: synthTokensOut,
        elapsedMs: synthElapsedMs
      }
    ],
    terminalState: conclusion.terminalState,
    tokensInput: conclusion.totalTokensInput + synthTokensIn,
    tokensOutput: conclusion.totalTokensOutput + synthTokensOut,
    elapsedMs: conclusion.totalElapsedMs + synthElapsedMs,
    costUsd: reviewCost == null && synthCost == null ? null : (reviewCost ?? 0) + (synthCost ?? 0)
  }
}

// ── VR-S-same / VR-S-cross: same YAML (vada-reviewers-synthesis), the
//    Synthesizer's model is the only thing that differs — an invocation-time
//    reviewerConfig override, zero YAML edits (§11). VR-S-same needs no
//    override at all: the YAML's own Synthesizer default (claude-sonnet-4-6)
//    already matches "primary AI's vendor's flagship" for our Claude primary.
// ─────────────────────────────────────────────────────────────────────────

async function runVrSynthesis(cross: boolean): Promise<ConditionResult> {
  const draft = await getPrimaryDraft()
  const brief = buildReviewBrief(draft.structured)

  const reviewerConfig: Record<string, string> = cheap
    ? {
        Gemini: CHEAP_REVIEWER_OVERRIDES.Gemini,
        GPT: CHEAP_REVIEWER_OVERRIDES.GPT,
        Grok: CHEAP_REVIEWER_OVERRIDES.Grok
      }
    : {}

  if (cross) {
    const primaryVendor = resolveVendorByPrefix(primaryModel)
    const crossModel =
      primaryVendor === 'anthropic'
        ? cheap
          ? 'gpt-5-mini'
          : 'gpt-5'
        : cheap
          ? 'claude-haiku-4-5-20251001'
          : 'claude-opus-4-7'
    reviewerConfig.Synthesizer = crossModel
  } else if (cheap) {
    reviewerConfig.Synthesizer = 'claude-haiku-4-5-20251001'
  }

  const { conclusion } = await runReviewRound(
    'vada-reviewers-synthesis',
    brief,
    Object.keys(reviewerConfig).length > 0 ? reviewerConfig : undefined
  )

  return {
    response: artifactText(conclusion),
    transcript: conclusion.transcript,
    terminalState: conclusion.terminalState,
    tokensInput: conclusion.totalTokensInput,
    tokensOutput: conclusion.totalTokensOutput,
    elapsedMs: conclusion.totalElapsedMs,
    costUsd: costFromTranscript(conclusion.transcript)
  }
}

// ── FUSION-default: opaque single-agent OpenRouter Fusion call ─────────────

async function runFusionDefault(): Promise<ConditionResult> {
  const flow = loadYamlFromCatalog('vada-fusion')
  const plan = compileFlow(flow, question.text)
  const adapter = new LangGraphAdapter({ providerKeys: { openrouter: OPENROUTER_API_KEY } })
  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 300_000 })
  return {
    response: artifactText(conclusion),
    transcript: conclusion.transcript,
    terminalState: conclusion.terminalState,
    tokensInput: conclusion.totalTokensInput,
    tokensOutput: conclusion.totalTokensOutput,
    elapsedMs: conclusion.totalElapsedMs,
    costUsd: null // openrouter/fusion is an opaque multi-model route — no fixed per-token price to attribute
  }
}

// ── FUSION-native: Outside Read engine (4-agent panel → battlefield map → audit) ──

async function runFusionNative(): Promise<ConditionResult> {
  const flow = loadYamlFromCatalog('vada-fusion-native')
  const plan = compileFlow(flow, question.text)
  const reviewerConfig = cheap
    ? {
        AssumptionHunter: CHEAP_REVIEWER_OVERRIDES.AssumptionHunter,
        BaseRate: CHEAP_REVIEWER_OVERRIDES.BaseRate,
        FailureMode: CHEAP_REVIEWER_OVERRIDES.FailureMode,
        SecondOrder: CHEAP_REVIEWER_OVERRIDES.SecondOrder,
        BattlefieldSynthesizer: CHEAP_REVIEWER_OVERRIDES.BattlefieldSynthesizer
      }
    : undefined
  const adapter = new LangGraphAdapter({
    providerKeys,
    reviewerConfig,
    customTools: { web_search: webSearchHandler }
  })
  const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 1_200_000 })
  return {
    response: artifactText(conclusion),
    transcript: conclusion.transcript,
    terminalState: conclusion.terminalState,
    tokensInput: conclusion.totalTokensInput,
    tokensOutput: conclusion.totalTokensOutput,
    elapsedMs: conclusion.totalElapsedMs,
    costUsd: costFromTranscript(conclusion.transcript)
  }
}

// ── MW: historical corpus lookup, no LLM call ───────────────────────────────

function runMw(): ConditionResult & { found: boolean } {
  const entry = mwCorpus[question.id]
  if (!entry) {
    return {
      found: false,
      response: `(no historical manual-workflow response recorded for question '${question.id}' — see scripts/bench/mw-corpus.ts)`,
      transcript: null,
      terminalState: 'ABSENT',
      tokensInput: 0,
      tokensOutput: 0,
      elapsedMs: 0,
      costUsd: null
    }
  }
  return {
    found: true,
    response: entry.response,
    transcript: { source: entry.source },
    terminalState: 'HISTORICAL',
    tokensInput: 0,
    tokensOutput: 0,
    elapsedMs: 0,
    costUsd: null
  }
}

// ── Key guards — return a skip reason, or null if the condition can run ────

function keyGuard(condition: Condition): string | null {
  switch (condition) {
    case 'MW':
      return null
    case 'FUSION-default':
      return OPENROUTER_API_KEY ? null : 'OPENROUTER_API_KEY not set'
    case 'VR-S-cross': {
      if (!ANTHROPIC_API_KEY) return 'ANTHROPIC_API_KEY not set'
      const primaryVendor = resolveVendorByPrefix(primaryModel)
      if (primaryVendor === 'anthropic')
        return OPENAI_API_KEY ? null : 'OPENAI_API_KEY not set (needed for cross-vendor GPT synthesizer)'
      return ANTHROPIC_API_KEY ? null : 'ANTHROPIC_API_KEY not set (needed for cross-vendor Claude Opus synthesizer)'
    }
    default:
      return ANTHROPIC_API_KEY ? null : 'ANTHROPIC_API_KEY not set'
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────

async function persist(code: Condition, result: ConditionResult, extraTags: string[] = []): Promise<string> {
  const [session] = await db
    .insert(mcpSessions)
    .values({
      toolName: 'benchmark-harness',
      prompt: question.text,
      response: result.response,
      terminalState: result.terminalState,
      transcript: result.transcript ?? null,
      costUsd: result.costUsd != null ? result.costUsd.toFixed(6) : null,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      durationMs: Math.round(result.elapsedMs),
      sessionTitle: `${code} — ${question.id}`,
      origin: 'benchmark-harness'
    })
    .returning({ id: mcpSessions.id })
  if (!session) throw new Error('mcpSessions insert returned no row')

  await db.insert(benchmarkRuns).values({
    sessionType: 'benchmark-harness',
    sessionId: session.id,
    questionHash: hashQuestion(question.text),
    runLabel: code,
    tags: [code, ...(batchLabel ? [batchLabel] : []), ...extraTags]
  })

  return session.id
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function runCondition(code: Condition): Promise<ConditionResult & { found?: boolean }> {
  switch (code) {
    case 'A0':
      return runSolo('a0-baseline')
    case 'A1': {
      const draft = await getPrimaryDraft()
      return draft.result
    }
    case 'VR-NS':
      return runVrNs()
    case 'VR-S-same':
      return runVrSynthesis(false)
    case 'VR-S-cross':
      return runVrSynthesis(true)
    case 'FUSION-default':
      return runFusionDefault()
    case 'FUSION-native':
      return runFusionNative()
    case 'MW':
      return runMw()
  }
}

async function main() {
  console.info(`\nQuestion: [${question.id}] ${question.text.slice(0, 100)}${question.text.length > 100 ? '…' : ''}`)
  console.info(`Conditions: ${requestedConditions.join(', ')}`)
  console.info(`Primary model: ${primaryModel}${cheap ? ' (cheap-tier reviewer overrides active)' : ''}\n`)

  const summary: {
    code: Condition
    status: string
    tokensIn?: number
    tokensOut?: number
    elapsedMs?: number
    costUsd?: number | null
  }[] = []

  for (const code of requestedConditions) {
    const skipReason = keyGuard(code)
    if (skipReason) {
      console.info(`[${code}] SKIPPED — ${skipReason}`)
      summary.push({ code, status: `skipped (${skipReason})` })
      continue
    }

    console.info(`[${code}] running...`)
    const start = Date.now()
    try {
      const result = await runCondition(code)
      const wallMs = Date.now() - start
      const extraTags = 'found' in result ? [result.found ? 'mw-present' : 'mw-absent'] : []
      const sessionId = await persist(code, result, extraTags)
      console.info(
        `[${code}] done — terminalState=${result.terminalState} tokens=${result.tokensInput}in/${result.tokensOutput}out elapsedMs=${Math.round(result.elapsedMs)} cost=${result.costUsd != null ? `$${result.costUsd.toFixed(4)}` : 'n/a'} wallMs=${wallMs} session=${sessionId}`
      )
      summary.push({
        code,
        status: 'ok',
        tokensIn: result.tokensInput,
        tokensOut: result.tokensOutput,
        elapsedMs: result.elapsedMs,
        costUsd: result.costUsd
      })
    } catch (err) {
      console.error(`[${code}] FAILED — ${err instanceof Error ? err.message : String(err)}`)
      summary.push({ code, status: 'failed' })
    }
  }

  console.info('\n── Run summary ──────────────────────────────────────────')
  for (const s of summary) {
    console.info(
      `  ${s.code.padEnd(14)} ${s.status}${s.status === 'ok' ? ` — ${s.tokensIn}in/${s.tokensOut}out, ${Math.round(s.elapsedMs ?? 0)}ms, ${s.costUsd != null ? `$${s.costUsd.toFixed(4)}` : 'cost n/a'}` : ''}`
    )
  }
  const totalCost = summary.reduce((sum, s) => sum + (s.costUsd ?? 0), 0)
  console.info(`  total estimated cost: $${totalCost.toFixed(4)}`)
}

await main()
