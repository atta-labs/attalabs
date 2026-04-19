import { handleAgentRoute } from '@/engine/agent-route-handler'
import { devilsAdvocateAgent } from '@/engine/agents'

export async function POST(req: Request) {
  return handleAgentRoute(req, devilsAdvocateAgent)
}
