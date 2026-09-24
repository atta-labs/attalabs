import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'bun:test'

/**
 * Exercises `secret-scan.ts` (`atta-labs/secret-scan`) as a real subprocess —
 * the same way the vinaya check runner invokes it — against a disposable git
 * fixture repo, never against this repository's own history.
 *
 * Each fixture fakes the `origin/main` tracking ref the check diffs against
 * (`--log-opts origin/main..HEAD`) with `git update-ref`, so no network
 * fetch or real remote is needed to exercise the check's real commit-range
 * behavior.
 */

const SCRIPT_PATH = join(import.meta.dir, 'secret-scan.ts')
const BUN_PATH = process.execPath

// A syntactically well-formed but entirely fabricated RSA private key body —
// gitleaks' built-in `private-key` rule matches on the PEM header/footer and
// body shape alone, not on whether the key material is real. (An AWS-style
// `AKIA...EXAMPLE` id was tried first and does NOT trigger: gitleaks' default
// ruleset allowlists documentation placeholders containing `EXAMPLE`.)
//
// The PEM header/footer markers are built by concatenation, not written as
// one contiguous literal, so this repo's OWN `atta-labs/secret-scan` check
// does not flag this test file's source when it scans this branch's real
// diff — only the runtime-joined fixture written to the disposable repo
// below is the full, contiguous marker gitleaks matches on.
const FAKE_PRIVATE_KEY = [
  ['-----BEGIN', ' RSA PRIVATE KEY-----'].join(''),
  'MIIEpAIBAAKCAQEA1c7+9z5Pad7OejecsQ0bu3aumnAxuNbiZ2yLIkdC+ZdikR5NqiO/lMXG',
  '5J1eB9F5VtqUpk9nBI3P9j0nDLBs7Ck9tSQdD1JVaWm3PA9GbGX8Jz0uw9wUj8OwQCUDoW3O',
  'FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE',
  ['-----END', ' RSA PRIVATE KEY-----'].join(''),
  ''
].join('\n')

const fixtures: string[] = []

afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function git(cwd: string, ...args: string[]): void {
  const result = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' })
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${result.stderr.toString()}`)
  }
}

/** A fresh git repo, one commit on `main`, with `origin/main` faked to point at it. */
function initFixtureRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'vinaya-secret-scan-fixture-'))
  fixtures.push(dir)

  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'vinaya-test@example.com')
  git(dir, 'config', 'user.name', 'Vinaya Test')
  git(dir, 'config', 'commit.gpgsign', 'false')

  writeFileSync(join(dir, 'README.md'), '# secret-scan fixture\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'initial commit')

  // Fake the fetched origin/main tracking ref the check's --log-opts range
  // diffs against, so the fixture never needs a real remote.
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'main')

  return dir
}

function runSecretScan(cwd: string, env: Record<string, string> = {}): Bun.SyncSubprocess<'pipe', 'pipe'> {
  return Bun.spawnSync([BUN_PATH, SCRIPT_PATH], {
    cwd,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe'
  })
}

describe('atta-labs/secret-scan', () => {
  it('fails when a planted fake key lands on the branch', () => {
    const dir = initFixtureRepo()
    writeFileSync(join(dir, 'secret.pem'), FAKE_PRIVATE_KEY)
    git(dir, 'add', '.')
    git(dir, 'commit', '-q', '-m', 'planted fake key')

    const result = runSecretScan(dir)

    expect(result.exitCode).toBe(1)
    const stderr = result.stderr.toString()
    expect(stderr).toContain('"check":"atta-labs/secret-scan"')
    expect(stderr).toContain('private-key')
  })

  it('passes on a clean diff', () => {
    const dir = initFixtureRepo()
    writeFileSync(join(dir, 'notes.md'), 'nothing secret in this change\n')
    git(dir, 'add', '.')
    git(dir, 'commit', '-q', '-m', 'clean change')

    const result = runSecretScan(dir)

    expect(result.exitCode).toBe(0)
    expect(result.stderr.toString()).toBe('')
  })

  it('fails rather than passes when the gitleaks binary is missing', () => {
    const dir = initFixtureRepo()

    // A PATH that resolves no `gitleaks` binary at all — the missing-scanner
    // case must fail closed, never be silently treated as a clean scan.
    const result = runSecretScan(dir, { PATH: '/nonexistent-bin-dir' })

    expect(result.exitCode).toBe(1)
    const stderr = result.stderr.toString()
    expect(stderr).toContain('"check":"atta-labs/secret-scan"')
    expect(stderr).toContain('gitleaks` is not resolvable on PATH')
  })
})
