import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server'
import { validateAllSpecs } from './spec-registry'

// At least ANTHROPIC_API_KEY must be set for the default deliberation specs.
// Additional keys unlock non-Anthropic models in custom YAML specs.
const anthropicKey = process.env.ANTHROPIC_API_KEY
if (!anthropicKey) {
  console.error('[MCP] ANTHROPIC_API_KEY is required')
  process.exit(1)
}

const providerKeys = {
  anthropic: anthropicKey,
  google: process.env.GOOGLE_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  xai: process.env.XAI_API_KEY
}

validateAllSpecs()
const server = createServer(providerKeys)
const transport = new StdioServerTransport()
await server.connect(transport)
