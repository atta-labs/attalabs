import { describe, expect, it } from 'vitest'
import { main, parseArgs, resolveTranscriptPath, sanitizeKey, transcriptPointerPath } from './report-tokens'

describe('sanitizeKey / transcriptPointerPath', () => {
  it('replaces every run of non-alphanumeric characters with a single hyphen', () => {
    expect(sanitizeKey('/Users/dani/Work/Repositories/Me/attalabs')).toBe('-Users-dani-Work-Repositories-Me-attalabs')
  })

  it('squeezes a run of consecutive non-alphanumeric characters into one hyphen', () => {
    // Regression: a worktree path's `/.worktrees` segment is a `/` immediately
    // followed by a `.` — two separate non-alnum characters in a row. The
    // hook's original `tr -c 'A-Za-z0-9' '-'` mapped each individually
    // (producing `--worktrees`), diverging from this regex's single-hyphen
    // squeeze and silently breaking pointer-file lookup end to end
    // (confirmed live against a real worktree before the hook was fixed to
    // pipe through `tr -s '-'` too).
    expect(sanitizeKey('/repo/.worktrees/task/misc-hardening-v1/1')).toBe('-repo-worktrees-task-misc-hardening-v1-1')
  })

  it('builds distinct pointer paths for distinct worktree directories — never a collision', () => {
    const main = transcriptPointerPath('/repo', '/tmp')
    const worktree = transcriptPointerPath('/repo/.worktrees/task/misc-hardening-v1/1', '/tmp')
    expect(main).not.toBe(worktree)
  })
})

describe('parseArgs', () => {
  it('requires --phase and --role', () => {
    expect(() => parseArgs([])).toThrow(/Usage:/)
    expect(() => parseArgs(['--phase', '1: develop'])).toThrow(/Usage:/)
  })

  it('parses phase, role, model, and a positional transcript path', () => {
    const parsed = parseArgs([
      '--phase',
      '1: develop',
      '--role',
      'Developer',
      '--model',
      'claude-sonnet-5',
      '/tmp/t.jsonl'
    ])
    expect(parsed).toEqual({
      phase: '1: develop',
      role: 'Developer',
      model: 'claude-sonnet-5',
      transcriptPath: '/tmp/t.jsonl'
    })
  })

  it('leaves model and transcriptPath undefined when omitted', () => {
    const parsed = parseArgs(['--phase', '1: review', '--role', 'Reviewer'])
    expect(parsed.model).toBeUndefined()
    expect(parsed.transcriptPath).toBeUndefined()
  })
})

describe('resolveTranscriptPath', () => {
  const baseDeps = {
    env: { CLAUDE_PROJECT_DIR: '/repo', TMPDIR: '/tmp' },
    cwd: '/repo',
    exists: (_path: string) => false,
    readFile: (_path: string) => ''
  }

  it('returns the explicit path unchanged, never touching the pointer file — path comes in, never scanned', () => {
    const exists = () => {
      throw new Error('must not check the pointer file when an explicit path is given')
    }
    const resolved = resolveTranscriptPath('/explicit/path.jsonl', { ...baseDeps, exists })
    expect(resolved).toBe('/explicit/path.jsonl')
  })

  it('reads the transcript path out of the pointer file when none is given', () => {
    const resolved = resolveTranscriptPath(undefined, {
      ...baseDeps,
      exists: (path) => path === '/tmp/claude-transcript--repo.txt',
      readFile: () => 'session-abc\t/home/user/.claude/projects/-repo/session-abc.jsonl\n'
    })
    expect(resolved).toBe('/home/user/.claude/projects/-repo/session-abc.jsonl')
  })

  it('throws — never silently falls back to a `—` line — when no pointer file exists yet', () => {
    expect(() => resolveTranscriptPath(undefined, baseDeps)).toThrow(/No transcript pointer/)
  })

  it('throws on a malformed pointer file rather than guessing a path', () => {
    expect(() =>
      resolveTranscriptPath(undefined, { ...baseDeps, exists: () => true, readFile: () => 'not-tab-separated' })
    ).toThrow(/malformed/)
  })

  it('falls back to cwd when CLAUDE_PROJECT_DIR is unset', () => {
    const resolved = resolveTranscriptPath(undefined, {
      env: { TMPDIR: '/tmp' },
      cwd: '/repo',
      exists: (path) => path === transcriptPointerPath('/repo', '/tmp'),
      readFile: () => 'session-abc\t/some/transcript.jsonl\n'
    })
    expect(resolved).toBe('/some/transcript.jsonl')
  })

  it('throws on a stale pointer — the current session id disagrees with the one the pointer was written for', () => {
    // Regression (code review, PR #800): a worktree reused across sessions
    // can hold a pointer written by a PREVIOUS session, still present
    // because the new session's own Stop hook hasn't fired yet. Silently
    // reading it would reproduce the exact wrong-session-attribution bug
    // this reporter exists to prevent, one session later.
    expect(() =>
      resolveTranscriptPath(undefined, {
        ...baseDeps,
        env: { ...baseDeps.env, CLAUDE_CODE_SESSION_ID: 'current-session' },
        exists: () => true,
        readFile: () => 'previous-session\t/home/user/.claude/projects/-repo/previous-session.jsonl\n'
      })
    ).toThrow(/stale/)
  })

  it('succeeds when the current session id matches the pointer', () => {
    const resolved = resolveTranscriptPath(undefined, {
      ...baseDeps,
      env: { ...baseDeps.env, CLAUDE_CODE_SESSION_ID: 'same-session' },
      exists: () => true,
      readFile: () => 'same-session\t/home/user/.claude/projects/-repo/same-session.jsonl\n'
    })
    expect(resolved).toBe('/home/user/.claude/projects/-repo/same-session.jsonl')
  })

  it('trusts the pointer with no staleness check when CLAUDE_CODE_SESSION_ID is unavailable', () => {
    // The env var is confirmed present in every Claude Code Bash tool call
    // but isn't part of the documented public hook JSON schema — treated as
    // a best-effort cross-check, not a hard requirement.
    const resolved = resolveTranscriptPath(undefined, {
      ...baseDeps,
      exists: () => true,
      readFile: () => 'some-session\t/home/user/.claude/projects/-repo/some-session.jsonl\n'
    })
    expect(resolved).toBe('/home/user/.claude/projects/-repo/some-session.jsonl')
  })
})

describe('main', () => {
  const runDeps = (overrides: Partial<Parameters<typeof main>[1]> = {}) => ({
    env: {},
    cwd: '/repo',
    exists: () => false,
    readFile: () => '',
    ...overrides
  })

  it('throws rather than emitting a plausible-looking `0/0/—` for a transcript with zero usable messages', () => {
    // Regression (code review, PR #800): an empty, unparseable, or
    // not-yet-flushed transcript previously formatted as an exact `0/0/—`
    // line — indistinguishable, once parsed, from a session that genuinely
    // spent zero tokens.
    expect(() =>
      main(
        ['--phase', '1: develop', '--role', 'Developer', '/tmp/empty.jsonl'],
        runDeps({ readFile: (path) => (path === '/tmp/empty.jsonl' ? '' : '') })
      )
    ).toThrow(/zero assistant messages/)
  })
})
