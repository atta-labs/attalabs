'use client'

import { motion } from 'motion/react'
import { AGENT_THEME, TERMINAL_BADGE, type TerminalStateKey } from './agent-theme'

interface ConclusionPanelProps {
  terminalState: string
  conclusion: Record<string, unknown> | null
}

export function ConclusionPanel({ terminalState, conclusion }: ConclusionPanelProps) {
  const badge = TERMINAL_BADGE[terminalState as TerminalStateKey] ?? TERMINAL_BADGE.UNCONVERGED

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className='mb-5 flex items-center gap-3'>
        <div className='h-px flex-1 bg-border' />
        <span className='text-[10px] uppercase tracking-[0.4em] '>Conclusion</span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
        <div className='h-px flex-1 bg-border' />
      </div>

      {/* Conclusion card */}
      <div className='flex flex-col gap-5 rounded-xl border border-border bg-card p-5'>
        {conclusion ? (
          <>
            {/* Recommendation */}
            <div>
              <div className='mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] '>Recommendation</div>
              <p className='m-0 text-[15px] leading-[1.7] text-foreground/85'>{conclusion.recommendation as string}</p>
            </div>

            {/* Key Condition */}
            <div className='border-t border-border pt-4'>
              <div className='mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] '>Key Condition</div>
              <p className='m-0 text-[13px] leading-relaxed '>{conclusion.key_condition as string}</p>
            </div>

            {/* Unresolved Points */}
            {Array.isArray(conclusion.unresolved_points) &&
              (conclusion.unresolved_points as Array<{ point: string; agents_involved: string[] }>).length > 0 && (
                <div className='border-t border-border pt-4'>
                  <div className='mb-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] '>Unresolved</div>
                  <div className='space-y-2.5'>
                    {(conclusion.unresolved_points as Array<{ point: string; agents_involved: string[] }>).map(
                      (up, i) => (
                        <div key={i} className='border-l-2 border-border pl-3'>
                          <p className='m-0 text-[13px] leading-snug /70'>{up.point}</p>
                          <div className='mt-1 flex gap-1.5'>
                            {up.agents_involved.map((a) => (
                              <span
                                key={a}
                                className='text-[10px] font-medium'
                                style={{ color: AGENT_THEME[a]?.color }}
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Review By */}
            {typeof conclusion.review_by === 'string' && (
              <div className='flex items-center justify-between border-t border-border pt-3'>
                <span className='text-[9px] font-semibold uppercase tracking-[0.2em] '>Review by</span>
                <span className='text-xs '>{conclusion.review_by as string}</span>
              </div>
            )}
          </>
        ) : (
          <p className='m-0 text-sm '>The agents could not produce a conclusion that survived independent review.</p>
        )}
      </div>
    </motion.div>
  )
}
