// Every snippet the MCP page shows, built from one endpoint, one key placeholder and one local
// entry point, so the hosted and local variants can never drift apart.

const ENDPOINT = 'https://vada.attalabs.dev/api/mcp'
const KEY = 'vada_your_key_here'
const json = (value: unknown) => JSON.stringify(value, null, 2)

const hostedServer = { url: ENDPOINT, headers: { Authorization: `Bearer ${KEY}` } }

export const HOSTED = {
  claudeAi: json(hostedServer),
  // Claude Desktop and Cursor read the same `mcpServers` shape
  mcpServers: json({ mcpServers: { vada: hostedServer } }),
  claudeCode: `claude mcp add --transport http vada ${ENDPOINT} \\\n  --header "Authorization: Bearer ${KEY}"`,
  sdk: `import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const transport = new StreamableHTTPClientTransport(new URL('${ENDPOINT}'), {
  requestInit: { headers: { Authorization: 'Bearer ${KEY}' } }
})
const client = new Client({ name: 'my-client', version: '1.0' }, {})
await client.connect(transport)`
}

const ENTRY_POSIX = '/path/to/attalabs/apps/vada-ai/mcp-server/src/index.ts'
const ENTRY_WINDOWS = 'C:\\path\\to\\attalabs\\apps\\vada-ai\\mcp-server\\src\\index.ts'
const LOCAL_ENV = {
  ANTHROPIC_API_KEY: 'sk-ant-...',
  GOOGLE_API_KEY: 'optional',
  OPENAI_API_KEY: 'optional',
  XAI_API_KEY: 'optional',
  DATABASE_URL: 'optional — postgresql://...',
  VADA_USER_ID: 'optional — your Clerk user id'
}
const localServer = (entry: string) =>
  json({ mcpServers: { vada: { command: 'bun', args: ['run', entry], env: LOCAL_ENV } } })

export const LOCAL = {
  posix: localServer(ENTRY_POSIX),
  windows: localServer(ENTRY_WINDOWS),
  claudeCode: `claude mcp add vada -- bun run ${ENTRY_POSIX}`
}

export const EXAMPLES = {
  consult: `Use vada__consult to get an outside read on this plan: [your question and context]
Reviewers: strategist, critic, devils_advocate`,
  deliberate: `Use vada__deliberate to analyze: [your question here]
Team: vada-reviewers-synthesis`
}

export { ENDPOINT }
