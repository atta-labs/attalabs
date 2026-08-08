#!/usr/bin/env bun
// Fixture: spawns a SIGTERM-trapping grandchild (stubborn-sleeper.ts), then
// hangs itself WITHOUT trapping SIGTERM. Proves the runner's SIGKILL
// escalation still reaches a grandchild that outlives the DIRECT child's
// own close — this process dies fast on the group's initial SIGTERM (no
// handler), while the grandchild (which ignores SIGTERM) does not, and can
// only be reaped by the awaited escalation.
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const stubborn = join(import.meta.dir, 'stubborn-sleeper.ts')
spawn('bun', [stubborn, '10000'], { stdio: 'ignore' })
await new Promise(() => {})
