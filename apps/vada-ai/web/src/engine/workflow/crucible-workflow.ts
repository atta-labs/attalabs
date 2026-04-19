/**
 * CRUCIBLE WORKFLOW
 *
 * Flat Mastra workflow driving a full 4-agent × 3-round deliberation plus the
 * conclusion protocol (synthesize → audit → pass | revise+reaudit).
 *
 * OBSERVABILITY HAZARD: The root inputData contains apiKey. When tracing is
 * added (Step 5.5), configure the tracer to redact apiKey from step inputs.
 *
 * Flat (not nested sub-workflows) by design: getInitData() in a sub-workflow
 * step returns that sub-workflow's inputData, not the root workflow's. A flat
 * structure guarantees getInitData() always returns { sessionId, apiKey }.
 *
 * TYPE NOTE: createWorkflow() receives explicit type params and schemas cast to
 * `any`. This bypasses Mastra's PublicSchema<T> 7-way union inference which
 * causes TS2589 at 12+ steps. Step objects use plain Step<> interface types
 * (see steps.ts). Runtime behavior is identical.
 */
import { createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import {
  conclusionAuditStep,
  conclusionPassStep,
  conclusionReviseReauditStep,
  conclusionSynthesizeStep,
  makeAgentStep,
  makeFirstAgentStep,
  workflowInputSchema
} from './steps'
import type { AuditStepOutput, WorkflowInput } from './steps'

const workflowOutputSchema = z.object({ ok: z.literal(true) })

export const crucibleWorkflow = createWorkflow<'crucible', unknown, WorkflowInput, { ok: true }>({
  id: 'crucible',
  inputSchema: workflowInputSchema as typeof workflowInputSchema,
  outputSchema: workflowOutputSchema as typeof workflowOutputSchema
})
  // Round 1 — makeFirstAgentStep handles PENDING → ROUND_1 state transition
  .then(makeFirstAgentStep(1, 'strategist'))
  .then(makeAgentStep(1, 'critic'))
  .then(makeAgentStep(1, 'devils_advocate'))
  .then(makeAgentStep(1, 'synthesizer'))
  // Round 2
  .then(makeAgentStep(2, 'strategist'))
  .then(makeAgentStep(2, 'critic'))
  .then(makeAgentStep(2, 'devils_advocate'))
  .then(makeAgentStep(2, 'synthesizer'))
  // Round 3
  .then(makeAgentStep(3, 'strategist'))
  .then(makeAgentStep(3, 'critic'))
  .then(makeAgentStep(3, 'devils_advocate'))
  .then(makeAgentStep(3, 'synthesizer'))
  // Conclusion protocol
  .then(conclusionSynthesizeStep)
  .then(conclusionAuditStep)
  .branch([
    // MASTRA NOTE: .branch() runs ALL matching conditions, not just the first.
    // These conditions MUST be mutually exclusive — verified via probe-branch-api.ts.
    [async (ctx) => (ctx.inputData as AuditStepOutput).verdict === 'PASS', conclusionPassStep],
    [async (ctx) => (ctx.inputData as AuditStepOutput).verdict !== 'PASS', conclusionReviseReauditStep]
  ])
  .commit()
