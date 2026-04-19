import { handleAgentRoute } from '@/engine/agent-route-handler'
import { operatorAgent } from '@/engine/agents'

export async function POST(req: Request) {
  return handleAgentRoute(req, operatorAgent)
}
