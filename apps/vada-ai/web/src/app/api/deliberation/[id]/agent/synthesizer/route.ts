import { handleAgentRoute } from '@/engine/agent-route-handler'
import { synthesizerAgent } from '@/engine/agents'

export async function POST(req: Request) {
  return handleAgentRoute(req, synthesizerAgent)
}
