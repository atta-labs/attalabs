'use client'

import { cn } from '@atta/ui/lib/utils'
import { Code, Eye, GitPullRequest, Shield } from 'lucide-react'
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Terminal, type TerminalLine, type TerminalMark } from './Terminal'

// The Studio window's loop monitor: every task is one compact row (two rounds of developer, code
// review and security, then the pull request), and the log under it interleaves the tasks, each line
// tagged with its own. `k` is how many events have happened; everything on screen derives from it,
// so scrolling back un-plays the loop exactly.

type Role = 'dev' | 'code' | 'sec'
type CellState = 'pend' | 'run' | 'ok' | 'bad'
type Round = Record<Role, CellState>

// [time, task (-1 for none), round, roles it touches, their new state, log mark, log text]
type LoopEvent = readonly [string, number, number, readonly Role[], CellState, TerminalMark, string]

const EVENTS: readonly LoopEvent[] = [
  ['11:03', 0, 0, ['sec'], 'ok', '✓', 'Security: pass'],
  ['11:03', 0, 0, ['code'], 'bad', '✕', 'Code review: changes requested'],
  ['11:04', 1, 0, ['dev'], 'ok', '›', 'Developer: round 1 done'],
  ['11:04', 0, 1, ['dev'], 'run', '›', 'Round 2: developer addressing the findings'],
  ['11:04', 1, 0, ['code', 'sec'], 'run', '›', 'Reviewers dispatched in parallel'],
  ['11:05', 1, 0, ['sec'], 'ok', '✓', 'Security: pass'],
  ['11:05', 0, 1, ['dev'], 'ok', '›', 'Developer: round 2 done'],
  ['11:05', 0, 1, ['code', 'sec'], 'run', '›', 'Reviewers dispatched in parallel'],
  ['11:06', 1, 0, ['code'], 'ok', '✓', 'Code review: approved · PR #895 up'],
  ['11:06', 0, 1, ['code', 'sec'], 'ok', '✓', 'Both approved, PR #893 up'],
  ['11:06', -1, 0, [], 'ok', '☞', '2 PRs waiting for your merge']
]

export const LOOP_EVENT_COUNT = EVENTS.length

const TASKS = [
  { name: 'Custom events', meta: '#893 · opus', tag: '#893', model: 'opus' },
  { name: 'Streaming parser', meta: '#895 · sonnet', tag: '#895', model: 'sonnet' }
] as const

const START: readonly (readonly Round[])[] = [
  [
    { dev: 'ok', code: 'run', sec: 'run' },
    { dev: 'pend', code: 'pend', sec: 'pend' }
  ],
  [
    { dev: 'run', code: 'pend', sec: 'pend' },
    { dev: 'pend', code: 'pend', sec: 'pend' }
  ]
]

const CELL_CLASS: Record<CellState, string> = {
  pend: 'border-solid border-muted-foreground text-muted-foreground opacity-30',
  run: 'border-dashed border-foreground text-foreground',
  ok: 'border-solid border-success text-success',
  bad: 'border-solid border-destructive text-destructive'
}

// The ring that marks the cell an event has just landed on.
const FRESH = 'shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_currentColor]'

const ROLE_ICON: Record<Role, ReactNode> = {
  dev: <Code className='size-[0.95rem]' />,
  code: <Eye className='size-[0.95rem]' />,
  sec: <Shield className='size-[0.95rem]' />
}

// Wide: name, round 1 and round 2 in fixed tracks so the rounds sit right beside the name, then a flexible gap
// that pushes the pull request to the window's right edge. Narrow: the task number over its model, a strip of rounds
// that scrolls sideways, and the pull request, so a task stays one line tall.
const GRID =
  'grid grid-cols-[3.75rem_minmax(0,1fr)_1.6rem] items-center gap-x-3 @[34rem]:grid-cols-[minmax(0,13rem)_8rem_8rem_minmax(0,1fr)_2rem] @[34rem]:gap-x-4'

function replay(k: number): Round[][] {
  const rounds = START.map((task) => task.map((round) => ({ ...round })))
  for (const [, task, round, roles, state] of EVENTS.slice(0, k)) {
    const target = rounds[task]?.[round]
    if (target) for (const role of roles) target[role] = state
  }
  return rounds
}

const hasPullRequest = (rounds: readonly Round[] | undefined) =>
  (rounds ?? []).some((round) => round.code === 'ok' && round.sec === 'ok')

function Cell({ state, fresh, children }: { state: CellState; fresh: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'grid size-[1.6rem] place-items-center rounded-full border-[1.5px] transition-[border-color,color,opacity,box-shadow] duration-300 motion-reduce:transition-none @[34rem]:size-[1.9rem]',
        CELL_CLASS[state],
        fresh && FRESH
      )}
    >
      {children}
    </span>
  )
}

const HEADING = 'justify-self-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground'

function TaskRow({
  task,
  taskIndex,
  rounds,
  last
}: {
  task: (typeof TASKS)[number]
  taskIndex: number
  rounds: readonly Round[]
  last: LoopEvent | null
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const pr = hasPullRequest(rounds)
  const prFresh = last !== null && last[1] === taskIndex && pr && /PR/.test(last[6])
  // On a narrow screen the rounds sit in a sideways strip showing the latest one: it glides from round 1 to
  // round 2 as the second round begins, and back as the loop un-plays. Wide, the strip does not exist.
  const second = rounds[1]
  const focus = second && Object.values(second).some((state) => state !== 'pend') ? 1 : 0

  useEffect(() => {
    const strip = scroller.current
    const target = strip?.querySelector<HTMLElement>(`[data-round='${focus}']`)
    if (!strip || !target) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    strip.scrollTo({ left: target.offsetLeft, behavior: reduced ? 'auto' : 'smooth' })
  }, [focus])

  return (
    <div className={cn(GRID, 'border-t border-border py-2 @[34rem]:py-[0.7rem]')}>
      <div className='flex flex-col @[34rem]:hidden'>
        <span className='text-lg leading-tight'>{task.tag}</span>
        <span className='font-mono text-xs leading-tight text-muted-foreground'>{task.model}</span>
      </div>
      <div className='hidden min-w-0 flex-col gap-[0.15rem] @[34rem]:flex'>
        <span className='truncate text-lg leading-tight'>{task.name}</span>
        <span className='whitespace-nowrap font-mono text-[0.8125rem] leading-tight text-muted-foreground'>
          {task.meta}
        </span>
      </div>
      <div
        ref={scroller}
        className='relative -mx-1.5 flex min-w-0 snap-x snap-mandatory items-center gap-6 overflow-x-auto px-1.5 py-1.5 [scrollbar-width:none] @[34rem]:contents [&::-webkit-scrollbar]:hidden'
      >
        {rounds.map((round, roundIndex) => (
          <div
            key={roundIndex}
            data-round={roundIndex}
            className='flex shrink-0 snap-start items-center gap-[7px] @[34rem]:justify-self-center'
          >
            <span className='mr-1.5 font-mono text-xs uppercase text-muted-foreground @[34rem]:hidden'>
              r{roundIndex + 1}
            </span>
            {(['dev', 'code', 'sec'] as const).map((role, roleIndex) => (
              <div key={role} className='flex items-center gap-[7px]'>
                {roleIndex === 1 ? <span className='h-[1.5px] w-[0.4rem] bg-border' /> : null}
                <Cell
                  state={round[role]}
                  fresh={last !== null && last[1] === taskIndex && last[2] === roundIndex && last[3].includes(role)}
                >
                  {ROLE_ICON[role]}
                </Cell>
              </div>
            ))}
          </div>
        ))}
      </div>
      <span aria-hidden='true' className='hidden @[34rem]:block' />
      <span
        className={cn(
          'grid size-[1.6rem] place-items-center justify-self-center rounded-full border-[1.5px] border-dashed transition-[border-color,color,opacity,box-shadow] duration-300 motion-reduce:transition-none @[34rem]:size-[1.9rem]',
          pr ? 'border-success text-success' : 'border-muted-foreground text-muted-foreground opacity-30',
          prFresh && FRESH
        )}
      >
        <GitPullRequest className='size-[0.95rem]' />
      </span>
    </div>
  )
}

type Rows = 2 | 3 | 4 | 5 | 6 | 7

// How many whole log lines fit in the space left under the tasks: the wrapper's height less the terminal's own
// header, padding and borders, over one line. Measured, so a taller window gets a taller log, and a short one
// never shows a half-cut line.
function useFittingRows(wrapper: React.RefObject<HTMLDivElement | null>): Rows {
  const [rows, setRows] = useState<Rows>(2)
  useLayoutEffect(() => {
    const box = wrapper.current
    if (!box) return
    const measure = () => {
      const header = box.querySelector<HTMLElement>('[data-terminal-header]')
      const body = box.querySelector<HTMLElement>('[data-terminal-body]')
      if (!header || !body) return
      const style = window.getComputedStyle(body)
      const line = Number.parseFloat(style.fontSize) * 1.7
      const chrome =
        header.offsetHeight + Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom) + 2
      const fit = Math.floor((box.clientHeight - chrome) / line)
      setRows(Math.max(2, Math.min(7, fit)) as Rows)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [wrapper])
  return rows
}

export function LoopMonitor({ k }: { k: number }) {
  const terminalBox = useRef<HTMLDivElement>(null)
  const rows = useFittingRows(terminalBox)
  const count = Math.min(k, EVENTS.length)
  const rounds = replay(count)
  const last = count > 0 ? (EVENTS[count - 1] ?? null) : null
  const done = count >= EVENTS.length
  const status = done ? 'PUBLISHED · 2 PRs need your merge' : count >= 9 ? 'RUNNING · 1 PR up' : 'RUNNING · 2 tasks'
  const lines: TerminalLine[] = EVENTS.slice(0, count).map(([time, task, , , , mark, text]) => ({
    time,
    task: TASKS[task]?.tag ?? '',
    mark,
    text
  }))

  return (
    <div className='flex h-full flex-col gap-2 @[34rem]:gap-[clamp(0.6rem,1.8vh,1rem)]'>
      <div className='flex flex-col'>
        <div className={cn(GRID, 'hidden pb-2 @[34rem]:grid')}>
          <span className='font-mono text-xs uppercase leading-tight tracking-[0.14em] text-muted-foreground'>
            dev review loop monitor
          </span>
          <span className={HEADING}>r1</span>
          <span className={HEADING}>r2</span>
          <span aria-hidden='true' />
          <span className={HEADING}>pr</span>
        </div>
        {TASKS.map((task, taskIndex) => (
          <TaskRow key={task.tag} task={task} taskIndex={taskIndex} rounds={rounds[taskIndex] ?? []} last={last} />
        ))}
      </div>
      <div ref={terminalBox} className='min-h-0 flex-1'>
        <Terminal
          header={
            <>
              <span className={cn('truncate', done && 'text-success')}>{status}</span>
              <span className='hidden shrink-0 whitespace-nowrap text-muted-foreground @[34rem]:inline'>
                vinaya log --follow
              </span>
            </>
          }
          lines={lines}
          rows={rows}
          highlightLast
        />
      </div>
    </div>
  )
}
