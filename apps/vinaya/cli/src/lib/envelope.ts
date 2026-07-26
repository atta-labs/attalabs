// every machine output ships a `schema` version field — a
// public-surface commitment. Bump ENVELOPE_SCHEMA_VERSION on any
// breaking change to the envelope shape itself (not to payload contents).
export const ENVELOPE_SCHEMA_VERSION = 1

export type Envelope<T> = {
  schema: typeof ENVELOPE_SCHEMA_VERSION
  data: T
}

/**
 * Wraps a payload for `--json` output. The `schema` field is mandatory and
 * always present — there is no code path that emits machine output without
 * it.
 */
export function toEnvelope<T>(data: T): Envelope<T> {
  return { schema: ENVELOPE_SCHEMA_VERSION, data }
}

/**
 * Serializes a payload as an enveloped JSON string, ready to print.
 */
export function printJson<T>(data: T): void {
  process.stdout.write(`${JSON.stringify(toEnvelope(data), null, 2)}\n`)
}
