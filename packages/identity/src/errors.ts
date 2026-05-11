import type { RouteProvider } from '@atta/models'

export type ErrorKind = 'invalid_key' | 'rate_limit' | 'model_not_found' | 'transient' | 'unknown'

export interface ClassifiedError {
  kind: ErrorKind
  userMessage: string
  provider: RouteProvider
  recoverable: boolean
  retryAfterSeconds?: number
}

function providerLabel(p: RouteProvider): string {
  const labels: Partial<Record<RouteProvider, string>> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    groq: 'Groq',
    openrouter: 'OpenRouter',
    ollama: 'Ollama',
    xai: 'xAI',
    deepseek: 'DeepSeek',
    cerebras: 'Cerebras',
    mistral: 'Mistral',
    together: 'Together AI',
    fireworks: 'Fireworks AI'
  }
  return labels[p] ?? p
}

// Dig through the Vercel AI SDK's error wrappers to find the most informative
// message. AI_RetryError.lastError usually holds the real provider error; the
// AI_APICallError sometimes has a structured responseBody with a rich message
// Google returns (e.g. "This model is currently experiencing high demand…").
function extractDeepestMessage(err: Error): string {
  const chain: Array<{
    message?: string
    cause?: unknown
    lastError?: unknown
    data?: { error?: { message?: string } }
    responseBody?: string
  }> = []
  let cursor: unknown = err
  for (let i = 0; i < 5 && cursor && typeof cursor === 'object'; i++) {
    chain.push(cursor as (typeof chain)[number])
    const next = (cursor as { cause?: unknown; lastError?: unknown }).lastError ?? (cursor as { cause?: unknown }).cause
    if (!next || next === cursor) break
    cursor = next
  }
  for (const c of chain) {
    const fromData = c.data?.error?.message
    if (fromData) return fromData
    if (c.responseBody) {
      try {
        const parsed = JSON.parse(c.responseBody) as { error?: { message?: string } }
        if (parsed.error?.message) return parsed.error.message
      } catch {
        // not JSON, fall through
      }
    }
  }
  return err.message
}

export function classifyProviderError(err: unknown, provider: RouteProvider): ClassifiedError {
  if (!(err instanceof Error)) {
    return {
      kind: 'unknown',
      userMessage: `${providerLabel(provider)} call failed. Try again.`,
      provider,
      recoverable: false
    }
  }

  const statusCode = (err as { statusCode?: number }).statusCode
  const headers = (err as { responseHeaders?: Record<string, string> }).responseHeaders
  const retryAfter = headers?.['retry-after']
  const parsedRetry = retryAfter ? Number.parseInt(retryAfter, 10) : Number.NaN
  const retryAfterSeconds = Number.isFinite(parsedRetry) ? parsedRetry : undefined
  const deepestMessage = extractDeepestMessage(err)

  if (statusCode === 401 || statusCode === 403) {
    return {
      kind: 'invalid_key',
      userMessage: `Your ${providerLabel(provider)} key looks invalid. Check your credentials and try again.`,
      provider,
      recoverable: false
    }
  }

  if (statusCode === 429) {
    const msg = retryAfterSeconds
      ? `${providerLabel(provider)} rate limit reached. Retrying in ${retryAfterSeconds}s.`
      : `${providerLabel(provider)} rate limit reached. Retrying shortly.`
    return {
      kind: 'rate_limit',
      userMessage: msg,
      provider,
      recoverable: true,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {})
    }
  }

  if (statusCode === 404) {
    return {
      kind: 'model_not_found',
      userMessage: `Model not found for ${providerLabel(provider)}. Pick a different model for this agent.`,
      provider,
      recoverable: false
    }
  }

  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return {
      kind: 'transient',
      userMessage: `Network error reaching ${providerLabel(provider)}. Retrying.`,
      provider,
      recoverable: true
    }
  }

  // AI SDK wrappers: AI_RetryError (retries exhausted) and AI_APICallError
  // (single call failed). Surface the provider's own message — much more
  // useful than a generic "call failed".
  if (err.name === 'AI_RetryError' || err.name === 'AI_APICallError') {
    // Heuristic: "overloaded", "unavailable", "high demand" → transient
    const transient = /overload|unavailable|high demand|try again|temporar/i.test(deepestMessage)
    return {
      kind: transient ? 'transient' : 'unknown',
      userMessage: `${providerLabel(provider)}: ${deepestMessage}`,
      provider,
      recoverable: transient
    }
  }

  return {
    kind: 'unknown',
    userMessage: `${providerLabel(provider)}: ${deepestMessage}`,
    provider,
    recoverable: false
  }
}
