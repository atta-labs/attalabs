import { Badge } from '@atta/ui/components'
import { Globe } from 'lucide-react'

/**
 * Shown on agent entries when the agent declares `tools: [web_search]`
 * AND the server confirms search infrastructure is configured.
 *
 * Visibility is scoped to Vāda's server-side search keys
 * (TAVILY_API_KEY or GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX) —
 * not per-user BYOK keys.
 */
export function AgentWebSearchBadge() {
  return (
    <Badge
      variant='outline'
      className='inline-flex items-center gap-1 border-border text-muted-foreground text-[10px] px-1.5 py-0'
    >
      <Globe className='h-2.5 w-2.5' />
      web search
    </Badge>
  )
}
