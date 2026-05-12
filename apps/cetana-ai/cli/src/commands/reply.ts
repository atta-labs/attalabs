import { StateManager, createReplyToBlockedTask } from '@atta/cetana-coordinator'
import { loadConfig } from '../lib/config.js'

export async function replyCommand(args: string[]): Promise<void> {
  const [taskId, message] = args

  if (!taskId || !message) {
    console.error('Usage: cetana reply <task-id> "<message>"')
    process.exit(1)
  }

  if (message.trim().length === 0) {
    console.error('Error: Message cannot be empty.')
    process.exit(1)
  }

  const config = loadConfig()
  if (!config) {
    console.error('Error: No config found. Run `cetana init` to set up Cetana.')
    process.exit(1)
  }

  const state = new StateManager()
  await state.hydrate()

  // Support prefix matching for task-id
  const allTasks = state.listAll()
  const matches = allTasks.filter((t) => t.taskId.startsWith(taskId))
  if (matches.length === 0) {
    console.error(`Error: Task not found: ${taskId}`)
    process.exit(1)
  }
  if (matches.length > 1) {
    console.error(`Error: Ambiguous task ID prefix '${taskId}' matches ${matches.length} tasks:`)
    for (const m of matches) {
      console.error(`  ${m.taskId}`)
    }
    process.exit(1)
  }

  const task = matches[0]
  if (!task) {
    console.error(`Error: Task not found: ${taskId}`)
    process.exit(1)
  }

  if (task.status !== 'blocked') {
    console.error(`Error: Task ${task.taskId} is not blocked (status: ${task.status}).`)
    process.exit(1)
  }

  const tool = createReplyToBlockedTask({ state })
  const result = await tool.handler({ task_id: task.taskId, reply: message })

  if ('isError' in result && result.isError) {
    const text = result.content[0]?.type === 'text' ? result.content[0].text : 'Unknown error'
    console.error(`Error: ${text}`)
    process.exit(1)
  }

  console.info(`Reply sent. Task ${task.taskId} unblocked.`)
}
