import { describe, expect, it } from 'bun:test'
import { CHECK_SCHEMA_VERSION, type CheckError, emitCheckError } from '../../src/checks/contract'

describe('check contract', () => {
  it('pins the schema version to 1', () => {
    expect(CHECK_SCHEMA_VERSION).toBe(1)
  })

  it('emitCheckError writes exactly one newline-terminated JSON line to stderr', () => {
    const error: CheckError = {
      schema: CHECK_SCHEMA_VERSION,
      check: 'fixture',
      severity: 'error',
      message: 'diagnosis',
      agent_recovery_prompt: 'instruction'
    }

    const chunks: string[] = []
    const original = process.stderr.write
    process.stderr.write = ((chunk: string) => {
      chunks.push(chunk)
      return true
    }) as typeof process.stderr.write

    try {
      emitCheckError(error)
    } finally {
      process.stderr.write = original
    }

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.endsWith('\n')).toBe(true)
    expect(JSON.parse(chunks[0] as string)).toEqual(error)
  })

  it('carries file/line as optional fields', () => {
    const error: CheckError = {
      schema: CHECK_SCHEMA_VERSION,
      check: 'fixture',
      severity: 'warning',
      message: 'diagnosis',
      agent_recovery_prompt: 'instruction',
      file: 'src/index.ts',
      line: 42
    }
    expect(error.file).toBe('src/index.ts')
    expect(error.line).toBe(42)
  })
})
