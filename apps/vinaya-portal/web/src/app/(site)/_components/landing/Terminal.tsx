import { cn } from '@atta/ui/lib/utils'
import type { ReactNode } from 'react'

// The landing's one terminal box: a header strip over a fixed-height run of log lines. Studio's loop
// monitor and section 04's event log both render through it, so there is one thing to maintain. It
// stays a dark terminal in both colour schemes with existing tokens only: the foreground ink as a
// fill in light, the card surface in dark.

export type TerminalMark = '›' | '✓' | '✕' | '☞'
/** `task` is an optional tag column between the time and the mark (empty for a line that belongs to none). */
export type TerminalLine = { time: string; task?: string; mark: TerminalMark; text: string }

const MARK_CLASS: Record<TerminalMark, string> = {
  '›': 'text-background/60 dark:text-muted-foreground',
  '✓': 'text-success',
  '✕': 'text-destructive',
  '☞': 'text-background dark:text-card-foreground'
}

// The lines area is exactly `rows` rows tall (the 1.7 line height), so the box never changes height
// as lines arrive. Whole class strings, because Tailwind cannot see a computed one.
const ROWS_HEIGHT: Record<number, string> = {
  2: 'h-[3.4em]',
  3: 'h-[5.1em]',
  4: 'h-[6.8em]',
  5: 'h-[8.5em]',
  6: 'h-[10.2em]',
  7: 'h-[11.9em]'
}

export function Terminal({
  header,
  headerClassName,
  lines,
  rows,
  anchor = 'bottom',
  highlightLast = false,
  className,
  'aria-hidden': ariaHidden
}: {
  header: ReactNode
  headerClassName?: string
  lines: readonly TerminalLine[]
  /** How many whole lines show (2 to 7); older lines drop off the top. */
  rows: 2 | 3 | 4 | 5 | 6 | 7
  /** Where the lines sit while the box is not yet full: against the header, or the bottom edge. */
  anchor?: 'top' | 'bottom'
  /** Tint the newest line, so the eye finds what just happened. */
  highlightLast?: boolean
  className?: string
  'aria-hidden'?: 'true'
}) {
  const visible = lines.slice(-rows)
  const hasTask = lines.some((line) => line.task !== undefined)
  return (
    <div
      aria-hidden={ariaHidden}
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-foreground font-mono text-[0.8125rem] leading-[1.7] text-background dark:bg-card dark:text-card-foreground',
        className
      )}
    >
      <div
        data-terminal-header
        className={cn(
          'flex items-center justify-between gap-4 border-b border-border bg-background px-[0.9rem] py-[0.55rem] tracking-[0.04em] text-foreground transition-colors duration-300 motion-reduce:transition-none',
          headerClassName
        )}
      >
        {header}
      </div>
      <div
        data-terminal-body
        className={cn(
          'box-content flex flex-col overflow-hidden px-[0.9rem] py-[0.6rem]',
          ROWS_HEIGHT[rows],
          anchor === 'bottom' ? 'justify-end' : 'justify-start'
        )}
      >
        {visible.map((line, index) => (
          <div
            key={`${line.time}-${line.task ?? ''}-${line.text}`}
            className={cn(
              'grid flex-none overflow-hidden whitespace-nowrap rounded-[3px]',
              hasTask ? 'grid-cols-[3.2em_3.6em_1.3em_minmax(0,1fr)]' : 'grid-cols-[3.2em_1.3em_minmax(0,1fr)]',
              highlightLast && index === visible.length - 1 && 'bg-background/10 dark:bg-foreground/10'
            )}
          >
            <span className='text-background/60 dark:text-muted-foreground'>{line.time}</span>
            {hasTask ? <span className='text-background/60 dark:text-muted-foreground'>{line.task}</span> : null}
            <span className={MARK_CLASS[line.mark]}>{line.mark}</span>
            <span className={cn('overflow-hidden text-ellipsis', line.mark === '☞' && 'font-semibold')}>
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
