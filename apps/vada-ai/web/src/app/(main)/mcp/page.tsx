import { Heading, Text } from '@atta/ui/shared'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui'
import { Separator } from '@atta/ui'
import { CopyButton } from './components/CopyButton'

// ─── Hosted configs ───────────────────────────────────────────────────────────

// FLAG: Claude.ai MCP config UI exact flow — verify before launch
const CLAUDE_AI_CONFIG = `{
  "url": "https://vada.attalabs.dev/api/mcp",
  "headers": {
    "Authorization": "Bearer vada_pk_your_key_here"
  }
}`

// FLAG: Claude Desktop HTTP MCP support — verify minimum version before launch
const CLAUDE_DESKTOP_HOSTED_CONFIG = `{
  "mcpServers": {
    "vada": {
      "url": "https://vada.attalabs.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer vada_pk_your_key_here"
      }
    }
  }
}`

const CURSOR_HOSTED_CONFIG = `{
  "mcpServers": {
    "vada": {
      "url": "https://vada.attalabs.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer vada_pk_your_key_here"
      }
    }
  }
}`

// FLAG: --transport http flag syntax — verify exact Claude Code CLI syntax before launch
const CLAUDE_CODE_HOSTED_CONFIG = `claude mcp add --transport http vada https://vada.attalabs.dev/api/mcp \\
  --header "Authorization: Bearer vada_pk_your_key_here"`

// FLAG: StreamableHTTPClientTransport class name — verify against current @modelcontextprotocol/sdk before launch
const SDK_CUSTOM_CONFIG = `import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const transport = new StreamableHTTPClientTransport(
  new URL('https://vada.attalabs.dev/api/mcp'),
  {
    requestInit: {
      headers: { Authorization: 'Bearer vada_pk_your_key_here' }
    }
  }
)
const client = new Client({ name: 'my-client', version: '1.0' }, {})
await client.connect(transport)`

// ─── Local stdio configs ──────────────────────────────────────────────────────

const CLAUDE_DESKTOP_MAC_CONFIG = `{
  "mcpServers": {
    "vada": {
      "command": "node",
      "args": ["/path/to/attaai/packages/mcp-server/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "DATABASE_URL": "postgresql://...",
        "VADA_USER_ID": "your-clerk-user-id"
      }
    }
  }
}`

const CLAUDE_DESKTOP_WIN_CONFIG = `{
  "mcpServers": {
    "vada": {
      "command": "node",
      "args": ["C:\\\\path\\\\to\\\\attaai\\\\packages\\\\mcp-server\\\\dist\\\\index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "DATABASE_URL": "postgresql://...",
        "VADA_USER_ID": "your-clerk-user-id"
      }
    }
  }
}`

const CURSOR_LOCAL_CONFIG = `{
  "mcpServers": {
    "vada": {
      "command": "node",
      "args": ["/path/to/attaai/packages/mcp-server/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "DATABASE_URL": "postgresql://...",
        "VADA_USER_ID": "your-clerk-user-id"
      }
    }
  }
}`

const CLAUDE_CODE_LOCAL_CONFIG = 'claude mcp add vada -- node /path/to/attaai/packages/mcp-server/dist/index.js'

const GENERIC_LOCAL_CONFIG = `{
  "mcpServers": {
    "vada": {
      "command": "node",
      "args": ["/path/to/attaai/packages/mcp-server/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "DATABASE_URL": "postgresql://...",
        "VADA_USER_ID": "your-clerk-user-id"
      }
    }
  }
}`

// ─── Tool examples ────────────────────────────────────────────────────────────

const CONSULT_EXAMPLE = `Use vada__consult to review this proposal: [your question here]
Reviewers: critic, strategist, devils_advocate`

const DELIBERATE_EXAMPLE = `Use vada__deliberate to analyze: [your question here]
Team: war-room`

// ─── Helper components ────────────────────────────────────────────────────────

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  return (
    <div className='relative rounded-lg border border-border bg-muted/30'>
      <div className='absolute right-2 top-2'>
        <CopyButton text={code} />
      </div>
      <pre className='overflow-x-auto p-4 pr-20 font-mono text-xs text-foreground'>
        <code data-language={language}>{code}</code>
      </pre>
    </div>
  )
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
      {n}
    </span>
  )
}

function InstallSteps({
  configPath,
  config,
  restartNote,
  verifyNote
}: {
  configPath: string
  config: string
  restartNote: string
  verifyNote: string
}) {
  return (
    <div className='space-y-6'>
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <StepNumber n={1} />
          <Text as='p' className='font-medium'>
            Prerequisites
          </Text>
        </div>
        <ul className='ml-8 space-y-1 text-sm text-muted-foreground'>
          <li>
            Node.js 18+ (
            <a
              href='https://nodejs.org'
              className='underline underline-offset-2 hover:text-accent transition-colors'
              target='_blank'
              rel='noreferrer'
            >
              nodejs.org
            </a>
            )
          </li>
          <li>Anthropic API key from console.anthropic.com</li>
          <li>Postgres database URL (optional — omit to skip session persistence)</li>
          <li>
            Clone the repo:{' '}
            <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
              git clone https://github.com/attaai/attaai
            </code>
          </li>
          <li>
            Build the MCP server:{' '}
            <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
              cd packages/mcp-server && bun run build
            </code>
          </li>
        </ul>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <StepNumber n={2} />
          <Text as='p' className='font-medium'>
            Config file location
          </Text>
        </div>
        <p className='ml-8 font-mono text-xs text-muted-foreground'>{configPath}</p>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <StepNumber n={3} />
          <Text as='p' className='font-medium'>
            Add to config
          </Text>
        </div>
        <div className='ml-8'>
          <CodeBlock code={config} />
          <p className='mt-2 text-xs text-muted-foreground'>
            Set <code className='rounded bg-muted px-1 font-mono text-xs'>VADA_USER_ID</code> to your Vāda account ID to
            see consultations in the dashboard. Find it in{' '}
            <a href='/settings' className='underline underline-offset-2 hover:text-accent transition-colors'>
              Settings
            </a>
            .
          </p>
        </div>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <StepNumber n={4} />
          <Text as='p' className='font-medium'>
            Restart
          </Text>
        </div>
        <p className='ml-8 text-sm text-muted-foreground'>{restartNote}</p>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <StepNumber n={5} />
          <Text as='p' className='font-medium'>
            Verify
          </Text>
        </div>
        <p className='ml-8 text-sm text-muted-foreground'>{verifyNote}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function McpPage() {
  return (
    <div className='px-6 py-12'>
      <div className='mx-auto max-w-2xl space-y-10'>
        {/* Section 1 — Intro */}
        <div className='space-y-4'>
          <span className='font-mono text-xs text-muted-foreground'>MCP Integration</span>
          <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
            Vāda MCP
          </Heading>
          <Text as='p' muted className='leading-relaxed'>
            Vāda exposes deliberation as MCP tools (
            <code className='rounded bg-muted px-1 font-mono text-xs'>vada__consult</code> and{' '}
            <code className='rounded bg-muted px-1 font-mono text-xs'>vada__deliberate</code>). Any MCP-compatible
            client can call them. The hosted server runs at{' '}
            <code className='rounded bg-muted px-1 font-mono text-xs'>https://vada.attalabs.dev/api/mcp</code> —{' '}
            <span className='text-accent'>no local install required</span>. Authentication via Vāda API key. Provider
            model calls run on your <span className='text-accent'>configured BYOK keys</span>.
          </Text>
        </div>

        <Separator className='opacity-20' />

        {/* Section 2 — Getting started (hosted) */}
        <div className='space-y-6'>
          <div className='space-y-1'>
            <Heading level={2} className='font-serif text-2xl font-light'>
              Getting started
            </Heading>
            <Text as='p' muted className='text-sm'>
              Connect to the hosted server — no local setup required.
            </Text>
          </div>

          <Tabs defaultValue='claude-ai'>
            <TabsList className='grid w-full grid-cols-5'>
              <TabsTrigger value='claude-ai'>Claude.ai</TabsTrigger>
              <TabsTrigger value='claude-desktop'>Claude Desktop</TabsTrigger>
              <TabsTrigger value='cursor'>Cursor</TabsTrigger>
              <TabsTrigger value='claude-code'>Claude Code</TabsTrigger>
              <TabsTrigger value='sdk'>SDK / Custom</TabsTrigger>
            </TabsList>

            {/* Claude.ai */}
            {/* FLAG: Claude.ai MCP config UI exact flow — verify before launch */}
            <TabsContent value='claude-ai' className='mt-6 space-y-4'>
              <Text as='p' muted className='text-sm'>
                Claude.ai&apos;s MCP config UI lets you enter a URL and custom headers. Open{' '}
                <strong>Settings → Integrations → MCP</strong> and add a new server with the following config.
                <span className='ml-1 font-mono text-xs text-muted-foreground'>
                  (Exact UI flow TBD — Principal to verify)
                </span>
              </Text>
              <CodeBlock code={CLAUDE_AI_CONFIG} />
            </TabsContent>

            {/* Claude Desktop */}
            {/* FLAG: Claude Desktop HTTP MCP support — verify minimum version number before launch */}
            <TabsContent value='claude-desktop' className='mt-6 space-y-4'>
              <Text as='p' muted className='text-sm'>
                Edit{' '}
                <code className='rounded bg-muted px-1 font-mono text-xs'>
                  ~/Library/Application Support/Claude/claude_desktop_config.json
                </code>{' '}
                (macOS) and add the <code className='rounded bg-muted px-1 font-mono text-xs'>vada</code> entry. HTTP
                MCP support is available from Claude Desktop version X.X+.{' '}
                <span className='font-mono text-xs text-muted-foreground'>
                  (Exact version TBD — Principal to verify before launch)
                </span>
              </Text>
              <CodeBlock code={CLAUDE_DESKTOP_HOSTED_CONFIG} />
              <Text as='p' muted className='text-sm'>
                Quit Claude Desktop completely and relaunch to pick up the new config.
              </Text>
            </TabsContent>

            {/* Cursor */}
            <TabsContent value='cursor' className='mt-6 space-y-4'>
              <Text as='p' muted className='text-sm'>
                Add to <code className='rounded bg-muted px-1 font-mono text-xs'>.cursor/mcp.json</code> in your project
                root, or open <strong>Cursor Settings → MCP</strong> and paste the snippet there.
              </Text>
              <CodeBlock code={CURSOR_HOSTED_CONFIG} />
              <Text as='p' muted className='text-sm'>
                Open Cursor Settings → MCP and click <strong>Reload</strong>, or restart Cursor.
              </Text>
            </TabsContent>

            {/* Claude Code */}
            {/* FLAG: --transport http flag syntax — verify exact Claude Code CLI syntax before launch */}
            <TabsContent value='claude-code' className='mt-6 space-y-4'>
              <Text as='p' muted className='text-sm'>
                Run the following command. The{' '}
                <code className='rounded bg-muted px-1 font-mono text-xs'>--transport http</code> flag syntax is
                approximate.{' '}
                <span className='font-mono text-xs text-muted-foreground'>
                  (Verify exact Claude Code CLI syntax before launch)
                </span>
              </Text>
              <CodeBlock code={CLAUDE_CODE_HOSTED_CONFIG} language='bash' />
            </TabsContent>

            {/* SDK / Custom */}
            {/* FLAG: StreamableHTTPClientTransport class name — verify against current @modelcontextprotocol/sdk before launch */}
            <TabsContent value='sdk' className='mt-6 space-y-4'>
              <Text as='p' muted className='text-sm'>
                Use the MCP TypeScript SDK to connect from any Node.js application. The{' '}
                <code className='rounded bg-muted px-1 font-mono text-xs'>StreamableHTTPClientTransport</code> class
                name may vary by SDK version.{' '}
                <span className='font-mono text-xs text-muted-foreground'>
                  (Verify against current @modelcontextprotocol/sdk before launch)
                </span>
              </Text>
              <CodeBlock code={SDK_CUSTOM_CONFIG} language='typescript' />
            </TabsContent>
          </Tabs>
        </div>

        <Separator className='opacity-20' />

        {/* Section 3 — Authentication */}
        <div className='space-y-4'>
          <Heading level={2} className='font-serif text-2xl font-light'>
            API Key
          </Heading>
          <Text as='p' muted className='leading-relaxed'>
            Generate a Vāda API key in{' '}
            <a href='/settings' className='underline underline-offset-2 hover:text-accent transition-colors'>
              Settings → MCP
            </a>
            . Paste it as the Bearer token in your client config.{' '}
            <span className='text-accent'>Treat it like a password</span> — it gives full access to your account&apos;s
            deliberation tools.
          </Text>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <StepNumber n={1} />
              <Text as='p' className='text-sm'>
                Go to{' '}
                <a href='/settings' className='underline underline-offset-2 hover:text-accent transition-colors'>
                  Settings → MCP
                </a>{' '}
                and generate a new API key.
              </Text>
            </div>
            <div className='flex items-center gap-2'>
              <StepNumber n={2} />
              <Text as='p' className='text-sm'>
                Paste the key as the{' '}
                <code className='rounded bg-muted px-1 font-mono text-xs'>Authorization: Bearer</code> value in your
                client config above.
              </Text>
            </div>
          </div>
        </div>

        <Separator className='opacity-20' />

        {/* Section 4 — Provider keys (BYOK) */}
        <div className='space-y-4'>
          <Heading level={2} className='font-serif text-2xl font-light'>
            Provider Keys
          </Heading>
          <Text as='p' muted className='leading-relaxed'>
            The hosted server runs deliberations on your provider keys. Configure them in{' '}
            <a href='/settings' className='underline underline-offset-2 hover:text-accent transition-colors'>
              Settings → API Keys
            </a>
            . Keys are <span className='text-accent'>encrypted at rest</span> using server-managed keys.
          </Text>
          <Text as='p' muted className='text-sm leading-relaxed'>
            Unlike the web app&apos;s browser-only BYOK, this is a{' '}
            <span className='text-accent'>different trust model</span>: Vāda&apos;s server decrypts your keys to make
            provider calls on your behalf. See the{' '}
            <a href='/trust' className='underline underline-offset-2 hover:text-accent transition-colors'>
              trust model
            </a>{' '}
            for more detail.
          </Text>
        </div>

        <Separator className='opacity-20' />

        {/* Section 5 — Tools */}
        <div className='space-y-6'>
          <Heading level={2} className='font-serif text-2xl font-light'>
            Tools
          </Heading>

          <div className='space-y-6'>
            <div className='space-y-3'>
              <div className='space-y-1'>
                <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground'>vada__consult</code>
                <Text as='p' muted className='text-sm'>
                  Single-shot reviewer chain. Pass a question and 2–5 reviewer roles. Each reviewer responds
                  independently.
                </Text>
              </div>
              <CodeBlock code={CONSULT_EXAMPLE} language='text' />
            </div>

            <div className='space-y-3'>
              <div className='space-y-1'>
                <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground'>
                  vada__deliberate
                </code>
                <Text as='p' muted className='text-sm'>
                  Multi-round team deliberation. Pass a question and optionally a team name. Returns a synthesized
                  conclusion. Default team: <code className='rounded bg-muted px-1 font-mono text-xs'>sparring</code>.
                </Text>
              </div>
              <CodeBlock code={DELIBERATE_EXAMPLE} language='text' />
            </div>
          </div>
        </div>

        <Separator className='opacity-20' />

        {/* Section 6 — Teams */}
        <div className='space-y-4'>
          <Heading level={2} className='font-serif text-2xl font-light'>
            Teams
          </Heading>
          <Text as='p' muted className='text-sm'>
            Pass one of these team names to{' '}
            <code className='rounded bg-muted px-1 font-mono text-xs'>vada__deliberate</code> to select the deliberation
            format.
          </Text>

          <div className='space-y-3'>
            {[
              {
                id: 'sparring',
                name: 'Sparring',
                description:
                  "Two agents go head-to-head across three rounds. Strategist and Critic stress-test each other's reasoning before a synthesizer reconciles."
              },
              {
                id: 'crucible',
                name: 'Crucible',
                description:
                  "Four agents debate across three rounds. Strategist proposes, Critic challenges, Devil's Advocate breaks, Synthesizer reconciles. Two auditors verify before delivery."
              },
              {
                id: 'war-room',
                name: 'War Room',
                description:
                  'Six agents debate across three rounds — strategy, criticism, adversarial framing, synthesis, research, and execution. For high-stakes decisions.'
              },
              {
                id: 'vada-reviewers',
                name: 'Reviewers',
                description:
                  'Three different LLMs review your problem in parallel — Gemini, GPT, and Grok give independent perspectives. Vendor diversity over role specialization.'
              },
              {
                id: 'vada-reviewers-synthesis',
                name: 'Reviewers + Synthesis',
                description:
                  'Three different LLMs review independently, then a synthesizer extracts consensus, contradictions, and unique insights into a structured analysis.'
              }
            ].map((team) => (
              <div key={team.id} className='flex gap-3'>
                <code className='mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground'>
                  {team.id}
                </code>
                <div>
                  <p className='text-sm font-medium text-foreground'>{team.name}</p>
                  <p className='text-sm text-muted-foreground'>{team.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className='opacity-20' />

        {/* Section 7 — Self-hosted / Local stdio */}
        <div className='space-y-6'>
          <div className='space-y-1'>
            <span className='font-mono text-xs text-muted-foreground'>Alternative</span>
            <Heading level={2} className='font-serif text-2xl font-light'>
              Local stdio server
            </Heading>
            <Text as='p' muted className='text-sm leading-relaxed'>
              For local development or self-hosted setups, you can run the MCP server as a local process. Clone the
              repo, build the server, and point your client at the built binary.
            </Text>
          </div>

          <Tabs defaultValue='claude-desktop-local'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='claude-desktop-local'>Claude Desktop</TabsTrigger>
              <TabsTrigger value='cursor-local'>Cursor</TabsTrigger>
              <TabsTrigger value='claude-code-local'>Claude Code</TabsTrigger>
              <TabsTrigger value='generic-local'>Generic</TabsTrigger>
            </TabsList>

            <TabsContent value='claude-desktop-local' className='mt-6'>
              <div className='space-y-4'>
                <Tabs defaultValue='mac'>
                  <TabsList>
                    <TabsTrigger value='mac'>macOS</TabsTrigger>
                    <TabsTrigger value='windows'>Windows</TabsTrigger>
                  </TabsList>
                  <TabsContent value='mac' className='mt-4'>
                    <InstallSteps
                      configPath='~/Library/Application Support/Claude/claude_desktop_config.json'
                      config={CLAUDE_DESKTOP_MAC_CONFIG}
                      restartNote='Quit Claude Desktop completely and relaunch. The MCP server starts automatically on next launch.'
                      verifyNote='Open a new conversation and type "/" — you should see vada__consult and vada__deliberate in the tool list.'
                    />
                  </TabsContent>
                  <TabsContent value='windows' className='mt-4'>
                    <InstallSteps
                      configPath='%APPDATA%\Claude\claude_desktop_config.json'
                      config={CLAUDE_DESKTOP_WIN_CONFIG}
                      restartNote='Quit Claude Desktop completely and relaunch. The MCP server starts automatically on next launch.'
                      verifyNote='Open a new conversation and type "/" — you should see vada__consult and vada__deliberate in the tool list.'
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            <TabsContent value='cursor-local' className='mt-6'>
              <InstallSteps
                configPath='~/.cursor/mcp.json (or Cursor Settings → MCP)'
                config={CURSOR_LOCAL_CONFIG}
                restartNote='Open Cursor Settings → MCP and click Reload. Or restart Cursor.'
                verifyNote='In Cursor chat, the vada__consult and vada__deliberate tools should appear in the tool picker. Ask "use vada to critique this code" to test.'
              />
            </TabsContent>

            <TabsContent value='claude-code-local' className='mt-6'>
              <div className='space-y-6'>
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <StepNumber n={1} />
                    <Text as='p' className='font-medium'>
                      Prerequisites
                    </Text>
                  </div>
                  <ul className='ml-8 space-y-1 text-sm text-muted-foreground'>
                    <li>Claude Code CLI installed</li>
                    <li>Node.js 18+ and the built MCP server (see above)</li>
                  </ul>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <StepNumber n={2} />
                    <Text as='p' className='font-medium'>
                      Register the MCP server
                    </Text>
                  </div>
                  <div className='ml-8'>
                    <CodeBlock code={CLAUDE_CODE_LOCAL_CONFIG} language='bash' />
                    <p className='mt-2 text-xs text-muted-foreground'>
                      Then set env vars in{' '}
                      <code className='rounded bg-muted px-1 font-mono text-xs'>~/.claude.json</code> or via{' '}
                      <code className='rounded bg-muted px-1 font-mono text-xs'>claude mcp edit vada</code>.
                    </p>
                  </div>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <StepNumber n={3} />
                    <Text as='p' className='font-medium'>
                      Verify
                    </Text>
                  </div>
                  <p className='ml-8 text-sm text-muted-foreground'>
                    Run <code className='rounded bg-muted px-1 font-mono text-xs'>claude mcp list</code> — vada should
                    appear. In a Claude Code session,{' '}
                    <code className='rounded bg-muted px-1 font-mono text-xs'>vada__consult</code> and{' '}
                    <code className='rounded bg-muted px-1 font-mono text-xs'>vada__deliberate</code> are available as
                    tools.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='generic-local' className='mt-6'>
              <InstallSteps
                configPath='Consult your MCP client docs for the config file location'
                config={GENERIC_LOCAL_CONFIG}
                restartNote='Restart your MCP client to pick up the new server config.'
                verifyNote='The client tool list should include vada__consult and vada__deliberate.'
              />
            </TabsContent>
          </Tabs>
        </div>

        <Separator className='opacity-20' />

        {/* Section 8 — Troubleshooting */}
        <div className='space-y-4'>
          <Heading level={2} className='font-serif text-2xl font-light'>
            Troubleshooting
          </Heading>

          <div className='space-y-4'>
            {[
              {
                problem: 'Tool not appearing in client',
                solution:
                  'Check that your API key is valid and that your client can reach vada.attalabs.dev. Some clients require a restart after config changes.'
              },
              {
                problem: '401 Unauthorized',
                solution: (
                  <>
                    API key is invalid or has been revoked. Regenerate it in{' '}
                    <a href='/settings' className='underline underline-offset-2 hover:text-accent transition-colors'>
                      Settings → MCP
                    </a>
                    .
                  </>
                )
              },
              {
                problem: '400 "missing provider key"',
                solution: (
                  <>
                    The hosted server needs a provider key to make model calls. Configure one in{' '}
                    <a href='/settings' className='underline underline-offset-2 hover:text-accent transition-colors'>
                      Settings → API Keys
                    </a>
                    .
                  </>
                )
              },
              {
                problem: 'Request times out',
                solution:
                  'Deliberation runs can take 3–6 minutes depending on team size and model. Increase your client timeout if it cuts off before the result arrives.'
              }
            ].map((item, i) => (
              <div key={i} className='space-y-1'>
                <p className='text-sm font-medium text-foreground'>{item.problem}</p>
                <p className='text-sm text-muted-foreground'>{item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
