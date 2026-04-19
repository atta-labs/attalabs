import { handleAgentRoute } from '@/engine/agent-route-handler'
import { criticAgent } from '@/engine/agents'

export async function POST(req: Request) {
  return handleAgentRoute(req, criticAgent)
}
