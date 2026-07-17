export function printHelp(): void {
  process.stdout.write(`vinaya — Vinaya CLI

USAGE
  vinaya <command> [options]

COMMANDS
  help                          Show this help text
  version                       Print the CLI version
    --json                        Enveloped JSON output (schema: 1)
  studio                        Launch local Vinaya Studio against this repo
  check <name> | --all          Run one check, or every registered check
    --json                        Enveloped JSON output (schema: 1)
    --diff-only                   Scope diff-declared checks to changed files
    --parallel[=n]                Concurrency cap (default: cpu-derived)
  new check <name>               Scaffold a custom check into ./scripts/vinaya-checks/

Run 'vinaya version' to check what's installed.
`)
}
