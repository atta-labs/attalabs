'use client'

// Council-only results view.
//
// SHAPE: 3 (or N) independent answers, optional synthesis. NO rounds, NO
// "CONCLUSION / CLEAN" badge vocabulary, NO ConclusionPanel — that component
// is keyed to the Reviewers `{recommendation, key_condition, unresolved_points}`
// JSON shape. Council's locked synthesis contract is
// `{ agreements, disagreements, bottomLine }`, rendered inline here.
//
// Each answer column renders an `AIASphere` with an EXPLICIT vendor color
// resolved from the configured model. Do NOT use `getAgentConfigByName` for
// Council agents (Gemini/GPT/Grok/Synthesizer) — that function returns a
// `strategist` fallback for unknown names, which produced the grey-spheres
// regression on Council. The model→vendor→color path is in
// `apps/vada-ai/web/src/components/agents/vendors.ts` (`VENDORS[v].color`).

import { findModelEntryByModelId, useCatalog, type ModelEntry, type VendorId } from '@atta/models'
import { ModelIcon } from '@atta/ui/components'
import { Card, CardContent, CardHeader } from '@atta/ui/components/card'
import { Text } from '@atta/ui/shared'
import { AIACanvas, AIASphere } from '@atta/ui/canvas'
import { useId, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TranscriptActions } from './TranscriptActions'
import { useDeliberationScene } from './useDeliberationScene'
import { useJudgeBenchmark } from './useJudgeBenchmark'
import { MARKDOWN_COMPONENTS } from './markdown-components'
import { AGENTS } from '@/components/agents/visuals'
import type { AgentName } from '@/components/agents/visuals'
import { VENDORS, inferVendor, type VendorId as LocalVendorId } from '@/components/agents/vendors'
import type { BenchmarkClientState } from './DeliberationFeed'

interface CouncilFeedProps {
  sessionId: string
  question: string
  /** Agent role names in order (Gemini, GPT, Grok, optional Synthesizer) — drives column order. */
  agentRoles: string[]
  agentModels?: Record<string, { provider: string; modelId: string }>
  modelByRole?: Record<string, { provider: string; modelId: string }>
  defaultProvider?: string | null
  defaultModelId?: string | null
  initialEntries?: Array<{ agent: string; content: string; round: number }>
  initialConclusion?: Record<string, unknown> | null
  initialState?: string
  initialTerminalState?: string | null
  benchmark?: BenchmarkClientState | null
  teamName?: string
  specId?: string
  /** True for `vada-council-synthesis`; false for plain `vada-council`. */
  hasSynthesizer?: boolean
}

const SYNTHESIZER_NAME = 'Synthesizer'

interface CouncilSynthesis {
  agreements: string[]
  disagreements: string[]
  bottomLine: string
}

/**
 * Vendor color resolution for a Council answer column.
 *
 * Source of truth: `apps/vada-ai/web/src/components/agents/vendors.ts`.
 * Path: model id (e.g. `gpt-4o`, `claude-sonnet-4-6`) → `inferVendor` →
 * `VENDORS[vendor].color` (a `var(--vendor-*)` token from globals.css).
 *
 * Falls back to `foreground` for unrecognized models so the sphere is at
 * least visible (per canvas rule #1 — explicit, visible color always).
 */
function resolveVendorColor(modelId: string | undefined | null): string {
  if (!modelId) return 'var(--foreground)'
  const vendor = inferVendor(modelId)
  if (!vendor) return 'var(--foreground)'
  return VENDORS[vendor as LocalVendorId]?.color ?? 'var(--foreground)'
}

/**
 * Resolve the registry-quality display name for a model id (e.g.
 * "Claude Haiku 4.5", "GPT-4o", "Gemini 2.5 Pro"). Uses the catalog's
 * `label` field — that's what the model registry calls its canonical name
 * (the dash-cased model id is the technical id; the label is the marketing
 * one). When the catalog has no entry — the catalog hasn't loaded yet,
 * the model is local-only, etc — we fall back to the raw model id so the
 * header is never empty.
 */
function resolveModelDisplayName(catalog: ModelEntry[], modelId: string | undefined | null): string {
  if (!modelId) return ''
  const entry = findModelEntryByModelId(catalog, modelId)
  return entry?.label ?? modelId
}

function parseCouncilSynthesis(raw: Record<string, unknown> | null): CouncilSynthesis | null {
  if (!raw) return null
  // The synthesizer is instructed to return `{agreements, disagreements, bottomLine}`.
  // Tolerate slight wrapper variations (e.g. raw stored under `recommendation`).
  const agreements = Array.isArray(raw.agreements)
    ? (raw.agreements as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  const disagreements = Array.isArray(raw.disagreements)
    ? (raw.disagreements as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  const bottomLineRaw = raw.bottomLine ?? raw.bottom_line ?? raw.bottomline ?? raw.recommendation
  const bottomLine = typeof bottomLineRaw === 'string' ? bottomLineRaw : ''
  if (agreements.length === 0 && disagreements.length === 0 && bottomLine.length === 0) return null
  return { agreements, disagreements, bottomLine }
}

interface AnswerColumnProps {
  agentName: string
  modelInfo: { provider: string; modelId: string } | undefined
  /** Catalog from `useCatalog()` — passed in so the column doesn't re-subscribe per row. */
  catalog: ModelEntry[]
  answer: string | null
  isStreaming: boolean
  isComplete: boolean
}

function AnswerColumn({ agentName, modelInfo, catalog, answer, isStreaming, isComplete }: AnswerColumnProps) {
  const sphereId = useId()
  // EXPLICIT color — see resolveVendorColor docstring. No getAgentConfigByName.
  const color = resolveVendorColor(modelInfo?.modelId)
  // Show speaking while pending OR streaming; complete once a final answer arrives.
  // (Token streaming is out of scope — adapter V2. Today we flip on completion.)
  const sphereState = isComplete ? 'complete' : 'speaking'
  const modelDisplayName = resolveModelDisplayName(catalog, modelInfo?.modelId)

  return (
    // `Card` replaces the previous hand-rolled `<article>` per RULE 1. The
    // override className tweaks default Card chrome to match the answer
    // column's softer treatment: `gap-4` (Card has no inherent gap between
    // its CardHeader and CardContent — they sit flush), `bg-card/40` for the
    // softer surface (`[background:var(--gradient-card),var(--card)]` from
    // Card's defaults is dropped by tailwind-merge when we set a `bg-*` class
    // explicitly), and `p-4 py-4` to defeat Card's mandatory `py-6` plus the
    // `CardHeader`/`CardContent` `px-6`. `as` would be ideal here for the
    // semantic `<article>` element, but Card is a plain `<div>` — accept the
    // tradeoff (the article element was decorative, not load-bearing for AT).
    <Card className='gap-4 bg-card/40 p-4 py-4'>
      <CardHeader className='flex items-center gap-3 px-0'>
        <AIASphere
          id={sphereId}
          size='sm'
          color={color}
          state={sphereState}
          showMatrix={!isComplete}
          particleCount={28}
        />
        {/* Column header shows ONLY the running model — the slot role
            (Gemini / GPT / Grok) is dropped entirely now. The model is what
            actually answers the question; the YAML slot it landed in is an
            implementation detail the user doesn't need to see on the results
            view. (The slot identity is still authoritative server-side and
            still visible in the Configure modal where the user assigns
            models to slots.)

            Type scale matches the page's other monospace labels (`Your
            Question` is `text-xs` too) — model name and meta-labels read as
            siblings rather than a hierarchy. `tracking-widest` is the single
            tracking preset used across the file. */}
        <div className='flex min-w-0 items-center gap-2'>
          {modelInfo && <ModelIcon model={modelInfo.modelId} size={14} type='avatar' />}
          <span className='truncate font-mono text-xs uppercase tracking-widest text-foreground'>
            {modelDisplayName || agentName}
          </span>
        </div>
      </CardHeader>
      <CardContent className='min-h-[160px] px-0 text-sm leading-relaxed text-foreground/90'>
        {answer ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {answer}
          </ReactMarkdown>
        ) : (
          <Text as='p' size='sm' muted className='m-0 italic'>
            {isStreaming ? 'Thinking…' : 'Waiting to answer…'}
          </Text>
        )}
        {isStreaming && !isComplete && answer && (
          <span className='ml-0.5 inline-block h-3 w-px animate-pulse bg-foreground align-middle' />
        )}
      </CardContent>
    </Card>
  )
}

interface SynthesisPanelProps {
  synthesizerModelId: string | undefined
  catalog: ModelEntry[]
  synthesis: CouncilSynthesis | null
  isPending: boolean
}

function SynthesisPanel({ synthesizerModelId, catalog, synthesis, isPending }: SynthesisPanelProps) {
  const sphereId = useId()
  const color = resolveVendorColor(synthesizerModelId)
  const sphereState = synthesis ? 'complete' : 'speaking'
  const synthesizerDisplayName = resolveModelDisplayName(catalog, synthesizerModelId)

  return (
    // `Card` replaces the previous hand-rolled `<section>` per RULE 1. The
    // override className tweaks default Card chrome: `gap-5` (matches the
    // original `flex flex-col gap-5`), `p-5 py-5` to defeat Card's
    // `py-6`/`CardHeader`/`CardContent` `px-6`, and `bg-card` is already the
    // Card default — we let the gradient overlay come through unchanged so
    // the Synthesis panel reads as a fully elevated card (the design intent
    // for the conclusion section of the page).
    <Card className='gap-5 p-5 py-5'>
      <CardHeader className='flex items-center gap-3 border-b border-border px-0 pb-3'>
        <AIASphere
          id={sphereId}
          size='sm'
          color={color}
          state={sphereState}
          showMatrix={!synthesis}
          particleCount={32}
        />
        <div className='flex min-w-0 flex-col gap-1'>
          <div className='font-serif text-lg text-foreground'>Synthesis</div>
          {synthesizerModelId && (
            // Matches the AnswerColumn header scale (text-xs + 14px
            // ModelIcon) so the synthesis model line is a sibling to the
            // answer columns above and to the "Your Question" label.
            <div className='flex items-center gap-2'>
              <ModelIcon model={synthesizerModelId} size={14} type='avatar' />
              <span className='truncate font-mono text-xs uppercase tracking-widest text-muted-foreground'>
                {synthesizerDisplayName}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className='flex flex-col gap-5 px-0'>
        {synthesis ? (
          <>
            {synthesis.agreements.length > 0 && (
              <div>
                <div className='mb-2 font-mono text-xs uppercase tracking-widest text-success'>Agree</div>
                <ul className='m-0 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/85'>
                  {synthesis.agreements.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {synthesis.disagreements.length > 0 && (
              <div className='border-t border-border pt-4'>
                <div className='mb-2 font-mono text-xs uppercase tracking-widest text-warning'>Disagree</div>
                <ul className='m-0 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/85'>
                  {synthesis.disagreements.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {synthesis.bottomLine && (
              <div className='border-t border-border pt-4'>
                <div className='mb-2 font-mono text-xs uppercase tracking-widest text-primary'>Bottom line</div>
                <Text as='p' size='md' className='m-0 leading-relaxed text-foreground/90'>
                  {synthesis.bottomLine}
                </Text>
              </div>
            )}
          </>
        ) : (
          <Text as='p' size='sm' muted className='m-0 italic'>
            {isPending ? 'Synthesizing the council…' : 'Waiting for all answers…'}
          </Text>
        )}
      </CardContent>
    </Card>
  )
}

export function CouncilFeed(props: CouncilFeedProps) {
  return (
    <AIACanvas alwaysRenderSpheres matchContentHeight>
      <CouncilScene {...props} />
    </AIACanvas>
  )
}

function CouncilScene({
  sessionId,
  question,
  agentRoles,
  agentModels,
  modelByRole = {},
  defaultProvider = null,
  defaultModelId = null,
  initialEntries = [],
  initialConclusion = null,
  initialState = 'PENDING',
  initialTerminalState = null,
  benchmark = null,
  teamName = 'Council',
  specId,
  hasSynthesizer = false
}: CouncilFeedProps) {
  const s = useDeliberationScene({
    sessionId,
    question,
    agentRoles,
    initialEntries,
    initialConclusion,
    initialState,
    initialTerminalState,
    defaultProvider: defaultProvider ?? null,
    teamName,
    specId
  })

  const catalog = useCatalog()

  // Answer-column agents are everyone except the synthesizer.
  const answerAgents = useMemo(() => agentRoles.filter((r) => r !== SYNTHESIZER_NAME), [agentRoles])

  // Latest message per agent — Council is single-pass (one answer per agent),
  // so we just pick the most recent entry by id.
  const messageByAgent = useMemo(() => {
    const map = new Map<string, (typeof s.messages)[number]>()
    for (const m of s.messages) {
      if (m.agent === SYNTHESIZER_NAME) continue
      map.set(m.agent, m)
    }
    return map
  }, [s.messages])

  const synthesis = useMemo(() => parseCouncilSynthesis(s.conclusion), [s.conclusion])
  // Same normalization the server's `start/route.ts` uses when building
  // `session.agentModels` — Synthesizer (the role agent) collapses to its
  // `role` string ("synthesizer"). The raw YAML name still works as a
  // fallback so old sessions written before the normalized server fix
  // continue to render (their `agentModels` was keyed by the raw name or
  // not set at all).
  const synthesizerRoleKey = AGENTS[SYNTHESIZER_NAME as AgentName]?.role ?? SYNTHESIZER_NAME
  const synthesizerModelId =
    modelByRole[SYNTHESIZER_NAME]?.modelId ??
    modelByRole[synthesizerRoleKey]?.modelId ??
    agentModels?.[SYNTHESIZER_NAME]?.modelId ??
    agentModels?.[synthesizerRoleKey]?.modelId

  useJudgeBenchmark({
    sessionId,
    question,
    benchmark,
    terminalReached: !!s.terminalState,
    conclusion: s.conclusion,
    defaultProvider: (defaultProvider ?? null) as VendorId | null,
    defaultModelId
  })

  return (
    <div className='mx-auto w-full max-w-5xl px-5 pb-16 pt-6'>
      {/* `Card` replaces the previous hand-rolled `<div>` per RULE 1. The
          override className tweaks default Card chrome to match the original
          tighter padding: `mb-8` for the bottom margin (sits below the page
          header, above the answer grid), `p-4 py-4` to defeat Card's `py-6`,
          and `gap-2` between the label and the question text. The label
          renders as plain `<div>` (mono micro-label, not a heading). */}
      <Card className='mb-8 gap-2 p-4 py-4'>
        <CardHeader className='px-0'>
          <div className='font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
            Your Question
          </div>
        </CardHeader>
        <CardContent className='px-0'>
          <Text as='p' size='md' className='m-0 leading-relaxed text-foreground/90'>
            {question}
          </Text>
        </CardContent>
      </Card>

      {/* Answer columns — N up. Each streams independently as its
          `agent_completed` SSE event arrives (see useDeliberation.ts). Token
          streaming is intentionally out of scope (adapter V2 work). */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {answerAgents.map((agentName) => {
          const msg = messageByAgent.get(agentName)
          const modelInfo = modelByRole[agentName] ?? agentModels?.[agentName]
          const isComplete = !!msg && msg.state === 'complete'
          const isStreaming = !isComplete && s.isLiveSession
          return (
            <AnswerColumn
              key={agentName}
              agentName={agentName}
              modelInfo={modelInfo}
              catalog={catalog}
              answer={msg?.content ?? null}
              isStreaming={isStreaming}
              isComplete={isComplete}
            />
          )
        })}
      </div>

      {/* Synthesis panel — only for vada-council-synthesis. Reads the locked
          contract `{agreements, disagreements, bottomLine}` — does NOT route
          through ConclusionPanel (which is keyed to the Reviewers shape). */}
      {hasSynthesizer && (
        <div className='mt-8'>
          <SynthesisPanel
            synthesizerModelId={synthesizerModelId}
            catalog={catalog}
            synthesis={synthesis}
            isPending={
              s.currentState === 'CONCLUDING' || s.currentState === 'AUDITING' || s.currentState === 'REVISING'
            }
          />
        </div>
      )}

      {s.showLoading && (
        <div className='mt-6 flex items-center justify-center gap-2.5 py-4 text-sm text-muted-foreground'>
          <span className='size-1.5 animate-pulse rounded-full bg-accent' />
          {s.loadingMessage}
        </div>
      )}

      {s.terminalState && (
        <TranscriptActions
          input={{
            question,
            messages: s.messages,
            terminalState: s.terminalState,
            conclusion: s.conclusion,
            modelByRole
          }}
        />
      )}

      <div ref={s.feedEndRef} />
    </div>
  )
}
