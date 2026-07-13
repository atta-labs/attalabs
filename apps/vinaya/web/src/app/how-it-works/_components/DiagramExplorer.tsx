'use client'

import type { DiagramFinding, DiagramNode } from '@atta/aeg-core'
import { Button } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { useState } from 'react'
import type { ContractChord, DiagramGroup, GroupKey } from '../_lib/groupings'
import { DiagramCanvas, DiagramLegendHint } from './DiagramCanvas'
import { FindingsBanner } from './FindingsBanner'
import { LeafPanel } from './LeafPanel'

type Props = {
  groups: DiagramGroup[]
  chords: ContractChord[]
  findings: DiagramFinding[]
  readMoreHrefs: Record<string, string>
}

/**
 * Client-side orchestrator — receives already-derived `groups`/`chords` as
 * plain props. It must never import `deriveGroups`/`deriveContractChords`
 * or any other `@atta/aeg-core` value directly: that barrel transitively
 * pulls in `@atta/aeg-forge-state`'s `node:child_process` usage, which
 * Turbopack cannot bundle for the browser. Derivation happens once,
 * server-side, in `page.tsx`.
 */
export function DiagramExplorer({ groups, chords, findings, readMoreHrefs }: Props) {
  const [drilledKey, setDrilledKey] = useState<GroupKey | null>(null)
  const [selectedLeaf, setSelectedLeaf] = useState<DiagramNode | null>(null)

  const drilledGroup = groups.find((g) => g.key === drilledKey) ?? null
  const selectedLeafGroupKey: GroupKey | null =
    drilledGroup?.key ?? (selectedLeaf?.kind === 'contract' ? 'actors' : null)

  const handleDrill = (key: GroupKey) => {
    setDrilledKey(key)
    setSelectedLeaf(null)
  }

  const handleBack = () => {
    setDrilledKey(null)
    setSelectedLeaf(null)
  }

  return (
    <div className='flex flex-col gap-4'>
      <FindingsBanner findings={findings} />

      <div className='flex items-center justify-between gap-4'>
        <Text as='span' className='font-mono text-muted-foreground text-xs uppercase tracking-[0.1em]'>
          {drilledGroup ? `overview / ${drilledGroup.label.toLowerCase()}` : 'overview'}
        </Text>
        {drilledGroup && (
          <Button variant='outline' size='sm' onClick={handleBack}>
            Reset
          </Button>
        )}
      </div>

      <div className={selectedLeaf ? 'grid grid-cols-1 gap-0 md:grid-cols-[1fr_360px]' : 'grid grid-cols-1'}>
        <div className='flex justify-center p-4'>
          <DiagramCanvas
            groups={groups}
            chords={chords}
            drilledGroup={drilledGroup}
            selectedLeafId={selectedLeaf?.id ?? null}
            onDrill={handleDrill}
            onBack={handleBack}
            onSelectLeaf={setSelectedLeaf}
          />
        </div>
        {selectedLeaf && selectedLeafGroupKey && (
          <LeafPanel
            node={selectedLeaf}
            groupKey={selectedLeafGroupKey}
            readMoreHref={readMoreHrefs[selectedLeaf.id]}
          />
        )}
      </div>

      {!selectedLeaf && <DiagramLegendHint />}
    </div>
  )
}
