import { Tabs, TabsList, TabsTrigger } from '@atta/ui/components'
import { Heading } from '@atta/ui/shared'
import {
  CodeBlock,
  Entries,
  Entry,
  InlineCode,
  InlineLink,
  List,
  McpSection,
  Prose,
  SectionDivider,
  Step,
  Steps,
  TabPanel
} from './components/McpBlocks'
import { ENDPOINT, EXAMPLES, HOSTED, LOCAL } from './configs'

const VERIFY_TOOLS = (
  <>
    Open your client&apos;s tools or connectors menu — <InlineCode>vada__consult</InlineCode> and{' '}
    <InlineCode>vada__deliberate</InlineCode> should be listed.
  </>
)

/** Steps for running the server locally from a clone, shared by every desktop client. */
function LocalInstall({ configPath, config, restart }: { configPath: string; config: string; restart: string }) {
  return (
    <Steps>
      <Step n={1} title='Prerequisites'>
        <List
          items={[
            <>
              Bun (<InlineLink href='https://bun.sh'>bun.sh</InlineLink>)
            </>,
            'An Anthropic API key (required); Google, OpenAI and xAI keys are optional',
            <>
              Clone the repo: <InlineCode>git clone https://github.com/atta-labs/attalabs</InlineCode>
            </>,
            <>
              Install dependencies: <InlineCode>cd attalabs && bun install</InlineCode>
            </>
          ]}
        />
      </Step>
      <Step n={2} title='Config file location'>
        <Prose>
          <InlineCode>{configPath}</InlineCode>
        </Prose>
      </Step>
      <Step n={3} title='Add to config'>
        <CodeBlock code={config} />
        <Prose>
          <InlineCode>DATABASE_URL</InlineCode> and <InlineCode>VADA_USER_ID</InlineCode> are optional: set them to log
          consultations to your own database.
        </Prose>
      </Step>
      <Step n={4} title='Restart'>
        <Prose>{restart}</Prose>
      </Step>
      <Step n={5} title='Verify'>
        <Prose>{VERIFY_TOOLS}</Prose>
      </Step>
    </Steps>
  )
}

const TEAMS = [
  {
    id: 'vada-reviewers',
    name: 'Reviewers · vada__deliberate',
    description:
      'Three reviewer slots run in parallel. You choose the model for each slot — any vendor you have a key for. Each reviewer has live web access.'
  },
  {
    id: 'vada-reviewers-synthesis',
    name: 'Reviewers + Synthesis · vada__deliberate',
    description:
      'The same three slots, then a synthesizer extracts consensus, contradictions and unique insights into a structured analysis.'
  },
  {
    id: 'vada-fusion-native',
    name: 'Outside Read · vada__consult (spec_id)',
    description:
      'Four reviewers from different vendors examine your question in isolation. A synthesizer maps where they agree, what they concede and what stays contested; a blind critic and a fact-checker audit it before you get it.'
  }
]

export default function McpPage() {
  return (
    <div className='px-6 py-12'>
      <div className='mx-auto flex max-w-2xl flex-col gap-10'>
        <section className='flex flex-col gap-4'>
          <span className='font-mono text-xs text-muted-foreground'>MCP Integration</span>
          <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
            Vāda MCP
          </Heading>
          <Prose lead>
            Vāda exposes deliberation as MCP tools (<InlineCode>vada__consult</InlineCode> and{' '}
            <InlineCode>vada__deliberate</InlineCode>). Any MCP-compatible client can call them. The hosted server runs
            at <InlineCode>{ENDPOINT}</InlineCode> — <span className='text-primary'>no local install required</span>.
            Authentication via Vāda API key. Provider model calls run on your{' '}
            <span className='text-primary'>configured BYOK keys</span>.
          </Prose>
        </section>

        <SectionDivider />

        <McpSection title='Getting started' intro='Connect to the hosted server — no local setup required.'>
          <Tabs defaultValue='claude-ai'>
            <TabsList className='w-full'>
              <TabsTrigger value='claude-ai'>Claude.ai</TabsTrigger>
              <TabsTrigger value='claude-desktop'>Claude Desktop</TabsTrigger>
              <TabsTrigger value='cursor'>Cursor</TabsTrigger>
              <TabsTrigger value='claude-code'>Claude Code</TabsTrigger>
              <TabsTrigger value='sdk'>SDK / Custom</TabsTrigger>
            </TabsList>
            <TabPanel value='claude-ai'>
              <Prose>
                Add Vāda as a custom MCP connector with the server URL and an <InlineCode>Authorization</InlineCode>{' '}
                header carrying your Vāda API key.
              </Prose>
              <CodeBlock code={HOSTED.claudeAi} />
            </TabPanel>
            <TabPanel value='claude-desktop'>
              <Prose>
                Edit <InlineCode>~/Library/Application Support/Claude/claude_desktop_config.json</InlineCode> (macOS)
                and add the <InlineCode>vada</InlineCode> entry.
              </Prose>
              <CodeBlock code={HOSTED.mcpServers} />
              <Prose>Quit Claude Desktop completely and relaunch to pick up the new config.</Prose>
            </TabPanel>
            <TabPanel value='cursor'>
              <Prose>
                Add to <InlineCode>.cursor/mcp.json</InlineCode> in your project root, or open{' '}
                <strong>Cursor Settings → MCP</strong> and paste the snippet there.
              </Prose>
              <CodeBlock code={HOSTED.mcpServers} />
              <Prose>
                Open Cursor Settings → MCP and click <strong>Reload</strong>, or restart Cursor.
              </Prose>
            </TabPanel>
            <TabPanel value='claude-code'>
              <Prose>Run the following command.</Prose>
              <CodeBlock code={HOSTED.claudeCode} language='bash' />
            </TabPanel>
            <TabPanel value='sdk'>
              <Prose>
                Use the MCP TypeScript SDK to connect from any Node.js application. The server speaks Streamable HTTP;
                SSE-only clients are not supported.
              </Prose>
              <CodeBlock code={HOSTED.sdk} language='typescript' />
            </TabPanel>
          </Tabs>
        </McpSection>

        <SectionDivider />

        <McpSection
          title='API Key'
          intro={
            <>
              Generate a Vāda API key in <InlineLink href='/settings'>Settings → Vāda API Keys</InlineLink>. It is shown
              once — copy it then. <span className='text-primary'>Treat it like a password</span> — it gives full access
              to your account&apos;s deliberation tools.
            </>
          }
        >
          <Steps>
            <Step n={1} title='Generate a key'>
              <Prose>
                Go to <InlineLink href='/settings'>Settings → Vāda API Keys</InlineLink> and generate a new API key.
              </Prose>
            </Step>
            <Step n={2} title='Add it to your client'>
              <Prose>
                Paste the key as the <InlineCode>Authorization: Bearer</InlineCode> value in your client config above.
              </Prose>
            </Step>
          </Steps>
        </McpSection>

        <SectionDivider />

        <McpSection
          title='Provider Keys'
          intro={
            <>
              The hosted server runs on your provider keys. Configure them in{' '}
              <InlineLink href='/settings'>Settings → Provider API Keys</InlineLink>. Keys are{' '}
              <span className='text-primary'>encrypted at rest</span>. Over MCP, Vāda uses your Anthropic, Google,
              OpenAI and xAI keys; an Anthropic key is needed for the default models.
            </>
          }
        >
          <Prose>
            Vāda&apos;s server decrypts your keys to make provider calls on your behalf, and stores each consultation in
            full. See the <InlineLink href='/trust'>trust page</InlineLink> for more detail.
          </Prose>
        </McpSection>

        <SectionDivider />

        <McpSection title='Tools'>
          <Entries>
            <Entry term={<InlineCode>vada__consult</InlineCode>}>
              Independent reviewers in parallel. Pass your context, the question and 2–5 reviewers (strategist, critic,
              devils_advocate). Returns each reviewer&apos;s response and a link to the full session. Pass{' '}
              <InlineCode>spec_id: &quot;vada-fusion-native&quot;</InlineCode> for an Outside Read.
            </Entry>
            <CodeBlock code={EXAMPLES.consult} language='text' />
            <Entry term={<InlineCode>vada__deliberate</InlineCode>}>
              Run a team on your question. Pass a question and optionally a team. Returns the team&apos;s output, its
              structured result when the team defines one, and a link to the full session. Default team:{' '}
              <InlineCode>vada-reviewers</InlineCode>.
            </Entry>
            <CodeBlock code={EXAMPLES.deliberate} language='text' />
          </Entries>
        </McpSection>

        <SectionDivider />

        <McpSection title='Teams' intro='The teams each tool accepts.'>
          <Entries>
            {TEAMS.map((team) => (
              <Entry
                key={team.id}
                term={
                  <>
                    <InlineCode>{team.id}</InlineCode> {team.name}
                  </>
                }
              >
                {team.description}
              </Entry>
            ))}
          </Entries>
        </McpSection>

        <SectionDivider />

        <McpSection
          eyebrow='Alternative'
          title='Local stdio server'
          intro="For local development or self-hosted setups, run the MCP server as a local process on your own keys: clone the repo and point your client at the server's entry file."
        >
          <Tabs defaultValue='claude-desktop-local'>
            <TabsList className='w-full'>
              <TabsTrigger value='claude-desktop-local'>Claude Desktop</TabsTrigger>
              <TabsTrigger value='cursor-local'>Cursor</TabsTrigger>
              <TabsTrigger value='claude-code-local'>Claude Code</TabsTrigger>
              <TabsTrigger value='generic-local'>Generic</TabsTrigger>
            </TabsList>
            <TabPanel value='claude-desktop-local'>
              <Tabs defaultValue='mac'>
                <TabsList>
                  <TabsTrigger value='mac'>macOS</TabsTrigger>
                  <TabsTrigger value='windows'>Windows</TabsTrigger>
                </TabsList>
                <TabPanel value='mac'>
                  <LocalInstall
                    configPath='~/Library/Application Support/Claude/claude_desktop_config.json'
                    config={LOCAL.posix}
                    restart='Quit Claude Desktop completely and relaunch. The MCP server starts automatically on next launch.'
                  />
                </TabPanel>
                <TabPanel value='windows'>
                  <LocalInstall
                    configPath='%APPDATA%\Claude\claude_desktop_config.json'
                    config={LOCAL.windows}
                    restart='Quit Claude Desktop completely and relaunch. The MCP server starts automatically on next launch.'
                  />
                </TabPanel>
              </Tabs>
            </TabPanel>
            <TabPanel value='cursor-local'>
              <LocalInstall
                configPath='~/.cursor/mcp.json (or Cursor Settings → MCP)'
                config={LOCAL.posix}
                restart='Open Cursor Settings → MCP and click Reload. Or restart Cursor.'
              />
            </TabPanel>
            <TabPanel value='claude-code-local'>
              <Steps>
                <Step n={1} title='Prerequisites'>
                  <List items={['Claude Code CLI installed', 'Bun and a clone of the repo (see Claude Desktop)']} />
                </Step>
                <Step n={2} title='Register the MCP server'>
                  <CodeBlock code={LOCAL.claudeCode} language='bash' />
                  <Prose>
                    Then set env vars in <InlineCode>~/.claude.json</InlineCode> or via{' '}
                    <InlineCode>claude mcp edit vada</InlineCode>.
                  </Prose>
                </Step>
                <Step n={3} title='Verify'>
                  <Prose>
                    Run <InlineCode>claude mcp list</InlineCode> — vada should appear. In a Claude Code session,{' '}
                    <InlineCode>vada__consult</InlineCode> and <InlineCode>vada__deliberate</InlineCode> are available
                    as tools.
                  </Prose>
                </Step>
              </Steps>
            </TabPanel>
            <TabPanel value='generic-local'>
              <LocalInstall
                configPath='Consult your MCP client docs for the config file location'
                config={LOCAL.posix}
                restart='Restart your MCP client to pick up the new server config.'
              />
            </TabPanel>
          </Tabs>
        </McpSection>

        <SectionDivider />

        <McpSection title='Troubleshooting'>
          <Entries>
            <Entry term='Tool not appearing in client'>
              Check that your API key is valid and that your client can reach vada.attalabs.dev. Some clients require a
              restart after config changes.
            </Entry>
            <Entry term='401 Unauthorized'>
              The API key is invalid, revoked or not sent as <InlineCode>Bearer vada_…</InlineCode>. Generate a new one
              in <InlineLink href='/settings'>Settings → Vāda API Keys</InlineLink>.
            </Entry>
            <Entry term='400 "No provider keys configured"'>
              The hosted server needs a provider key to make model calls. Configure one in{' '}
              <InlineLink href='/settings'>Settings → Provider API Keys</InlineLink>.
            </Entry>
            <Entry term='429 "Rate limit exceeded"'>
              Each Vāda API key allows 60 requests per hour. Wait, or spread calls over more time.
            </Entry>
            <Entry term='Request times out'>
              Calls typically take 30–120 seconds, longer for larger teams. Raise your client tool timeout to at least
              two minutes.
            </Entry>
          </Entries>
        </McpSection>
      </div>
    </div>
  )
}
