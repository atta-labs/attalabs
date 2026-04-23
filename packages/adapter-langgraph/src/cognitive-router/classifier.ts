import Anthropic from '@anthropic-ai/sdk'
import type { Agent } from '@atta/engine'
import type { VadaGraphStateValue, ToolDecision } from '../graph-state.js'

/**
 * Creates a LangGraph node that classifies which tools a tool-enabled agent
 * actually needs for the current question, before that agent runs.
 *
 * Uses Haiku (fast + cheap) to produce a ToolDecision stored in graphState.toolDecisions
 * keyed by the agent node ID. The downstream node-executor reads this decision to
 * filter the agent's tools before the LLM call.
 *
 * Fails open: if the Haiku call fails or the JSON is malformed, all declared tools
 * are allowed with a default budget of 5.
 */
export function createClassifierNode(agentNodeId: string, agent: Agent, apiKey: string | undefined) {
  const client = new Anthropic({ apiKey })

  return async (state: VadaGraphStateValue): Promise<Partial<VadaGraphStateValue>> => {
    const toolList = agent.tools ?? []
    if (toolList.length === 0) return {}

    // Hard-rule: round-Synthesizer always gets all declared tools — no Haiku call needed.
    // Round-Synthesizers integrate claims across a full debate round; they need evidence
    // tools to verify and anchor the synthesis. Withholding tools here caused MAX_REVISIONS.
    if (agent.name.includes('Synthesizer') && !agent.name.includes('Conclusion')) {
      const decision: ToolDecision = { needs: toolList, budget: 5, reason: 'round-Synthesizer hard-rule: always tools' }
      console.info(
        `[Classifier] ${agentNodeId}: needs=[${decision.needs.join(',') || 'none'}] budget=${decision.budget} (${decision.reason})`
      )
      return { toolDecisions: { [agentNodeId]: decision } }
    }

    const prompt = `You are a tool-use classifier. The agent "${agent.name}" is about to participate in a structured deliberation.

Question under deliberation: "${state.question}"

Tools available to this agent: ${toolList.join(', ')}

Rules:
- Audit roles (BlindCritic, FactChecker, ConclusionSynthesizer): these audit already-gathered context. Return needs: [] unless the agent's role explicitly requires external verification (FactChecker usually does).
- Reasoning roles (Strategist, Critic, Devil's Advocate, round-Synthesizer): default to including all declared tools unless the question is clearly contained (e.g., asking the agent to analyze code already in context).
- When uncertain, include tools. Under-tooling causes the agent to produce unsubstantiated claims; over-tooling at worst wastes a few tokens.
- Budget default: 5 tool calls per turn. Reduce to 3 only for audit roles when tools ARE included.

Respond with JSON ONLY (no markdown, no explanation):
{"needs":["tool_name"],"budget":5,"reason":"one line"}`

    let decision: ToolDecision
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim()

      // Strip accidental markdown fences
      const rawJson = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      const parsed = JSON.parse(rawJson) as { needs?: unknown; budget?: unknown; reason?: unknown }

      decision = {
        needs: Array.isArray(parsed.needs) ? (parsed.needs as string[]).filter((t) => toolList.includes(t)) : toolList,
        budget: typeof parsed.budget === 'number' && parsed.budget > 0 ? parsed.budget : 5,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined
      }
    } catch {
      // Fail open: allow all declared tools with default budget
      decision = { needs: toolList, budget: 5 }
    }

    console.info(
      `[Classifier] ${agentNodeId}: needs=[${decision.needs.join(',') || 'none'}] budget=${decision.budget}${decision.reason ? ` (${decision.reason})` : ''}`
    )

    return {
      toolDecisions: { [agentNodeId]: decision }
    }
  }
}
