import { describe, expect, it } from 'bun:test'
import {
  DEFAULT_GRACEFUL_TERMINATION_MS,
  FORCED_TERMINATION_SIGNAL,
  GRACEFUL_TERMINATION_SIGNAL,
  isProcessAbandoned,
  ProcessCancelledError,
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
