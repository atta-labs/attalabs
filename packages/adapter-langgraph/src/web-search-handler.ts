/**
 * Web search handler for OpenAI-compat vendors (GPT, Grok, Groq, etc.).
 *
 * OpenAI-compat function tools require client-side execution: when the model
 * emits a `web_search` tool_call, the adapter runs this handler and feeds the
 * result back as a tool message. The handler is registered on the adapter at
 * construction time via `customTools` — the YAML `tools: [web_search]`
 * declaration on an agent is the source of truth for which agents receive it.
 *
 * Resolution order (first available wins):
 *   1. Google Custom Search JSON API  (GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX)
 *   2. Tavily Search API              (TAVILY_API_KEY)
 *   3. Graceful empty fallback        (no credentials configured)
 *
 * The fallback returns a structured "no results" payload so the model can still
 * produce a coherent response rather than receiving an error or empty string.
 */

export type WebSearchArgs = {
  query: string
  [key: string]: unknown
}

export type WebSearchResult = {
  query: string
  results: Array<{ title: string; url: string; snippet: string }>
  source: 'google_cse' | 'tavily' | 'none'
  note?: string
}

/**
 * Search via Google Custom Search JSON API.
 * Requires GOOGLE_SEARCH_API_KEY (the API key) and GOOGLE_SEARCH_CX (the
 * programmable search engine ID / cx).
 *
 * Returns up to 5 results as { title, url, snippet }.
 */
async function searchViaGoogle(query: string, apiKey: string, cx: string): Promise<WebSearchResult> {
  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('cx', cx)
  url.searchParams.set('q', query)
  url.searchParams.set('num', '5')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Google CSE request failed: ${response.status} ${response.statusText}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await response.json()) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Array<any> = data.items ?? []

  return {
    query,
    results: items.map((item) => ({
      title: String(item.title ?? ''),
      url: String(item.link ?? ''),
      snippet: String(item.snippet ?? '')
    })),
    source: 'google_cse'
  }
}

/**
 * Search via Tavily Search API.
 * Requires TAVILY_API_KEY.
 *
 * Returns up to 5 results as { title, url, snippet }.
 */
async function searchViaTavily(query: string, apiKey: string): Promise<WebSearchResult> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      include_raw_content: false
    })
  })

  if (!response.ok) {
    throw new Error(`Tavily request failed: ${response.status} ${response.statusText}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await response.json()) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Array<any> = data.results ?? []

  return {
    query,
    results: results.map((r) => ({
      title: String(r.title ?? ''),
      url: String(r.url ?? ''),
      snippet: String(r.content ?? r.snippet ?? '')
    })),
    source: 'tavily'
  }
}

/**
 * The web_search handler registered on the adapter for OpenAI-compat vendors.
 *
 * Usage — register at adapter construction:
 * ```ts
 * import { createMultiVendorLlmCall, webSearchHandler } from '@atta/adapter-langgraph'
 *
 * createMultiVendorLlmCall(providerKeys, agentVendorOverrides, {
 *   web_search: webSearchHandler
 * })
 * ```
 *
 * The handler serializes its result as a JSON string; the tool loop feeds it
 * back to the model as a tool message.
 */
export async function webSearchHandler(args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === 'string' ? args.query : String(args.query ?? '')

  if (!query.trim()) {
    const empty: WebSearchResult = {
      query,
      results: [],
      source: 'none',
      note: 'Empty query — no search performed.'
    }
    return JSON.stringify(empty)
  }

  // Resolution order: Google CSE → Tavily → graceful empty
  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY
  const googleCx = process.env.GOOGLE_SEARCH_CX

  if (googleApiKey && googleCx) {
    try {
      const result = await searchViaGoogle(query, googleApiKey, googleCx)
      return JSON.stringify(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[webSearchHandler] Google CSE failed: ${message} — falling back`)
    }
  }

  const tavilyApiKey = process.env.TAVILY_API_KEY

  if (tavilyApiKey) {
    try {
      const result = await searchViaTavily(query, tavilyApiKey)
      return JSON.stringify(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[webSearchHandler] Tavily failed: ${message} — falling back`)
    }
  }

  // Graceful empty fallback — no credentials configured (or all providers failed)
  const fallback: WebSearchResult = {
    query,
    results: [],
    source: 'none',
    note: 'Web search is not configured. Set GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX or TAVILY_API_KEY to enable results.'
  }
  return JSON.stringify(fallback)
}
