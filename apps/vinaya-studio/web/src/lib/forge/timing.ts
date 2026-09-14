/**
 * Per-call timing for the tranche page's forge-heavy load path (task
 * `vinaya-studio-shell-v1` 1, #1053, O1). Dev-only: production builds never
 * print these lines (Studio's dev server is the only place anyone reads
 * them). Wraps a single async call — callers name each one individually so
 * the printed label lines up with the function actually measured, rather
 * than one aggregate figure that hides which read is slow.
 *
 * SERVER-ONLY.
 */

import 'server-only'

const isDev = process.env.NODE_ENV !== 'production'

export async function timeCall<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isDev) return fn()
  const start = performance.now()
  try {
    return await fn()
  } finally {
    const ms = performance.now() - start
    console.info(`[timing] ${label}: ${ms.toFixed(1)}ms`)
  }
}
