import { handleAgentRoute } from '@/engine/agent-route-handler'
import { researcherAgent } from '@/engine/agents'

export async function POST(req: Request) {
  return handleAgentRoute(req, researcherAgent)
}
