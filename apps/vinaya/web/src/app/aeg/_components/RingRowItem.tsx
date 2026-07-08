import { ChevronDown } from 'lucide-react'
import { Badge, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@atta/ui'
import type { RingRow } from '@/lib/aeg'
import { MarkdownInline } from './MarkdownInline'
import { SourceLinkChip } from './SourceLinkChip'

function mechanismLabel(link: RingRow['mechanismLinks'][number]): { label: string; href: string } {
  if ('path' in link) return { label: link.path, href: link.href }
  const suffix = link.stepName ? ` — "${link.stepName}"` : ` — job "${link.jobName}"`
  return { label: `${link.workflowRelPath}${suffix}`, href: link.href }
}

export function RingRowItem({ row, headers }: { row: RingRow; headers: string[] }) {
  const label = row.cells[0] ?? ''
  const secondary = headers.length === 3 ? row.cells[1] : undefined
  const detail = row.cells[row.cells.length - 1] ?? ''
  const allLinks = [
    ...row.mechanismLinks.map(mechanismLabel),
    ...row.textLinks.map((l) => ({ label: l.path, href: l.href }))
  ]
  const links = Array.from(new Map(allLinks.map((l) => [l.href, l])).values())

  return (
    <Collapsible className='rounded-lg border border-border bg-card'>
      <CollapsibleTrigger className='group flex w-full items-center justify-between gap-4 px-5 py-4 text-left'>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <MarkdownInline text={label} className='font-sans text-sm font-medium text-card-foreground' />
          {secondary && (
            <Badge className='w-fit border-border bg-muted text-[0.7rem] text-muted-foreground'>{secondary}</Badge>
          )}
        </div>
        <ChevronDown className='size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180' />
      </CollapsibleTrigger>
      <CollapsibleContent className='border-t border-border px-5 py-4'>
        <MarkdownInline text={detail} className='text-sm' />
        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <SourceLinkChip label={`enforcement.md:${row.line}`} href={row.href} />
          {links.length > 0 ? (
            links.map((link) => <SourceLinkChip key={link.href} label={link.label} href={link.href} />)
          ) : (
            <span className='font-mono text-[0.7rem] text-muted-foreground'>
              no real CI job/hook cross-reference found for this row
            </span>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
