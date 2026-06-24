import { Globe } from 'lucide-react'

type ToolId = 'web_search'

const TOOL_META: Record<ToolId, { Icon: typeof Globe; label: string }> = {
  web_search: { Icon: Globe, label: 'Web search enabled' }
}

interface AgentToolIndicatorProps {
  tool: ToolId
}

/**
 * Small corner glyph shown on an agent sphere when a specific tool is active.
 *
 * Intended to be placed as an absolute overlay at the bottom-left of the
 * sphere wrapper — metadata weight, never competing with the sphere itself.
 *
 * Usage:
 *   <div className="relative">
 *     <VadaAgent ... />
 *     <span className="absolute bottom-0 left-0 z-[2]">
 *       <AgentToolIndicator tool="web_search" />
 *     </span>
 *   </div>
 */
export function AgentToolIndicator({ tool }: AgentToolIndicatorProps) {
  const meta = TOOL_META[tool]
  if (!meta) return null
  const { Icon, label } = meta
  return (
    <span
      role='img'
      aria-label={label}
      className='flex items-center justify-center rounded-md border border-border bg-card p-0.5 shadow-sm'
    >
      <Icon aria-hidden className='size-3 text-muted-foreground' />
    </span>
  )
}
