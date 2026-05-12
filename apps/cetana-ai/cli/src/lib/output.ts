export function printHelp(): void {
  process.stdout.write(`cetana — Cetana V0.5 CLI

USAGE
  cetana <command> [options]

COMMANDS
  init                          Interactive setup — writes config without manual JSON editing
  dispatch <issue-number>       Dispatch a Claude Code agent for a GitHub issue
    --brief-file <path>           Read brief from a file instead of the issue body
    --model <model>               Override the default Claude model
  list                          List active tasks
    --json                        Raw JSON output
  reply <task-id> "<message>"   Reply to a blocked task, unblocking the agent
  logs <task-id>                Stream JSONL events for a task
    --follow                      Tail-follow the log (like tail -f)
    --since <ISO-timestamp>       Show only events after this timestamp

EXAMPLES
  cetana init
  cetana dispatch 29
  cetana dispatch 42 --brief-file ~/briefs/issue-42.md
  cetana list
  cetana reply abc12345 "Use the acceptEdits permission mode"
  cetana logs abc12345
  cetana logs abc12345 --follow

Run 'cetana init' first to set up your config.
`)
}
