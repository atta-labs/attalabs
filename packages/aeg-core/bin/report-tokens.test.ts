import { describe, expect, it } from 'vitest'
import { parseArgs, resolveTranscriptPath, sanitizeKey, transcriptPointerPath } from './report-tokens'

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
})
