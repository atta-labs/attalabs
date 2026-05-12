import { readFileSync } from 'node:fs'
import { StateManager, createDispatchTask, getIssue } from '@atta/cetana-coordinator'
import { loadConfig } from '../lib/config.js'

export async function dispatchCommand(args: string[]): Promise<void> {
  const [issueArg, ...rest] = args

  if (!issueArg) {
    console.error('Usage: cetana dispatch <issue-number> [--brief-file <path>] [--model <model>]')
    console.error('Run `cetana init` first if you have no config.')
    process.exit(1)
  }

  const issueNumber = Number.parseInt(issueArg, 10)
  if (Number.isNaN(issueNumber) || issueNumber <= 0) {
    console.error(`Error: Invalid issue number: ${issueArg}`)
    process.exit(1)
  }

  const config = loadConfig()
  if (!config) {
    console.error('Error: No config found. Run `cetana init` to set up Cetana.')
    process.exit(1)
  }

  // Parse flags
  let briefFile: string | undefined
  let modelOverride: string | undefined
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--brief-file' && rest[i + 1]) {
      briefFile = rest[i + 1]
      i++
    } else if (rest[i] === '--model' && rest[i + 1]) {
      modelOverride = rest[i + 1]
      i++
    }
  }

  const effectiveConfig = modelOverride
    ? { ...config, defaults: { ...config.defaults, claudeModel: modelOverride } }
    : config

  let brief: string | undefined
  if (briefFile) {
    try {
      brief = readFileSync(briefFile, 'utf-8').trim()
    } catch {
      console.error(`Error: Could not read brief file: ${briefFile}`)
      process.exit(1)
    }
  }

  // If no brief file, fetch issue body
  if (!brief) {
    const issue = await getIssue(issueNumber)
    brief = issue.body.trim() || issue.title
    if (brief.length < 50) {
      brief = `${issue.title}\n\n${issue.body}`.trim()
    }
    if (brief.length < 50) {
      brief = brief.padEnd(50, '.')
    }
  }

  const state = new StateManager()
  await state.hydrate()

  const tool = createDispatchTask({ state, config: effectiveConfig })

  console.info(`Dispatching task for issue #${issueNumber}...`)

  const result = await tool.handler({ issue_number: issueNumber, brief, base_branch: 'main' })

  const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
  try {
    const info = JSON.parse(text) as { taskId: string; worktree: string; pid: number; issue: string }
    console.info('\nTask dispatched.')
    console.info(`  Task ID:  ${info.taskId}`)
    console.info(`  Issue:    ${info.issue}`)
    console.info(`  Worktree: ${info.worktree}`)
    console.info(`  PID:      ${info.pid}`)
    console.info("\nUse 'cetana list' to monitor.")
  } catch {
    console.info(text)
  }
}
