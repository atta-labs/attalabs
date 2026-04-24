// Integration test — full Crucible deliberation through the LangGraph route
//
// Calls POST /api/deliberation/{id}/workflow/run?sync=true, which runs the
// complete crucible workflow (12 agent turns + conclusion protocol) server-side.
// Verifies the session reaches a terminal state and the conclusion is persisted.
//
// Usage (from apps/vada-ai/web/):
//   bun run scripts/test-crucible-workflow.ts
//
// Requires:
//   - Dev server running (bun run dev:vada)
//   - ANTHROPIC_API_KEY and CLERK_SECRET_KEY in apps/vada-ai/web/.env.local
//   - CLERK_SESSION_ID in .env.local or passed as env var

import { config } from 'dotenv'

config({ path: '.env.local' })

const BASE_URL = process.env.VADA_BASE_URL ?? 'http://localhost:3003'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const CLERK_SESSION_ID = process.env.CLERK_SESSION_ID ?? 'sess_3CSsNVZgk2K5KBYx0eZDqALfkBA'

const PROVIDER = 'anthropic'
const MODEL_ID = 'claude-haiku-4-5-20251001'

const QUESTION =
  process.env.QUESTION ??
  'Should a 5-person startup use a monorepo or separate repos for their first product? ' +
    'They expect to add a mobile app in 6 months.'

async function getClerkToken(): Promise<string> {
  if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY not set')
  const res = await fetch(`https://api.clerk.com/v1/sessions/${CLERK_SESSION_ID}/tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`Clerk token fetch failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { jwt: string }
  return data.jwt
}

const hr = (char = '─', len = 70) => char.repeat(len)

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not found in .env.local')
  if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY not found in .env.local')

  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('  Vāda Step 5 — Crucible Workflow (Mastra) Verification')
  console.log('══════════════════════════════════════════════════════════════════════')
  console.log(`\nModel:    ${PROVIDER}/${MODEL_ID}`)
  console.log(`Question: ${QUESTION}\n`)

  console.log('Fetching Clerk session token...')
  let token = await getClerkToken()
  const authHeaders = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
  console.log('✓ Token obtained\n')

  // 1. Create session
  console.log('Creating deliberation session...')
  const startRes = await fetch(`${BASE_URL}/api/deliberation/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ question: QUESTION, provider: PROVIDER, modelId: MODEL_ID })
  })
  if (!startRes.ok) throw new Error(`Session creation failed: ${startRes.status} ${await startRes.text()}`)
  const { session_id: sessionId } = (await startRes.json()) as { session_id: string }
  console.log(`✓ Session: ${sessionId}`)
  console.log(`  URL: ${BASE_URL}/deliberation/${sessionId}\n`)

  // 2. Run workflow sync (full deliberation server-side, ~3-8 min on Haiku)
  console.log('Starting crucible workflow (sync=true — this will take several minutes)...')
  const started = Date.now()

  token = await getClerkToken()
  const workflowRes = await fetch(`${BASE_URL}/api/deliberation/${sessionId}/workflow/run?sync=true`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ apiKey: ANTHROPIC_API_KEY }),
    signal: AbortSignal.timeout(20 * 60 * 1000) // 20 min max
  })

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`\nWorkflow response: ${workflowRes.status} (${elapsed}s)`)

  if (!workflowRes.ok) {
    const body = await workflowRes.text()
    throw new Error(`Workflow failed: ${workflowRes.status} ${body}`)
  }

  const workflowResult = (await workflowRes.json()) as {
    state?: string | null
    terminalState?: string | null
    error?: string
  }

  console.log(`\n${hr('═')}`)
  console.log('  Workflow result:')
  console.log(`    state:         ${workflowResult.state}`)
  console.log(`    terminalState: ${workflowResult.terminalState}`)
  console.log(hr('═'))

  // Checks
  const checks: Array<[string, boolean]> = [
    ['HTTP 200', workflowRes.status === 200],
    ['state is TERMINAL', workflowResult.state === 'TERMINAL'],
    ['terminalState present', !!workflowResult.terminalState],
    [
      'terminalState is CLEAN, REVISED, or MAX_REVISIONS',
      ['CLEAN', 'REVISED', 'MAX_REVISIONS'].includes(workflowResult.terminalState ?? '')
    ]
  ]

  // 3. Fetch session and verify conclusion row
  token = await getClerkToken()
  const sessionRes = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, { headers: authHeaders() })
  const sessionData = sessionRes.ok ? ((await sessionRes.json()) as { conclusion?: unknown; status?: string }) : null

  const conclusion = sessionData?.conclusion as Record<string, unknown> | null | undefined

  checks.push(['conclusion row exists', !!conclusion])
  checks.push([
    'conclusion has recommendation',
    typeof (conclusion as Record<string, unknown> | null)?.recommendation === 'string'
  ])

  console.log('\n── Verification checks ──')
  let pass = 0
  for (const [label, result] of checks) {
    const icon = result ? '✓' : '✗'
    console.log(`  ${icon} ${label}`)
    if (result) pass++
  }

  const total = checks.length
  console.log(`\n${pass}/${total} checks passed`)

  if (pass < total) {
    console.log('\n[Conclusion JSON for debugging]')
    console.log(JSON.stringify(conclusion, null, 2))
    process.exit(1)
  }

  console.log('\n✓ All checks passed — Mastra crucible workflow is operational\n')
}

main().catch((err) => {
  console.error('\n✗ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
