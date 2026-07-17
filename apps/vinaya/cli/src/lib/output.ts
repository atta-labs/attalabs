export function printHelp(): void {
  process.stdout.write(`vinaya — Vinaya CLI

USAGE
  vinaya <command> [options]

COMMANDS
  help                          Show this help text
  version                       Print the CLI version
    --json                        Enveloped JSON output (schema: 1)
  studio                        Launch local Vinaya Studio against this repo

Run 'vinaya version' to check what's installed.
`)
}
