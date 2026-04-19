// Step 4a verification — full Crucible deliberation through Mastra /agent/* routes
//
// Drives a complete 4-agent × 3-round deliberation + conclusion against the
// running dev server (http://localhost:3000). Agent turns go through the new
// /api/deliberation/{id}/agent/{role} Mastra routes. Conclusion phases call
// Anthropic directly with the full prompts composed by the orchestrator.
//
// Usage (from apps/vada-ai/web/):
//   bun run scripts/test-full-deliberation.ts
//
// Requires:
//   - Dev server running (bun run dev:vada)
//   - ANTHROPIC_API_KEY and CLERK_SECRET_KEY in apps/vada-ai/web/.env.local
//   - CLERK_SESSION_ID in .env.local or passed as env var

import { config } from 'dotenv'

config({ path: '.env.local' })

const BASE_URL = process.env.VADA_BASE_URL ?? 'http://localhost:3000'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const CLERK_SESSION_ID = process.env.CLERK_SESSION_ID ?? 'sess_3CSsNVZgk2K5KBYx0eZDqALfkBA'

const PROVIDER = 'anthropic'
const MODEL_ID = 'claude-sonnet-4-6'

const QUESTION =
  'Should we migrate our monolith to microservices over the next 12 months, ' +
  'given that we have a 6-person engineering team and 50k MAU?'

// Crucible agents in canonical order — must match @atta/agents teams.ts
const CRUCIBLE_AGENTS = ['Strategist', 'Critic', "Devil's Advocate", 'Synthesizer']

const AGENT_SLUG: Record<string, string> = {
  Strategist: 'strategist',
  Critic: 'critic',
  "Devil's Advocate": 'devils-advocate',
  Synthesizer: 'synthesizer',
  Researcher: 'researcher',
  Operator: 'operator'
}

// ── Clerk token ───────────────────────────────────────────────────────────────

async function getClerkToken(): Promise<string> {
  if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY not set')
  const res = await fetch(`https://api.clerk.com/v1/sessions/${CLERK_SESSION_ID}/tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`Clerk token fetch failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { token: string }
  return data.token
}

// ── Anthropic direct call (conclusion phases only) ────────────────────────────

async function callAnthropic(
  modelId: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>
    usage: { input_tokens: number; output_tokens: number }
  }
  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return { text, inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

const hr = (char = '─', len = 70) => char.repeat(len)

function printTurn(label: string, text: string, inputTokens: unknown, outputTokens: unknown, elapsedMs: number) {
  console.log(hr())
  console.log(label)
  console.log(hr('·'))
  console.log(`Output: ${text.slice(0, 200)}${text.length > 200 ? '…' : ''}`)
  console.log(`Tokens: ${inputTokens ?? '?'} in / ${outputTokens ?? '?'} out  |  Wall: ${elapsedMs}ms`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not found in .env.local')
  if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY not found in .env.local')

  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('  Vāda Step 4a — Full Crucible Deliberation Verification')
  console.log('══════════════════════════════════════════════════════════════════════')
  console.log(`\nTeam:     ${CRUCIBLE_AGENTS.join(', ')}`)
  console.log(`Model:    ${PROVIDER}/${MODEL_ID}`)
  console.log(`Question: ${QUESTION}\n`)

  console.log('Fetching Clerk session token...')
  const token = await getClerkToken()
  const auth: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  console.log('✓ Token obtained\n')

  // 1. Create session — agents default to Crucible (DEFAULT_ROOM) when not specified
  console.log('Creating deliberation session...')
  const startRes = await fetch(`${BASE_URL}/api/deliberation/start`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ question: QUESTION, provider: PROVIDER, modelId: MODEL_ID })
  })
  if (!startRes.ok) throw new Error(`Session creation failed: ${startRes.status} ${await startRes.text()}`)
  const { session_id: sessionId } = (await startRes.json()) as { session_id: string }
  console.log(`✓ Session: ${sessionId}`)
  console.log(`  URL: ${BASE_URL}/deliberation/${sessionId}\n`)

  let agentTurnCount = 0
  let conclusionPhaseCount = 0

  // 2. Drive loop
  for (let iter = 0; iter < 60; iter++) {
    const nextRes = await fetch(`${BASE_URL}/api/deliberation/${sessionId}/next`, {
      method: 'POST',
      headers: auth
    })
    if (!nextRes.ok) throw new Error(`/next failed: ${nextRes.status} ${await nextRes.text()}`)
    const cmd = (await nextRes.json()) as Record<string, unknown>

    if (cmd.type === 'done') {
      console.log('\n✓ Orchestrator returned: done\n')
      break
    }

    if (cmd.type === 'terminal') {
      const terminalState = cmd.terminal_state as string
      console.log(`\n${hr('═')}`)
      console.log(`  Terminal State: ${terminalState}`)
      console.log(hr('═'))

      // Fetch and print conclusion
      const sessionRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, { headers: auth })
      if (sessionRes.ok) {
        const session = (await sessionRes.json()) as { conclusion?: Record<string, unknown> | null }
        if (session.conclusion) {
          console.log('\n=== Conclusion JSON ===')
          console.log(JSON.stringify(session.conclusion, null, 2))
        } else {
          console.log('\n[No conclusion row found on session]')
        }
      }
      break
    }

    if (cmd.type === 'state_change') {
      console.log(`  → State: ${cmd.state}`)
      continue
    }

    if (cmd.type === 'run_agent') {
      agentTurnCount++
      const agent = cmd.agent as string
      const round = cmd.round as number
      const slug = AGENT_SLUG[agent]
      if (!slug) throw new Error(`No route slug for agent: "${agent}"`)

      const label = `Turn ${agentTurnCount} | Round ${round} | ${agent}`
      const t0 = performance.now()

      const res = await fetch(`${BASE_URL}/api/deliberation/${sessionId}/agent/${slug}`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          apiKey: ANTHROPIC_API_KEY,
          provider: PROVIDER,
          modelId: MODEL_ID,
          question: QUESTION,
          round,
          hasWhispers: false,
          userPrompt: cmd.userPrompt as string
        })
      })
      if (!res.ok) throw new Error(`Agent route (${slug}) failed: ${res.status} ${await res.text()}`)

      const result = (await res.json()) as {
        text: string
        finishReason: string
        usage: { inputTokens?: number; outputTokens?: number }
      }
      const elapsed = Math.round(performance.now() - t0)

      printTurn(label, result.text, result.usage.inputTokens, result.usage.outputTokens, elapsed)

      // Report turn to server (containment logic in turn.ts handles transcript writes)
      await fetch(`${BASE_URL}/api/deliberation/${sessionId}/turn`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          turnId: cmd.turnId as string,
          content: result.text,
          phase: 'run_agent',
          agent,
          round
        })
      })
    }

    if (cmd.type === 'run_conclusion') {
      conclusionPhaseCount++
      const phase = cmd.phase as string
      const modelId = (cmd.model as { modelId: string }).modelId

      console.log(`\n${hr('─')}`)
      console.log(`  Conclusion Phase: ${phase.toUpperCase()}`)
      console.log(hr('·'))

      const t0 = performance.now()
      const result = await callAnthropic(modelId, cmd.systemPrompt as string, cmd.userPrompt as string)
      const elapsed = Math.round(performance.now() - t0)

      if (cmd.expected === 'verdict') {
        console.log(`Blind Critic verdict: ${result.text.trim()}`)
      } else {
        console.log(`Raw output (first 300 chars): ${result.text.slice(0, 300)}…`)
        try {
          // Strip markdown fences if present
          const jsonStr = result.text
            .replace(/^```(?:json)?\n?/m, '')
            .replace(/\n?```$/m, '')
            .trim()
          const parsed = JSON.parse(jsonStr) as Record<string, unknown>
          console.log('\nParsed conclusion JSON:')
          console.log(JSON.stringify(parsed, null, 2))
        } catch {
          console.log('[Could not parse as JSON — full raw output below]')
          console.log(result.text)
        }
      }
      console.log(`Tokens: ${result.inputTokens} in / ${result.outputTokens} out  |  Wall: ${elapsed}ms`)

      // Post to /turn — server-side containment (turn.ts) will validate JSON,
      // parse conclusion schema, handle PASS/objection verdict logic.
      await fetch(`${BASE_URL}/api/deliberation/${sessionId}/turn`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          turnId: cmd.turnId as string,
          content: result.text,
          phase
        })
      })
    }
  }

  console.log(`\n${hr('═')}`)
  console.log('  Summary')
  console.log(hr('─'))
  console.log(`  Session:         ${sessionId}`)
  console.log(`  Agent turns:     ${agentTurnCount} (expected 12 for Crucible 3-round)`)
  console.log(`  Conclusion phases: ${conclusionPhaseCount}`)
  console.log(`  View at:         ${BASE_URL}/deliberation/${sessionId}`)
  console.log(hr('═'))
  console.log()
}

main().catch((err) => {
  console.error('\n❌ Script failed:', (err as Error).message)
  process.exit(1)
})
