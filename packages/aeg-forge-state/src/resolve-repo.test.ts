import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetResolveRepoCache, resolveRepo } from './resolve-repo'

describe('resolveRepo — transient vs deterministic caching', () => {
  const originalRepo = process.env.AEG_REPO

  beforeEach(() => {
    resetResolveRepoCache()
    process.env.AEG_REPO = undefined
    delete process.env.AEG_REPO
  })

  afterEach(() => {
    if (originalRepo === undefined) delete process.env.AEG_REPO
    else process.env.AEG_REPO = originalRepo
    vi.restoreAllMocks()
  })

  it('does NOT cache a transient exec failure — a later succeeding call resolves', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const throwing = vi.fn(async () => {
      throw new Error('git remote lookup timed out')
    })
    expect(await resolveRepo(throwing)).toBeNull()
    expect(throwing).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(1)

    // The poisoned-cache regression: the next call must retry, not short-circuit.
    const succeeding = vi.fn(async () => ({ stdout: 'git@github.com:acme/widgets.git\n' }))
    expect(await resolveRepo(succeeding)).toEqual({ owner: 'acme', repo: 'widgets' })
    expect(succeeding).toHaveBeenCalledTimes(1)
  })

  it('caches a successful resolution — exec is not called on the second invoke', async () => {
    const succeeding = vi.fn(async () => ({ stdout: 'git@github.com:acme/widgets.git\n' }))
    expect(await resolveRepo(succeeding)).toEqual({ owner: 'acme', repo: 'widgets' })
    expect(await resolveRepo(succeeding)).toEqual({ owner: 'acme', repo: 'widgets' })
    expect(succeeding).toHaveBeenCalledTimes(1)
  })

  it('caches a deterministic null from an unparseable URL — no retry', async () => {
    const unparseable = vi.fn(async () => ({ stdout: 'file:///local/mirror.git\n' }))
    expect(await resolveRepo(unparseable)).toBeNull()
    expect(await resolveRepo(unparseable)).toBeNull()
    expect(unparseable).toHaveBeenCalledTimes(1)
  })

  it('uses AEG_REPO when set and never calls exec', async () => {
    process.env.AEG_REPO = 'octo/repo'
    const exec = vi.fn(async () => ({ stdout: 'git@github.com:acme/widgets.git\n' }))
    expect(await resolveRepo(exec)).toEqual({ owner: 'octo', repo: 'repo' })
    expect(exec).not.toHaveBeenCalled()
  })

  it('memoizes concurrent cold-cache calls into a single exec — closes the race', async () => {
    const fakeExec = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      return { stdout: 'git@github.com:acme/widgets.git\n' }
    })

    const results = await Promise.all([resolveRepo(fakeExec), resolveRepo(fakeExec), resolveRepo(fakeExec)])

    expect(fakeExec).toHaveBeenCalledTimes(1)
    for (const result of results) {
      expect(result).toEqual({ owner: 'acme', repo: 'widgets' })
    }
  })
})
