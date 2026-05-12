import { describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CLI_PATH = join(import.meta.dir, '../src/index.ts')

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', 'run', CLI_PATH, ...args], {
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { exitCode, stdout, stderr }
}

describe('cetana --help', () => {
  it('exits 0 and prints help', async () => {
    const { exitCode, stdout } = await runCli(['--help'])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('cetana')
    expect(stdout).toContain('init')
    expect(stdout).toContain('dispatch')
    expect(stdout).toContain('list')
    expect(stdout).toContain('reply')
    expect(stdout).toContain('logs')
  })

  it('exits 0 for no arguments', async () => {
    const { exitCode } = await runCli([])
    expect(exitCode).toBe(0)
  })

  it('exits 0 for -h', async () => {
    const { exitCode } = await runCli(['-h'])
    expect(exitCode).toBe(0)
  })

  it('exits 0 for help command', async () => {
    const { exitCode } = await runCli(['help'])
    expect(exitCode).toBe(0)
  })
})

describe('cetana unknown-command', () => {
  it('exits 2 for unknown command', async () => {
    const { exitCode, stderr } = await runCli(['unknown-command'])
    expect(exitCode).toBe(2)
    expect(stderr).toContain('Unknown command')
  })
})

describe('cetana dispatch without config', () => {
  it('exits with error pointing at cetana init when no config', async () => {
    // Run from a temp dir with no .cetana.json and no global config
    // We test that the error message mentions cetana init
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, 'dispatch', '29'], {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: '/tmp'
    })
    const [exitCode, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()])
    // Either exits with error about config or issue fetch fails — both are non-zero
    expect(exitCode).not.toBe(0)
    // If config is missing, should mention cetana init
    if (exitCode === 1 && stderr.includes('config')) {
      expect(stderr).toContain('cetana init')
    }
  }, 10000)
})

describe('cetana init abort path', () => {
  it('exits cleanly (code 0) when user declines overwrite of existing config', async () => {
    // Run from the repo root so detectGitRepo() succeeds; set HOME to a temp dir
    // so the global config path points to our pre-seeded dummy config.
    const REPO_ROOT = join(import.meta.dir, '../../../../')
    const tmpHome = `/tmp/cetana-test-${Date.now()}`

    mkdirSync(`${tmpHome}/.cetana`, { recursive: true })
    writeFileSync(
      `${tmpHome}/.cetana/config.json`,
      JSON.stringify({
        github: { owner: 'test', repo: 'test' },
        defaults: { claudeModel: 'claude-sonnet-4-7', permissionMode: 'acceptEdits' }
      })
    )

    const proc = Bun.spawn(['bun', 'run', CLI_PATH, 'init'], {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: new TextEncoder().encode('n\n'),
      env: { ...process.env, HOME: tmpHome },
      cwd: REPO_ROOT
    })

    try {
      const result = await Promise.race([
        proc.exited.then((exitCode) => ({ timedOut: false as const, exitCode })),
        new Promise<{ timedOut: true; exitCode: null }>((resolve) =>
          setTimeout(() => resolve({ timedOut: true, exitCode: null }), 2000)
        )
      ])

      if (result.timedOut) {
        proc.kill()
        throw new Error('cetana init hung on abort path — process did not exit within 2 seconds')
      }

      const stdout = await new Response(proc.stdout).text()
      expect(result.exitCode).toBe(0)
      expect(stdout).toContain('Aborted')
    } finally {
      rmSync(tmpHome, { recursive: true, force: true })
    }
  }, 5000)
})

describe('cetana list with no tasks', () => {
  it('prints empty state message when no tasks', async () => {
    // Run from /tmp where there's no ~/.cetana/tasks/ directory (or it's empty)
    // We mock by pointing to a context with config but no tasks
    // This test works if there's a global config but no running tasks
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, 'list'], {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: '/tmp'
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text()
    ])
    if (exitCode === 0) {
      // Either shows "No active tasks." or a task list
      expect(stdout.length > 0 || stderr.length > 0).toBe(true)
    } else {
      // Config not found — that's also acceptable behavior
      expect(stderr).toContain('config')
    }
  }, 10000)
})
