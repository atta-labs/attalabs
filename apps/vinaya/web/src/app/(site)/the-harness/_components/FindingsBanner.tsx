import type { DiagramFinding } from '@atta/aeg-core'
import { Text } from '@atta/ui/shared'
import { AlertTriangle } from 'lucide-react'

/**
 * `DiagramModel.findings` are config keys referencing no real gate/check —
 * drift between `vinaya.config.json` and doctrine.'s "cannot lie by
 * omission": these render visibly on the page itself, never console-only.
 * Empty in v1 (config is always `null`, see `load-diagram.ts`) — this stays
 * ready for whenever a real config lands.
 */
export function FindingsBanner({ findings }: { findings: DiagramFinding[] }) {
  if (findings.length === 0) return null

  return (
    <div className='flex flex-col gap-2 border border-warning/40 bg-warning/10 p-4'>
      <div className='flex items-center gap-2'>
        <AlertTriangle className='h-4 w-4 text-warning' />
        <Text as='span' className='font-mono text-warning text-xs uppercase tracking-[0.08em]'>
          Config drift
        </Text>
      </div>
      {findings.map((finding) => (
        <Text key={finding.configKey ?? finding.reason} size='sm' className='font-sans text-foreground'>
          {finding.reason}
        </Text>
      ))}
    </div>
  )
}
