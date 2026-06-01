import { execFileSync } from 'node:child_process'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { resolveDispatchModel } from '@atta/models'
import { ATTA_REPO_PATH, taskDir } from './paths.js'

export interface SpawnArgs {
  taskId: string
  brief: string
  worktreePath: string
  model: string
  permissionMode: 'default' | 'acceptEdits'
  onStdout: (line: string) => void
  onExit: (code: number) => void
}

export interface SpawnResult {
  pid: number
  kill: () => void
}

const EXECUTOR_SERVER_PATH = join(ATTA_REPO_PATH, 'apps/cetana-ai/coordinator/src/mcp-server-executor.ts')

function resolveClaudeBinary(): string {
  try {
    const result = execFileSync('which', ['claude'], { encoding: 'utf-8' }).trim()
    if (result) return result
  } catch {}
  const candidates = [
    join(homedir(), '.npm-global', 'bin', 'claude'),
    join(homedir(), '.local', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude'
  ]
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { encoding: 'utf-8' })
      return candidate
    } catch {}
  }
  throw new Error('claude CLI not found. Install: npm install -g @anthropic-ai/claude-code')
}

async function generateMcpConfig(taskId: string): Promise<string> {
  const dir = taskDir(taskId)
  await mkdir(dir, { recursive: true })
  const configPath = join(dir, 'mcp-config.json')
  const config = {
    mcpServers: {
      cetana: {
        command: 'bun',
        args: ['run', EXECUTOR_SERVER_PATH],
        env: { CETANA_TASK_ID: taskId }
      }
    }
  }
  await writeFile(configPath, JSON.stringify(config, null, 2))
  return configPath
}

export async function spawnClaudeCode(args: SpawnArgs): Promise<SpawnResult> {
  const mcpConfigPath = await generateMcpConfig(args.taskId)
  const claudeBinPath = resolveClaudeBinary()
  const resolvedModel = resolveDispatchModel(args.model)

  const claudeArgs = [
    '-p',
    args.brief,
    '--mcp-config',
    mcpConfigPath,
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--verbose',
    '--allowedTools',
    'Read,Write,Edit,Bash,mcp__cetana__cetana_request_input',
    '--permission-mode',
    args.permissionMode,
    '--model',
    resolvedModel
  ]

  const systemEnv = {
    ...process.env,
    PATH: [process.env.PATH, '/usr/bin', '/usr/local/bin', '/bin', '/opt/homebrew/bin'].filter(Boolean).join(':')
  }

  const proc = spawn(claudeBinPath, claudeArgs, {
    cwd: args.worktreePath,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: systemEnv
  })

  let buffer = ''
  proc.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim()) args.onStdout(line)
    }
  })

  proc.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    for (const line of text.split('\n')) {
      if (line.trim()) args.onStdout(line)
    }
  })

  proc.on('exit', (code) => {
    args.onExit(code ?? 1)
  })

  if (!proc.pid) throw new Error('Failed to spawn claude process')

  return {
    pid: proc.pid,
    kill: () => proc.kill()
  }
}
