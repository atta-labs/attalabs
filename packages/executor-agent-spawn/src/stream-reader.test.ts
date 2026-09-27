import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { PlanAgentSpawnNode } from '@atta/engine'
import { executeAgentSpawnNode } from './node-executor'
import type { SpawnedProcessLike, SpawnFn } from './process-lifecycle'
import { attachStreamReader, finalizeEvents, parseNdjson } from './stream-reader'
import type { AgentSpawnExecutorConfig } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'stream-reader-root-'))

const testNode: PlanAgentSpawnNode = {
  id: 'review',
  role: 'agent-spawn',
  kind: 'agent-spawn',
  promptTemplate: 'Review the diff.',
  agentRole: 'reviewer',
  permission: 'default',
  workingDirectory: workingDirectoryRoot,
  maxTurns: 5,
  metadata: {}
}

const baseConfig: AgentSpawnExecutorConfig = {
  workingDirectoryRoot,
  roleBinaries: {
    reviewer: {
      command: 'fake-cli',
      allowedPermissions: ['default'],
      buildArgs: () => ['-p']
    }
  }
}

/**
 * A fake spawned process the test drives by hand — nothing happens on its
 * own. This is what makes "before the process closes" a real assertion
 * rather than a hopeful one: the test emits a chunk, checks what the
 * observer has seen, and only fires `close` when it chooses to.
 */
function controllableChild(): {
  child: SpawnedProcessLike
  emitStdout(chunk: Buffer | string): void
  emitStderr(chunk: string): void
  close(code: number): void
} {
  const stdoutListeners: Array<(chunk: Buffer | string) => void> = []
  const stderrListeners: Array<(chunk: Buffer | string) => void> = []
  const closeListeners: Array<(code: number | null) => void> = []

  const child: SpawnedProcessLike = {
    stdin: { write: () => {}, end: () => {} },
    stdout: { on: (_event, listener) => stdoutListeners.push(listener) },
    stderr: { on: (_event, listener) => stderrListeners.push(listener) },
    on: (event, listener) => {
      if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
    },
    kill: () => {}
  }

  return {
    child,
    emitStdout: (chunk) => {
      for (const listener of stdoutListeners) listener(chunk)
    },
    emitStderr: (chunk) => {
      for (const listener of stderrListeners) listener(chunk)
    },
    close: (code) => {
      for (const listener of closeListeners) listener(code)
    }
  }
}

describe('attachStreamReader — live, incremental record delivery', () => {
  it('reports each record as its line completes, before the process closes', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    driver.emitStdout('{"type":"turn","i":1}\n')
    expect(observed).toEqual([{ type: 'turn', i: 1 }])

    driver.emitStdout('{"type":"turn","i":2}\n')
    expect(observed).toEqual([
      { type: 'turn', i: 1 },
      { type: 'turn', i: 2 }
    ])

    // Still running: nothing has closed the stream, and both records are
    // already in the observer's hands.
    expect(finalizeEvents(reader, 'review')).toEqual(observed)
  })

  it('reports one call per record, never one call carrying a batch', () => {
    const calls: unknown[][] = []
    const driver = controllableChild()
    attachStreamReader(driver.child, (events) => calls.push(events))

    // Three complete records arriving in a single `data` chunk: the chunk
    // boundary is not the framing unit, the newline is.
    driver.emitStdout('{"i":1}\n{"i":2}\n{"i":3}\n')

    expect(calls).toEqual([[{ i: 1 }], [{ i: 2 }], [{ i: 3 }]])
  })

  it('reads onParsedEvents at call time, so a caller may replace it after attach', () => {
    const first: unknown[] = []
    const second: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => first.push(...events))

    driver.emitStdout('{"i":1}\n')
    reader.onParsedEvents = (events) => second.push(...events)
    driver.emitStdout('{"i":2}\n')

    expect(first).toEqual([{ i: 1 }])
    expect(second).toEqual([{ i: 2 }])
  })

  it('never lets an observer error reach the stream it is watching', () => {
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, () => {
      throw new Error('observer bug')
    })

    expect(() => driver.emitStdout('{"i":1}\n')).not.toThrow()
    expect(finalizeEvents(reader, 'review')).toEqual([{ i: 1 }])
  })

  it('accumulates stderr verbatim, unparsed', () => {
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child)

    driver.emitStderr('not json ')
    driver.emitStderr('either')

    expect(reader.stderrChunks.join('')).toBe('not json either')
  })
})

describe('attachStreamReader — partial trailing line carry-over', () => {
  it('holds a partial trailing line over and completes it from the next chunk', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    driver.emitStdout('{"type":"turn","i":1}\n{"type":"tu')
    expect(observed).toEqual([{ type: 'turn', i: 1 }])

    driver.emitStdout('rn","i":2}\n')
    expect(observed).toEqual([
      { type: 'turn', i: 1 },
      { type: 'turn', i: 2 }
    ])

    expect(finalizeEvents(reader, 'review')).toEqual(observed)
  })

  it('carries one record across three chunks that each split it mid-token', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    driver.emitStdout('{"session')
    driver.emitStdout('_id":"sess-')
    expect(observed).toEqual([])

    driver.emitStdout('123"}\n')
    expect(observed).toEqual([{ session_id: 'sess-123' }])
    expect(finalizeEvents(reader, 'review')).toEqual([{ session_id: 'sess-123' }])
  })

  it('parses a final line the process never terminated with a newline', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    driver.emitStdout('{"i":1}\n{"i":2}')
    expect(observed).toEqual([{ i: 1 }])

    expect(finalizeEvents(reader, 'review')).toEqual([{ i: 1 }, { i: 2 }])
    expect(observed).toEqual([{ i: 1 }, { i: 2 }])
  })

  it('treats a chunk boundary landing exactly on the newline as a complete line', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    driver.emitStdout('{"i":1}')
    expect(observed).toEqual([])

    driver.emitStdout('\n')
    expect(observed).toEqual([{ i: 1 }])
    expect(finalizeEvents(reader, 'review')).toEqual([{ i: 1 }])
  })

  it('drops blank and whitespace-only lines without reporting them', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    driver.emitStdout('\n  \n{"i":1}\r\n\n')

    expect(observed).toEqual([{ i: 1 }])
    expect(finalizeEvents(reader, 'review')).toEqual([{ i: 1 }])
  })

  it('reports nothing at all for a process that emitted no stdout', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    expect(finalizeEvents(reader, 'review')).toEqual([])
    expect(observed).toEqual([])
  })

  it('holds incomplete multi-byte bytes back rather than decoding them to a replacement character', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    // A three-byte character split across two `data` chunks — a per-chunk
    // `toString()` would corrupt it into `U+FFFD` in both halves, so the
    // record would parse and be reported with the wrong content.
    const line = Buffer.from('{"note":"⚖ balance"}\n', 'utf8')
    const boundary = line.indexOf(Buffer.from('⚖', 'utf8')) + 1

    driver.emitStdout(line.subarray(0, boundary))
    expect(observed).toEqual([])

    driver.emitStdout(line.subarray(boundary))
    expect(observed).toEqual([{ note: '⚖ balance' }])
    expect(finalizeEvents(reader, 'review')).toEqual([{ note: '⚖ balance' }])
  })

  it('flushes bytes the decoder still holds when the process dies mid-character', () => {
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child)

    // A process killed part-way through writing a character: the bytes the
    // decoder is holding are the start of the stream's last line. Dropping
    // them would leave a truncated line that happens to parse, reporting a
    // cut-off record as a complete one instead of failing the run.
    driver.emitStdout(Buffer.concat([Buffer.from('{"i":1}', 'utf8'), Buffer.from('⚖', 'utf8').subarray(0, 2)]))

    expect(() => finalizeEvents(reader, 'review')).toThrow(/non-JSON output on line 1/)
  })

  it('routes a string chunk through the same decoder as a Buffer chunk', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    // A `Buffer` chunk cut mid-character, then a `string` chunk. A string
    // that skipped the decoder would be framed ahead of the bytes still
    // held for that character — those bytes would then surface at close as
    // a line of their own, failing an otherwise clean run. Going through
    // the decoder keeps the damage where it happened and in order: the
    // truncated character becomes one replacement character inside the
    // record it belongs to, and the record after it is untouched.
    driver.emitStdout(Buffer.concat([Buffer.from('{"a":"', 'utf8'), Buffer.from('⚖', 'utf8').subarray(0, 2)]))
    expect(observed).toEqual([])

    driver.emitStdout('BB"}\n{"b":1}\n')

    expect(observed).toEqual([{ a: '�BB' }, { b: 1 }])
    expect(finalizeEvents(reader, 'review')).toEqual([{ a: '�BB' }, { b: 1 }])
  })

  it('frames a single record arriving as many small chunks', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    const filler = 'x'.repeat(4096)
    const line = `{"note":"${filler}"}\n`
    for (let offset = 0; offset < line.length; offset += 8) {
      driver.emitStdout(line.slice(offset, offset + 8))
    }

    expect(observed).toEqual([{ note: filler }])
    expect(finalizeEvents(reader, 'review')).toEqual([{ note: filler }])
  })

  it('stops framing once the process has closed', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    driver.emitStdout('{"i":1}\n')
    driver.close(0)

    // A child that outlived a kill signal can keep writing to a pipe
    // nothing is waiting on: a node whose outcome is already settled must
    // not keep reporting records.
    driver.emitStdout('{"i":2}\n')

    expect(observed).toEqual([{ i: 1 }])
    expect(finalizeEvents(reader, 'review')).toEqual([{ i: 1 }])
  })

  it('hands back a copy, so a caller mutating it cannot corrupt the record', () => {
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child)

    driver.emitStdout('{"i":1}\n')
    const returned = finalizeEvents(reader, 'review')
    returned.length = 0
    returned.push({ redacted: true })

    expect(reader.snapshotEvents()).toEqual([{ i: 1 }])
    expect(reader.snapshotEvents()).not.toBe(reader.snapshotEvents())
  })
})

describe('finalizeEvents / parseNdjson — malformed lines', () => {
  it('throws naming the offending line and its position among non-empty lines', () => {
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child)

    driver.emitStdout('{"i":1}\n\nnot json\n{"i":3}\n')

    expect(() => finalizeEvents(reader, 'review')).toThrow(
      "Agent-spawn node 'review' produced non-JSON output on line 2 of its structured stream: not json"
    )
  })

  it('does not report records that arrive after a malformed line', () => {
    const observed: unknown[] = []
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child, (events) => observed.push(...events))

    driver.emitStdout('{"i":1}\nnot json\n{"i":3}\n')

    expect(observed).toEqual([{ i: 1 }])
    expect(() => finalizeEvents(reader, 'review')).toThrow(/non-JSON output/)
  })

  it('numbers a malformed final line that has no terminating newline', () => {
    const driver = controllableChild()
    const reader = attachStreamReader(driver.child)

    driver.emitStdout('{"i":1}\ntruncated {')

    expect(() => finalizeEvents(reader, 'review')).toThrow(/on line 2 of its structured stream: truncated \{/)
  })

  it('frames a whole string exactly as the incremental path frames chunks', () => {
    expect(parseNdjson('{"i":1}\n\n{"i":2}', 'review')).toEqual([{ i: 1 }, { i: 2 }])
    expect(() => parseNdjson('{"i":1}\nbroken', 'review')).toThrow(/on line 2 of its structured stream: broken/)
  })
})

describe('executeAgentSpawnNode — observation while the process is still running', () => {
  it('delivers each record to onParsedEvents before the process closes', async () => {
    const driver = controllableChild()
    const observed: unknown[] = []
    const spawnFn: SpawnFn = () => driver.child

    const settled = executeAgentSpawnNode({
      node: testNode,
      prompt: 'Review the diff.',
      config: baseConfig,
      spawnFn,
      onParsedEvents: (events) => observed.push(...events)
    })

    // `executeAgentSpawnNode` attaches its listeners synchronously, before
    // its first `await`, so the process may emit immediately.
    driver.emitStdout('{"type":"turn","content":"looking"}\n{"type":"res')
    expect(observed).toEqual([{ type: 'turn', content: 'looking' }])

    driver.emitStdout('ult","session_id":"sess-123"}\n')
    expect(observed).toEqual([
      { type: 'turn', content: 'looking' },
      { type: 'result', session_id: 'sess-123' }
    ])

    driver.close(0)
    const result = await settled

    expect(result.events).toEqual(observed)
    expect(result.sessionId).toBe('sess-123')
    expect(result.exitCode).toBe(0)
  })

  it('still rejects on a malformed line, after having reported the records before it', async () => {
    const driver = controllableChild()
    const observed: unknown[] = []

    const settled = executeAgentSpawnNode({
      node: testNode,
      prompt: 'Review the diff.',
      config: baseConfig,
      spawnFn: () => driver.child,
      onParsedEvents: (events) => observed.push(...events)
    })

    driver.emitStdout('{"type":"turn"}\nnot json\n')
    driver.close(0)

    await expect(settled).rejects.toThrow(/non-JSON output/)
    expect(observed).toEqual([{ type: 'turn' }])
  })
})
