import { describe, expect, it } from 'bun:test'
import {
  DEFAULT_GRACEFUL_TERMINATION_MS,
  FORCED_TERMINATION_SIGNAL,
  GRACEFUL_TERMINATION_SIGNAL,
  isProcessAbandoned,
  ProcessCancelledError,
  ProcessTerminatedError,
  ProcessTimedOutError,
  spawnProcessLifecycle,
  type SpawnedProcessLike
} from './process-lifecycle'
import { attachStreamReader } from './stream-reader'

/** A scripted child process: emits its events on command and records every signal delivered to it. */
interface FakeChild extends SpawnedProcessLike {
  signals: NodeJS.Signals[]
  emitStdout(text: string): void
  emitClose(code: number | null): void
  emitError(err: Error): void
}

function createFakeChild(): FakeChild {
  const stdoutListeners: Array<(chunk: Buffer | string) => void> = []
  const closeListeners: Array<(code: number | null) => void> = []
  const errorListeners: Array<(err: Error) => void> = []

  const child: FakeChild = {
    signals: [],
    stdin: { write: () => {}, end: () => {} },
    stdout: { on: (_event, listener) => stdoutListeners.push(listener) },
    stderr: { on: () => {} },
    on: (event, listener) => {
      if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      if (event === 'error') errorListeners.push(listener as (err: Error) => void)
    },
    kill: (signal) => {
      child.signals.push(signal ?? GRACEFUL_TERMINATION_SIGNAL)
    },
    emitStdout: (text) => {
      for (const listener of stdoutListeners) listener(text)
    },
    emitClose: (code) => {
      for (const listener of closeListeners) listener(code)
    },
    emitError: (err) => {
      for (const listener of errorListeners) listener(err)
    }
  }

  return child
}

/** Spawns a lifecycle around a fake child, returning both so a test can drive the process and the wait together. */
function spawnFake(overrides?: { signal?: AbortSignal; timeoutMs?: number; gracefulTerminationMs?: number }) {
  const child = createFakeChild()
  const handle = spawnProcessLifecycle({
    spawnFn: () => child,
    command: 'fake-cli',
    args: ['-p'],
    cwd: '/tmp',
    env: {},
    timeoutMs: overrides?.timeoutMs ?? 60_000,
    nodeId: 'review',
    agentRole: 'reviewer',
    signal: overrides?.signal,
    gracefulTerminationMs: overrides?.gracefulTerminationMs ?? 10
  })
  return { child, handle }
}

/** Yields to the event loop for `ms`, letting the lifecycle's own timers fire. */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('spawnProcessLifecycle — cancellation propagation (O1)', () => {
  it('signals the active child when the cancellation signal fires', async () => {
    const controller = new AbortController()
    const { child, handle } = spawnFake({ signal: controller.signal })
    const waiting = handle.waitForExit()

    controller.abort()
    expect(child.signals).toEqual([GRACEFUL_TERMINATION_SIGNAL])

    // The child obeys the graceful signal, so nothing escalates.
    child.emitClose(143)
    const error = await waiting.catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ProcessCancelledError)
    const cancelled = error as ProcessCancelledError
    expect(cancelled.forced).toBe(false)
    expect(cancelled.spawned).toBe(true)
    expect(cancelled.nodeId).toBe('review')
    expect(child.signals).toEqual([GRACEFUL_TERMINATION_SIGNAL])
  })

  it('spawns nothing at all when the signal is already aborted', () => {
    const controller = new AbortController()
    controller.abort()
    let spawnCalls = 0

    expect(() =>
      spawnProcessLifecycle({
        spawnFn: () => {
          spawnCalls += 1
          return createFakeChild()
        },
        command: 'fake-cli',
        args: ['-p'],
        cwd: '/tmp',
        env: {},
        timeoutMs: 60_000,
        nodeId: 'review',
        agentRole: 'reviewer',
        signal: controller.signal
      })
    ).toThrow(ProcessCancelledError)

    expect(spawnCalls).toBe(0)
  })

  it('reports an already-aborted cancellation as one that never spawned', () => {
    const controller = new AbortController()
    controller.abort()

    let thrown: unknown
    try {
      spawnFake({ signal: controller.signal })
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeInstanceOf(ProcessCancelledError)
    const cancelled = thrown as ProcessCancelledError
    expect(cancelled.spawned).toBe(false)
    expect(cancelled.forced).toBe(false)
  })

  it("carries a string abort reason, and omits a signal's default DOMException reason", async () => {
    const withReason = new AbortController()
    const withoutReason = new AbortController()
    const reasoned = spawnFake({ signal: withReason.signal })
    const bare = spawnFake({ signal: withoutReason.signal })
    const reasonedWait = reasoned.handle.waitForExit()
    const bareWait = bare.handle.waitForExit()

    withReason.abort('the enclosing request was closed')
    withoutReason.abort()
    reasoned.child.emitClose(143)
    bare.child.emitClose(143)

    const reasonedError = (await reasonedWait.catch((err: unknown) => err)) as ProcessCancelledError
    const bareError = (await bareWait.catch((err: unknown) => err)) as ProcessCancelledError

    expect(reasonedError.cancellationReason).toBe('the enclosing request was closed')
    expect(reasonedError.message).toContain('the enclosing request was closed')
    expect(bareError.cancellationReason).toBeUndefined()
  })

  it("reports a cancelled child's own exit as cancelled, never as a clean result", async () => {
    const controller = new AbortController()
    const { child, handle } = spawnFake({ signal: controller.signal })
    const waiting = handle.waitForExit()

    controller.abort()
    // A child that chose to exit 0 on SIGTERM still exited because it was
    // signalled — resolving 0 here would report a cancelled step as complete.
    child.emitClose(0)

    await expect(waiting).rejects.toBeInstanceOf(ProcessCancelledError)
  })

  it('leaves an already-settled clean exit alone when a cancellation lands afterwards', async () => {
    const controller = new AbortController()
    const { child, handle } = spawnFake({ signal: controller.signal })
    const waiting = handle.waitForExit()

    child.emitClose(0)
    await expect(waiting).resolves.toBe(0)

    controller.abort()
    // The abort listener is detached on settlement, so nothing signals a
    // process that already exited.
    expect(child.signals).toEqual([])
  })

  it('exposes the signal it was bound to on the handle', () => {
    const controller = new AbortController()
    const { handle } = spawnFake({ signal: controller.signal })
    expect(handle.signal).toBe(controller.signal)
  })

  it('captures a close that lands before anything waits on the exit', async () => {
    const { child, handle } = spawnFake()
    // Registering listeners at spawn time rather than per `waitForExit` call
    // is what keeps this exit from being missed entirely.
    child.emitClose(0)
    await expect(handle.waitForExit()).resolves.toBe(0)
  })
})

describe('spawnProcessLifecycle — bounded termination escalation (O3)', () => {
  it('escalates to the forced signal when the graceful one does not end the process in time', async () => {
    const controller = new AbortController()
    const { child, handle } = spawnFake({ signal: controller.signal, gracefulTerminationMs: 10 })
    const waiting = handle.waitForExit()

    controller.abort()
    expect(child.signals).toEqual([GRACEFUL_TERMINATION_SIGNAL])

    // The child never closes: the wait must still settle, on the deadline.
    const error = (await waiting.catch((err: unknown) => err)) as ProcessCancelledError

    expect(error).toBeInstanceOf(ProcessCancelledError)
    expect(error.forced).toBe(true)
    expect(child.signals).toEqual([GRACEFUL_TERMINATION_SIGNAL, FORCED_TERMINATION_SIGNAL])
    expect(error.message).toContain(FORCED_TERMINATION_SIGNAL)
  })

  it('does not send the forced signal when the child exits on the graceful one', async () => {
    const controller = new AbortController()
    const { child, handle } = spawnFake({ signal: controller.signal, gracefulTerminationMs: 10 })
    const waiting = handle.waitForExit()

    controller.abort()
    child.emitClose(143)
    await waiting.catch(() => undefined)
    await sleep(40)

    expect(child.signals).toEqual([GRACEFUL_TERMINATION_SIGNAL])
  })

  it('escalates after a timeout too, so a child that ignores the graceful signal still ends', async () => {
    const { child, handle } = spawnFake({ timeoutMs: 5, gracefulTerminationMs: 10 })

    await expect(handle.waitForExit()).rejects.toBeInstanceOf(ProcessTimedOutError)
    expect(child.signals).toEqual([GRACEFUL_TERMINATION_SIGNAL])

    // The escalation deliberately outlives the rejection: the caller already
    // knows the step is over, and the process still has to be made to end.
    await sleep(40)
    expect(child.signals).toEqual([GRACEFUL_TERMINATION_SIGNAL, FORCED_TERMINATION_SIGNAL])
  })

  it('abandons a child that survived the forced signal, so the stream reader stops framing', async () => {
    const controller = new AbortController()
    const { child, handle } = spawnFake({ signal: controller.signal, gracefulTerminationMs: 10 })
    const reported: unknown[] = []
    attachStreamReader(child, (events) => reported.push(...events))
    const waiting = handle.waitForExit()

    child.emitStdout('{"seq":1}\n')
    controller.abort()
    await waiting.catch(() => undefined)

    expect(isProcessAbandoned(child)).toBe(true)

    // A child that outlived SIGKILL can keep writing to a pipe nothing waits
    // on; reporting those records for an already-cancelled node is worse than
    // dropping them.
    child.emitStdout('{"seq":2}\n')
    expect(reported).toEqual([{ seq: 1 }])
  })

  it('never abandons a child that closed on its own', async () => {
    const { child, handle } = spawnFake()
    child.emitClose(0)
    await handle.waitForExit()
    expect(isProcessAbandoned(child)).toBe(false)
  })

  it('gives the graceful signal a bounded window by default', () => {
    expect(DEFAULT_GRACEFUL_TERMINATION_MS).toBeGreaterThan(0)
    expect(Number.isFinite(DEFAULT_GRACEFUL_TERMINATION_MS)).toBe(true)
  })
})

describe('spawnProcessLifecycle — typed outcomes, three-way distinct (O2)', () => {
  it('tells a cancellation, a timeout and an execution failure apart by type', async () => {
    const controller = new AbortController()
    const cancelledRun = spawnFake({ signal: controller.signal, gracefulTerminationMs: 5 })
    const cancelledWait = cancelledRun.handle.waitForExit()
    controller.abort()
    const cancelled = await cancelledWait.catch((err: unknown) => err)

    const timedOutRun = spawnFake({ timeoutMs: 5, gracefulTerminationMs: 5 })
    const timedOut = await timedOutRun.handle.waitForExit().catch((err: unknown) => err)

    const failedRun = spawnFake()
    const failedWait = failedRun.handle.waitForExit()
    failedRun.child.emitError(new Error('ENOENT'))
    const failed = await failedWait.catch((err: unknown) => err)

    expect(cancelled).toBeInstanceOf(ProcessCancelledError)
    expect(timedOut).toBeInstanceOf(ProcessTimedOutError)
    expect(failed).toBeInstanceOf(Error)

    // Cancellation is not a timeout, a timeout is not a cancellation, and a
    // failure to execute is neither — there is no shared "it did not finish".
    expect(cancelled).not.toBeInstanceOf(ProcessTimedOutError)
    expect(timedOut).not.toBeInstanceOf(ProcessCancelledError)
    expect(failed).not.toBeInstanceOf(ProcessTerminatedError)

    expect((cancelled as ProcessCancelledError).reason).toBe('cancelled')
    expect((timedOut as ProcessTimedOutError).reason).toBe('timed-out')
    expect((failed as Error).message).toContain("Failed to spawn 'fake-cli'")
  })

  it('names each typed outcome distinctly, which is all a checkpoint store keeps', async () => {
    const controller = new AbortController()
    const cancelledRun = spawnFake({ signal: controller.signal, gracefulTerminationMs: 5 })
    const cancelledWait = cancelledRun.handle.waitForExit()
    controller.abort()
    const cancelled = (await cancelledWait.catch((err: unknown) => err)) as Error
    const timedOut = (await spawnFake({ timeoutMs: 5, gracefulTerminationMs: 5 })
      .handle.waitForExit()
      .catch((err: unknown) => err)) as Error

    expect(cancelled.name).toBe('ProcessCancelledError')
    expect(timedOut.name).toBe('ProcessTimedOutError')
  })

  it('keeps the timeout message callers already match on', async () => {
    const { handle } = spawnFake({ timeoutMs: 20, gracefulTerminationMs: 5 })
    await expect(handle.waitForExit()).rejects.toThrow(/exceeded its 20ms timeout/)
  })

  it('reports a timeout that has already settled as a timeout when a cancellation follows', async () => {
    const controller = new AbortController()
    const { handle } = spawnFake({ signal: controller.signal, timeoutMs: 5, gracefulTerminationMs: 200 })
    // Attached before the wait can settle: the timeout fires during the sleep
    // below, and an unhandled rejection there would fail the run for the wrong
    // reason.
    const settled = handle.waitForExit().catch((err: unknown) => err)

    await sleep(20)
    controller.abort()

    expect(await settled).toBeInstanceOf(ProcessTimedOutError)
  })

  it('keeps a cancellation typed when the kill itself fails (round 2 review)', async () => {
    const controller = new AbortController()
    const { child, handle } = spawnFake({ signal: controller.signal, gracefulTerminationMs: 10 })
    const settled = handle.waitForExit().catch((err: unknown) => err)

    controller.abort()
    // Node emits `error` when the process could not be killed. Reporting that
    // as a failed spawn would hand back a plain Error for a run the caller
    // cancelled — the distinction this file exists to keep.
    child.emitError(new Error('kill ESRCH'))

    const error = await settled
    expect(error).toBeInstanceOf(ProcessCancelledError)
    expect((error as ProcessCancelledError).forced).toBe(true)
    // A graceful signal that could not be delivered is exactly what the forced
    // one is for, so the escalation must not have been disarmed.
    expect(child.signals).toEqual([GRACEFUL_TERMINATION_SIGNAL, FORCED_TERMINATION_SIGNAL])
  })

  it('keeps a timeout typed when the kill itself fails (round 2 review)', async () => {
    const { child, handle } = spawnFake({ timeoutMs: 5, gracefulTerminationMs: 10 })
    const settled = handle.waitForExit().catch((err: unknown) => err)

    await sleep(20)
    child.emitError(new Error('kill ESRCH'))

    expect(await settled).toBeInstanceOf(ProcessTimedOutError)
  })

  it('still reports a genuine spawn failure as an execution failure', async () => {
    const { child, handle } = spawnFake()
    const settled = handle.waitForExit().catch((err: unknown) => err)

    // No termination has begun, so this `error` is the child failing to start.
    child.emitError(new Error('ENOENT'))

    const error = await settled
    expect(error).not.toBeInstanceOf(ProcessTerminatedError)
    expect((error as Error).message).toContain("Failed to spawn 'fake-cli'")
  })

  it('settles a cancellation as cancelled even when the step bound elapses first (round 3 review)', async () => {
    const controller = new AbortController()
    // The step's own deadline is nearer than the graceful window, so the two
    // timers race — and cancellation was requested first, chronologically.
    const { child, handle } = spawnFake({ signal: controller.signal, timeoutMs: 5, gracefulTerminationMs: 60 })
    const settled = handle.waitForExit().catch((err: unknown) => err)

    controller.abort()
    await sleep(30)
    // The step bound has long since passed; nothing may have settled on it.
    child.emitClose(143)

    const error = await settled
    expect(error).toBeInstanceOf(ProcessCancelledError)
    expect(error).not.toBeInstanceOf(ProcessTimedOutError)
  })

  it('reports a cancellation that has already settled as a cancellation when the timeout follows', async () => {
    const controller = new AbortController()
    const { handle } = spawnFake({ signal: controller.signal, timeoutMs: 40, gracefulTerminationMs: 5 })
    const waiting = handle.waitForExit()

    controller.abort()
    const error = await waiting.catch((err: unknown) => err)
    await sleep(60)

    expect(error).toBeInstanceOf(ProcessCancelledError)
  })
})
