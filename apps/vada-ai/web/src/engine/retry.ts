// ── retry.ts ──────────────────────────────────────────────────────────────────
// Drop this in: apps/vada-ai/web/src/engine/retry.ts
//
// Wraps any async LLM call with retry logic for transient failures (429, 503).
// Reads the retry-after header when available.

export interface RetryOptions {
  maxRetries?: number // Default: 3
  baseDelayMs?: number // Default: 1000 (1 second)
  maxDelayMs?: number // Default: 30000 (30 seconds)
}

interface RetryableError extends Error {
  statusCode?: number
  responseHeaders?: Record<string, string>
}

function getRetryDelay(error: RetryableError, attempt: number, options: Required<RetryOptions>): number | null {
  const status = error.statusCode

  // Only retry on rate limits (429) and temporary server errors (503)
  if (status !== 429 && status !== 503) return null

  // Check for retry-after header (seconds)
  const retryAfter = error.responseHeaders?.['retry-after']
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10)
    if (!Number.isNaN(seconds)) {
      // Add a small buffer to avoid hitting the limit again immediately
      return Math.min(seconds * 1000 + 500, options.maxDelayMs)
    }
  }

  // Exponential backoff: 1s, 2s, 4s, 8s...
  const delay = Math.min(options.baseDelayMs * 2 ** attempt, options.maxDelayMs)
  return delay
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts: Required<RetryOptions> = {
    maxRetries: options.maxRetries ?? 3,
    baseDelayMs: options.baseDelayMs ?? 1000,
    maxDelayMs: options.maxDelayMs ?? 30000
  }

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === opts.maxRetries) break

      const delay = getRetryDelay(lastError as RetryableError, attempt, opts)
      if (delay === null) break

      await new Promise((r) => setTimeout(r, delay))
    }
  }

  throw lastError
}
