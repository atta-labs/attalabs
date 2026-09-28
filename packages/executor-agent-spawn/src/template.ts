/**
 * @file template.ts
 * @description Renders an agent-spawn node's `promptTemplate` (Handlebars)
 * against a minimal context. `deriveTemplateState` in `@atta/engine` is not
 * reused here — it's shaped for rounds-shaped ExecutionState (round index,
 * audit outputs, revision cycles), none of which an agent-lifecycle Plan has.
 */

import Handlebars from 'handlebars'
import type { PlanAgentSpawnNode } from '@atta/engine'
import type { StepNodeResult } from './types'

/** Handlebars context available to an agent-spawn node's prompt template. */
export interface StepTemplateContext {
  /** The question the Plan was compiled for. */
  question: string
  /**
   * Prior nodes' results in this run, keyed by node id — agent-spawn and
   * mechanical alike.
   *
   * These are the *narrowed* results the graph recorded, not an executor's
   * verbatim capture: a template interpolating a prior node's `stdout` or
   * `events` renders a redacted, bounded form of it. That is deliberate and is
   * what makes a rendered prompt identical across a halt and resume — the state
   * a resumed leg reads is the state the uninterrupted run read. It does not
   * make the text trusted: it is still an external process's output rendered
   * with `noEscape`, so the prompt-injection caution on interpolating a prior
   * result stands unchanged.
   */
  results: Record<string, StepNodeResult>
}

/**
 * Compiles and renders `node.promptTemplate`. Throws with the node id on
 * failure — never silently falls back to the raw template string.
 */
export function renderStepPrompt(node: PlanAgentSpawnNode, context: StepTemplateContext): string {
  try {
    const compiled = Handlebars.compile(node.promptTemplate, { noEscape: true })
    return compiled(context)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Prompt template rendering failed for node '${node.id}': ${message}`)
  }
}
