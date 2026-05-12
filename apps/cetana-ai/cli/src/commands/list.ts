import { StateManager, readEvents } from '@atta/cetana-coordinator'
import { taskStatus } from '../lib/heartbeat.js'
import { loadConfig } from '../lib/config.js'

function formatAge(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  return `${hours}h`
}

export async function listCommand(args: string[]): Promise<void> {
  const jsonMode = args.includes('--json')

  const config = loadConfig()
  if (!config) {
    console.error('Error: No config found. Run `cetana init` to set up Cetana.')
    process.exit(1)
  }

  const state = new StateManager()
  await state.hydrate()

  const tasks = state.listAll().filter((t) => t.status === 'running' || t.status === 'blocked')

  if (jsonMode) {
    console.info(JSON.stringify(tasks, null, 2))
    return
  }

  if (tasks.length === 0) {
    console.info('No active tasks.')
    return
  }

  // Header
  console.info('TASK ID          ISSUE  STATUS    AGE   QUESTION')
  console.info('-'.repeat(80))

  for (const task of tasks) {
    const events = await readEvents(task.taskId)
    const status = taskStatus(task, events)
    const age = formatAge(task.startedAt)
    const idShort = task.taskId.slice(0, 8)
    const question = task.pendingQuestion ? `"${task.pendingQuestion.question.slice(0, 40)}..."` : ''
    const lastEvent = status === 'CRASHED' ? `(last event: ${events[events.length - 1]?.type ?? 'none'})` : ''
    const display = question || lastEvent

    const statusStr = status.padEnd(8)
    const ageStr = age.padEnd(5)
    const issueStr = `#${task.issueNumber}`.padEnd(6)

    console.info(`${idShort.padEnd(16)} ${issueStr} ${statusStr}  ${ageStr} ${display}`)
  }
}
