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
  const labels: Record<RouteProvider, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    groq: 'Groq',
    openrouter: 'OpenRouter'
  }
  return labels[p]
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

  return {
    kind: 'unknown',
    userMessage: `${providerLabel(provider)} call failed. Try again or change this agent's model.`,
    provider,
    recoverable: false
  }
}
