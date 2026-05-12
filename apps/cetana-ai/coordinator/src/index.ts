// Public API surface for @atta/cetana-coordinator
// Used by the CLI package (@atta/cetana-cli) as a thin client.
// MCP server entry points are not exported here — they are standalone binaries.

export { loadConfig } from './config.js'
export type { CetanaConfig } from './config.js'

export { appendEvent, readEvents } from './events.js'
export type { CetanaEvent } from './events.js'

export { StateManager } from './state.js'
export type { ActiveTask } from './state.js'

export {
  CETANA_HOME,
  TASKS_DIR,
  CONFIG_PATH,
  taskLogPath,
  taskDir,
  questionFilePath,
  replyFilePath,
  worktreePath
} from './paths.js'

export { getIssue, postIssueComment } from './github.js'

export { createDispatchTask } from './tools/dispatch-task.js'
export { createListActiveTasks } from './tools/list-active-tasks.js'
export { createReplyToBlockedTask } from './tools/reply-to-blocked-task.js'
