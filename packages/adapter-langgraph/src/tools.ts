/**
 * Registry mapping logical tool names (as declared in Agent.tools) to
 * Anthropic-specific server tool configurations.
 *
 * Adapters for other providers (OpenAI, Gemini) would have their own registries
 * with different type fields but the same logical names. An agent declaring
 * tools: ['web_search'] works with any adapter that has a matching registry entry.
 *
 * If an agent requests a name not in this registry, the adapter logs a warning
 * and skips that tool rather than throwing. This allows agents to list tool
 * names that are only relevant to some adapters.
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
