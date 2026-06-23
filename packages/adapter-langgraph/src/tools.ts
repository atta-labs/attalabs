/**
 * Per-vendor tool registries: map logical tool names (as declared in Agent.tools)
 * to vendor-native API configurations.
 *
 * All three registries share the same logical key space — an agent declaring
 * tools: ['web_search'] dispatches to the right vendor-native format via
 * whichever registry matches the resolved sdkShape.
 *
 * Unknown tool names: the adapter logs a warning and skips rather than throwing,
 * so agents can list tool names that are only relevant to some adapters.
 */

/**
 * Anthropic server-side tools. Anthropic executes these on their infrastructure —
 * no client-side handler required.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ANTHROPIC_TOOL_REGISTRY: Record<string, any> = {
  web_search: {
    type: 'web_search_20260209',
    name: 'web_search',
    // "direct" allows non-programmatic-tool-calling models (Haiku) to use this tool
    allowed_callers: ['direct']
  },
  web_fetch: {
    type: 'web_fetch_20260209',
    name: 'web_fetch',
    allowed_callers: ['direct']
  }
}

/**
 * Google Generative AI native tool configurations.
 *
 * `web_search` maps to Gemini's native googleSearch grounding — the model
 * performs the search on Google's infrastructure and returns grounded text.
 * No client-side execution or handler required.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GOOGLE_TOOL_REGISTRY: Record<string, any> = {
  web_search: { googleSearch: {} }
}

/**
 * OpenAI-compat function tool specifications.
 *
 * Unlike Anthropic server tools or Google grounding, OpenAI function tools
 * require client-side execution: the model signals intent via tool_calls and
 * the adapter runs the matching handler from customToolHandlers. Callers must
 * register a handler under the same name for the tool to execute.
 *
 * `web_search` declares a standard web search function spec — compatible with
 * any openai-compat vendor (OpenAI, xAI, Groq, Mistral, etc.).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OPENAI_COMPAT_TOOL_REGISTRY: Record<string, any> = {
  web_search: {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information on a topic.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to look up.' }
        },
        required: ['query']
      }
    }
  }
}
