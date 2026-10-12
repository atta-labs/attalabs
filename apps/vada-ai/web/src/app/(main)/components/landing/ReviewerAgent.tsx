'use client'

import { memo } from 'react'
import { AgentToolIndicator } from '@/components/AgentToolIndicator'
import { type AgentRole, VadaAgent } from '@/components/agents/VadaAgent'

// The landing's agent spheres, all `VadaAgent`, the way the teams page renders them. The web-search
// badge is opt-in and only for `lg`: at `md` it covers too much of the sphere, so panels say it in text.
// Memoized on purpose: every landing section re-renders on scroll as its progress changes, and a sphere re-rendered mid-scroll visibly ticks. The `shrink-0` wrapper keeps a flex
// row from squeezing the sphere's own canvas (an off-centre icon, and a canvas that keeps resizing),
// and the margin keeps its particle ring clear of a clipping card edge. Never smaller than `md`,
// the teams page's own minimum: below it the ring crowds the face and reads off-centre and faint.

type Size = 'md' | 'lg'

const WEB_SEARCH = <AgentToolIndicator tool='web_search' />

/** A reviewer slot: you pick the model, so it shows that vendor's icon and colour. */
export const ReviewerAgent = memo(function ReviewerAgent({
  id,
  vendor,
  model,
  label,
  tight = false,
  size = 'md'
}: {
  id: string
  vendor: string
  model: string
  /** Shown under the sphere (the component's own label); omit for no label. */
  label?: string
  /** Drop the outer margin, for a row that sets its own gap. */
  tight?: boolean
  size?: Size
}) {
  return (
    <div className={tight ? 'shrink-0' : 'm-1.5 shrink-0'}>
      <VadaAgent
        id={id}
        name={`reviewer-${vendor}`}
        model={model}
        userConfigured
        size={size}
        state='speaking'
        visible
        label={label}
        noLabel={!label}
      />
    </div>
  )
})

/** A roled agent (Outside Read's panel, the Synthesizer, the auditors): its own face and colour. */
export const RoleAgent = memo(function RoleAgent({
  id,
  name,
  role,
  model,
  webSearch = false,
  label,
  tight = false,
  size = 'md'
}: {
  id: string
  name: string
  role: AgentRole
  model?: string
  webSearch?: boolean
  /** Shown under the sphere (the component's own label); omit for no label. */
  label?: string
  /** Drop the outer margin, for a row that sets its own gap. */
  tight?: boolean
  size?: Size
}) {
  return (
    <div className={tight ? 'shrink-0' : 'm-1.5 shrink-0'}>
      <VadaAgent
        id={id}
        name={name}
        role={role}
        model={model}
        size={size}
        state='speaking'
        visible
        label={label}
        noLabel={!label}
        toolBadge={webSearch ? WEB_SEARCH : undefined}
      />
    </div>
  )
})
