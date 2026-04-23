import { type NextRequest, NextResponse } from 'next/server'
import { compile } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { crucible } from '@/examples/teams/crucible'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  let body: { question?: string; model?: string; apiKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { question, model, apiKey } = body

  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const key = apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Anthropic API key required' }, { status: 400 })
  }

  const plan = compile({ team: crucible, question, model: model ?? 'claude-sonnet-4-6' })
  const adapter = new LangGraphAdapter({ apiKey: key })
  const conclusion = await adapter.execute({ plan, customVars: {} })

  return NextResponse.json(conclusion)
}
