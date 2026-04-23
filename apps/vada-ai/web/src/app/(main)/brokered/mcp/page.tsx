import { Heading, Text } from '@atta/ui/shared'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui'
import { Separator } from '@atta/ui'
import { CopyButton } from './components/CopyButton'

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

const CURSOR_CONFIG = `{
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

const CLAUDE_CODE_CONFIG = 'claude mcp add vada -- node /path/to/attaai/packages/mcp-server/dist/index.js'

const GENERIC_CONFIG = `{
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
          <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
            1
          </span>
          <Text as='p' className='font-medium'>
            Prerequisites
          </Text>
        </div>
        <ul className='ml-8 space-y-1 text-sm text-muted-foreground'>
          <li>
            Node.js 18+ (
            <a href='https://nodejs.org' className='underline underline-offset-2' target='_blank' rel='noreferrer'>
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
          <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
            2
          </span>
          <Text as='p' className='font-medium'>
            Config file location
          </Text>
        </div>
        <p className='ml-8 font-mono text-xs text-muted-foreground'>{configPath}</p>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
            3
          </span>
          <Text as='p' className='font-medium'>
            Add to config
          </Text>
        </div>
        <div className='ml-8'>
          <CodeBlock code={config} />
          <p className='mt-2 text-xs text-muted-foreground'>
            Set <code className='rounded bg-muted px-1 font-mono text-xs'>VADA_USER_ID</code> to your Vāda account ID to
            see consultations in the dashboard. Find it in{' '}
            <a href='/settings' className='underline underline-offset-2'>
              Settings
            </a>
            .
          </p>
        </div>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
            4
          </span>
          <Text as='p' className='font-medium'>
            Restart
          </Text>
        </div>
        <p className='ml-8 text-sm text-muted-foreground'>{restartNote}</p>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
            5
          </span>
          <Text as='p' className='font-medium'>
            Verify
          </Text>
        </div>
        <p className='ml-8 text-sm text-muted-foreground'>{verifyNote}</p>
      </div>
    </div>
  )
}

export default function BrokeredMcpPage() {
  return (
    <div className='px-6 py-12'>
      <div className='mx-auto max-w-2xl space-y-10'>
        <div className='space-y-4'>
          <span className='font-mono text-xs text-muted-foreground'>Brokered Deliberation</span>
          <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
            MCP Install Guide
          </Heading>
          <Text as='p' muted className='leading-relaxed'>
            Install the Vāda MCP server to access reviewers from Claude Desktop, Cursor, Claude Code, or any
            MCP-compatible client. This is an early-access local install — a hosted version is coming.
          </Text>
        </div>

        <Separator className='opacity-20' />

        <Tabs defaultValue='claude-desktop-mac'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='claude-desktop-mac'>Claude Desktop</TabsTrigger>
            <TabsTrigger value='cursor'>Cursor</TabsTrigger>
            <TabsTrigger value='claude-code'>Claude Code</TabsTrigger>
            <TabsTrigger value='generic'>Generic</TabsTrigger>
          </TabsList>

          <TabsContent value='claude-desktop-mac' className='mt-6'>
            <div className='space-y-4'>
              <div className='flex gap-2'>
                <span className='rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground'>
                  macOS
                </span>
                <span className='rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground'>
                  Windows
                </span>
              </div>
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
                    verifyNote='Open a new conversation and type "/" — you should see vada__deliberate_brokered and vada__deliberate in the tool list.'
                  />
                </TabsContent>
                <TabsContent value='windows' className='mt-4'>
                  <InstallSteps
                    configPath='%APPDATA%\Claude\claude_desktop_config.json'
                    config={CLAUDE_DESKTOP_WIN_CONFIG}
                    restartNote='Quit Claude Desktop completely and relaunch. The MCP server starts automatically on next launch.'
                    verifyNote='Open a new conversation and type "/" — you should see vada__deliberate_brokered and vada__deliberate in the tool list.'
                  />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value='cursor' className='mt-6'>
            <InstallSteps
              configPath='~/.cursor/mcp.json (or Cursor Settings → MCP)'
              config={CURSOR_CONFIG}
              restartNote='Open Cursor Settings → MCP and click Reload. Or restart Cursor.'
              verifyNote='In Cursor chat, the vada__deliberate_brokered tool should appear in the tool picker. Ask "use vada to critique this code" to test.'
            />
          </TabsContent>

          <TabsContent value='claude-code' className='mt-6'>
            <div className='space-y-6'>
              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
                    1
                  </span>
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
                  <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
                    2
                  </span>
                  <Text as='p' className='font-medium'>
                    Register the MCP server
                  </Text>
                </div>
                <div className='ml-8'>
                  <CodeBlock code={CLAUDE_CODE_CONFIG} language='bash' />
                  <p className='mt-2 text-xs text-muted-foreground'>
                    Then set env vars in <code className='rounded bg-muted px-1 font-mono text-xs'>~/.claude.json</code>{' '}
                    or via <code className='rounded bg-muted px-1 font-mono text-xs'>claude mcp edit vada</code>.
                  </p>
                </div>
              </div>
              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
                    3
                  </span>
                  <Text as='p' className='font-medium'>
                    Verify
                  </Text>
                </div>
                <p className='ml-8 text-sm text-muted-foreground'>
                  Run <code className='rounded bg-muted px-1 font-mono text-xs'>claude mcp list</code> — vada should
                  appear. In a Claude Code session, vada__deliberate_brokered is available as a tool.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='generic' className='mt-6'>
            <InstallSteps
              configPath='Consult your MCP client docs for the config file location'
              config={GENERIC_CONFIG}
              restartNote='Restart your MCP client to pick up the new server config.'
              verifyNote='The client tool list should include vada__deliberate_brokered and vada__deliberate.'
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
