import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the BLOCKER finding: a bare `void forceRefresh(slug)`
 * sitting next to `revalidatePath` in the same Server Action body still tied
 * the detached promise to the action's own response lifecycle — the button
 * blocked for the full ~13.7s derivation despite the `void`. The fix
 * schedules `forceRefresh` through `after()` (`next/server`), which runs its
 * callback outside the response lifecycle entirely.
 *
 * `next/server`'s real `after()` throws when called outside an active
 * request's `workAsyncStorage` scope (see `node_modules/next/dist/server/after/after.js`)
 * — a plain vitest environment has no such scope, so both `next/server` and
 * `next/cache` are mocked here the same way any Next-runtime-only API would
 * be in a unit test.
 */

const afterMock = vi.fn()
vi.mock('next/server', () => ({ after: (task: () => unknown) => afterMock(task) }))

const revalidatePathMock = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePathMock(path) }))

const forceRefreshMock = vi.fn()
vi.mock('./tranche-page-snapshot', () => ({ forceRefresh: (slug: string) => forceRefreshMock(slug) }))

const { refreshTrancheSnapshotAction } = await import('./refresh-snapshot-action')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('refreshTrancheSnapshotAction (finding 1: non-blocking refresh, O4)', () => {
  it('schedules forceRefresh through after() rather than calling it directly in the action body', async () => {
    await refreshTrancheSnapshotAction('my-project', 'my-tranche')

    expect(afterMock).toHaveBeenCalledTimes(1)
    // `forceRefresh` must not have run yet — it only runs once the
    // `after()`-scheduled callback is invoked (by the Next runtime, after
    // the response is sent), not synchronously inside the action.
    expect(forceRefreshMock).not.toHaveBeenCalled()

    const scheduledTask = afterMock.mock.calls[0]?.[0] as () => unknown
    await scheduledTask()
    expect(forceRefreshMock).toHaveBeenCalledWith('my-tranche')
  })

  it('resolves promptly even when the scheduled forceRefresh would take ~13.7s — the action never awaits it', async () => {
    // A `forceRefresh` that never resolves within this test's lifetime
    // proves the action isn't awaiting it: if it were, this test would hang
    // / time out instead of completing.
    forceRefreshMock.mockReturnValue(new Promise(() => {}))

    const action = refreshTrancheSnapshotAction('my-project', 'my-tranche')
    await expect(action).resolves.toBeUndefined()

    // The forceRefresh call only happens inside the after()-scheduled
    // callback, which this test deliberately never invokes — proving the
    // action's own completion in no way depends on it.
    expect(forceRefreshMock).not.toHaveBeenCalled()
  })

  it('still calls revalidatePath with the tranche route, name/slug percent-encoded', async () => {
    await refreshTrancheSnapshotAction('My Project', 'a/b')

    expect(revalidatePathMock).toHaveBeenCalledWith('/studio/projects/My%20Project/tranches/a%2Fb')
  })

  it('revalidatePath and after() are both invoked exactly once per action call', async () => {
    await refreshTrancheSnapshotAction('p', 's')
    await refreshTrancheSnapshotAction('p', 's')

    expect(afterMock).toHaveBeenCalledTimes(2)
    expect(revalidatePathMock).toHaveBeenCalledTimes(2)
  })
})
