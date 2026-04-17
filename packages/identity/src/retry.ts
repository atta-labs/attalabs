export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (err: unknown, attempt: number) => boolean
}

const DEFAULT: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function retryWithBackoff<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT, ...opts }
  const shouldRetry = opts.shouldRetry ?? (() => true)
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === maxAttempts || !shouldRetry(err, attempt)) break
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
      await sleep(delay)
    }
  }
  throw lastErr
}
