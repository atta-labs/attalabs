# @atta/cetana-cli

Cetana V0.5 CLI — five commands for managing Cetana tasks from the terminal without Claude Desktop.

## Install

```bash
cd /path/to/attaai
bun link --cwd apps/cetana-ai/cli
cetana init
```

## Commands

| Command | Description |
|---------|-------------|
| `cetana init` | Interactive setup — writes config without manual JSON editing |
| `cetana dispatch <issue>` | Dispatch a Claude Code agent for a GitHub issue |
| `cetana list` | List active and blocked tasks |
| `cetana reply <task-id> "<message>"` | Unblock a blocked agent |
| `cetana logs <task-id>` | Stream JSONL events for a task |

## Architecture

The CLI is a thin client over `@atta/cetana-coordinator` modules (D-022). No business logic lives here — argument parsing, prompts, and output formatting only.

See `apps/cetana-ai/README.md` for full documentation.
