#!/usr/bin/env bun
// Fixture: sleeps for `argv[0]` ms (default 0), then exits 0. Used to test
// runner-enforced timeouts and concurrency capping.
const ms = Number(process.argv[2] ?? '0')
await new Promise((resolve) => setTimeout(resolve, ms))
process.exit(0)
