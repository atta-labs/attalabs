#!/usr/bin/env bun
// Fixture: prints non-JSON garbage to stderr, exits 1 — must never read as a
// silent pass; the runner must surface it as `status: 'error'`.
process.stderr.write('this is not json\n')
process.exit(1)
