import { execFile } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { StateManager } from '@atta/cetana-coordinator'
import { configPath, writeConfig } from '../lib/config.js'
import type { CliConfig } from '../lib/config.js'

const execFileAsync = promisify(execFile)

// Shared line buffer across prompt() calls so piped input isn't lost between reads
let stdinBuffer = ''
let stdinEnded = false
const pendingResolvers: Array<(line: string) => void> = []

function flushLines(): void {
  while (stdinBuffer.includes('\n') && pendingResolvers.length > 0) {
    const idx = stdinBuffer.indexOf('\n')
    const line = stdinBuffer.slice(0, idx).trim()
    stdinBuffer = stdinBuffer.slice(idx + 1)
    const resolve = pendingResolvers.shift()
    if (resolve) resolve(line)
  }
  // If stdin ended and there's remaining content (no trailing newline), flush it
  if (stdinEnded && stdinBuffer.length > 0 && pendingResolvers.length > 0) {
    const line = stdinBuffer.trim()
    stdinBuffer = ''
    const resolve = pendingResolvers.shift()
    if (resolve) resolve(line)
  }
  // If stdin ended with no more content, resolve pending with empty string (accept defaults)
  if (stdinEnded) {
    while (pendingResolvers.length > 0) {
      const resolve = pendingResolvers.shift()
      if (resolve) resolve('')
    }
  }
}

function setupStdinReader(): void {
  if (process.stdin.listenerCount('data') > 0) return
  process.stdin.setEncoding('utf-8')
  process.stdin.on('data', (chunk: string) => {
    stdinBuffer += chunk
    flushLines()
  })
  process.stdin.on('end', () => {
    stdinEnded = true
    flushLines()
  })
  process.stdin.resume()
}

async function prompt(question: string): Promise<string> {
  process.stdout.write(question)
  setupStdinReader()
  // If stdin already ended, resolve immediately with empty (accept default)
  if (stdinEnded && pendingResolvers.length === 0) {
    return ''
  }
  return new Promise((resolve) => {
    pendingResolvers.push(resolve)
    // If stdin is already ended, flush now
    if (stdinEnded) flushLines()
  })
}

async function promptWithDefault(question: string, defaultValue: string): Promise<string> {
  const answer = await prompt(`${question} [${defaultValue}]: `)
  return answer.length > 0 ? answer : defaultValue
}

async function promptYesNo(question: string, defaultYes = false): Promise<boolean> {
  const hint = defaultYes ? 'Y/n' : 'y/N'
  const answer = await prompt(`${question} (${hint}): `)
  if (answer.length === 0) return defaultYes
  return answer.toLowerCase().startsWith('y')
}

async function detectGitRepo(): Promise<{ repoRoot: string; owner: string; repo: string } | null> {
  try {
    const { stdout: repoRoot } = await execFileAsync('git', ['rev-parse', '--show-toplevel'])
    const root = repoRoot.trim()

    const { stdout: remoteUrl } = await execFileAsync('git', ['remote', 'get-url', 'origin'])
    const url = remoteUrl.trim()

    // Parse owner/repo from various git URL formats:
    // https://github.com/owner/repo.git or git@github.com:owner/repo.git
    const httpsMatch = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
    if (httpsMatch) {
      return { repoRoot: root, owner: httpsMatch[1] ?? '', repo: httpsMatch[2] ?? '' }
    }
    return { repoRoot: root, owner: '', repo: '' }
  } catch {
    return null
  }
}

async function checkGhAuth(): Promise<boolean> {
  try {
    await execFileAsync('gh', ['auth', 'status'])
    return true
  } catch {
    return false
  }
}

export async function initCommand(_args: string[]): Promise<void> {
  console.info('Cetana init — interactive setup\n')

  // 1. Detect environment
  const gitInfo = await detectGitRepo()
  if (!gitInfo) {
    console.error('Error: Not in a git repository. Run cetana init from inside your repo.')
    process.exit(1)
  }

  const ghAuthed = await checkGhAuth()
  if (!ghAuthed) {
    console.error('Error: GitHub CLI not authenticated. Run `gh auth login` first.')
    process.exit(1)
  }

  // 2. Check existing config
  const existingPath = configPath()
  if (existingPath) {
    const overwrite = await promptYesNo(`Existing config found at ${existingPath}. Overwrite?`, false)
    if (!overwrite) {
      console.info('Aborted. Existing config unchanged.')
      return
    }
  }

  // 3. Choose config scope
  console.info('\nWhere should Cetana config live?')
  console.info('  A) Repo-local .cetana.json in this repo (default)')
  console.info('  B) Global ~/.cetana/config.json')
  const scopeAnswer = await prompt('Choice [A]: ')
  const scope: 'local' | 'global' = scopeAnswer.toUpperCase() === 'B' ? 'global' : 'local'

  // 4. Confirm / override detected values
  console.info('\nGitHub settings:')
  const owner = await promptWithDefault('  owner', gitInfo.owner || 'your-github-username')
  const repo = await promptWithDefault('  repo', gitInfo.repo || 'your-repo-name')

  console.info('\nDefaults:')
  const claudeModel = await promptWithDefault('  claudeModel', 'claude-sonnet-4-7')
  const permissionModeRaw = await promptWithDefault('  permissionMode (default/acceptEdits)', 'acceptEdits')
  const permissionMode = permissionModeRaw === 'default' ? 'default' : 'acceptEdits'

  const config: CliConfig = {
    github: { owner, repo },
    defaults: { claudeModel, permissionMode }
  }

  // 5. Write config
  writeConfig(scope, config, gitInfo.repoRoot)

  const writtenPath =
    scope === 'local' ? `${gitInfo.repoRoot}/.cetana.json` : `${process.env.HOME ?? '~'}/.cetana/config.json`
  console.info(`\nConfig written to ${writtenPath}`)

  // 6. Add .cetana.json to .gitignore for local scope
  if (scope === 'local') {
    const gitignorePath = `${gitInfo.repoRoot}/.gitignore`
    let alreadyIgnored = false
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8')
      alreadyIgnored = content.split('\n').some((line) => line.trim() === '.cetana.json')
    }
    if (!alreadyIgnored) {
      appendFileSync(gitignorePath, '\n# Cetana local config\n.cetana.json\n', 'utf-8')
      console.info('Added .cetana.json to .gitignore')
    }
  }

  // 7. Smoke test — hydrate StateManager to confirm coordinator wiring works
  try {
    const state = new StateManager()
    await state.hydrate()
    const active = state.list()
    console.info(`\nSmoke test passed. Active tasks: ${active.length}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`\nWarning: StateManager smoke test failed: ${msg}`)
    console.warn('Config written but coordinator may need troubleshooting.')
  }

  console.info('\nCetana ready. Try `cetana dispatch <issue-number>` to dispatch a task.')
}
