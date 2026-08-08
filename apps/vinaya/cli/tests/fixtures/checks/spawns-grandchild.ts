#!/usr/bin/env bun
// Fixture: spawns `sleep 60` as a further subprocess, then hangs itself
// until killed. Proves the runner's timeout kill reaches the whole process
// GROUP, not just this direct child — without process-group kill, this
// grandchild `sleep` would survive the runner killing this fixture.
import { spawn } from 'node:child_process'

spawn('sleep', ['60'], { stdio: 'ignore' })
await new Promise(() => {})
