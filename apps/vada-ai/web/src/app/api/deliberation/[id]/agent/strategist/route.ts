import { handleAgentRoute } from '@/engine/agent-route-handler'
import { strategistAgent } from '@/engine/agents'

export async function POST(req: Request) {
  return handleAgentRoute(req, strategistAgent)
}
