'use client'

import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TERMINAL_BADGE, type TerminalStateKey } from './agent-theme'
import { MARKDOWN_COMPONENTS } from './markdown-components'

interface BattlefieldMapPanelProps {
  terminalState: string
  conclusion: Record<string, unknown> | null
  hasSynthesizer?: boolean
}

export function BattlefieldMapPanel({ terminalState, conclusion, hasSynthesizer = true }: BattlefieldMapPanelProps) {
  const badge = TERMINAL_BADGE[terminalState as TerminalStateKey] ?? TERMINAL_BADGE.UNCONVERGED
  const criticVerdict = typeof conclusion?._criticVerdict === 'string' ? (conclusion._criticVerdict as string) : null
  const isFlagged = terminalState === 'UNCONVERGED' && !!criticVerdict
  const isError = terminalState === 'ERROR'

  const coreAgreement = typeof conclusion?.core_agreement === 'string' ? conclusion.core_agreement : null
  const concessions = Array.isArray(conclusion?.concessions)
    ? (conclusion.concessions as unknown[]).filter((c): c is string => typeof c === 'string')
    : []
  const irreducibleConflict =
    typeof conclusion?.irreducible_conflict === 'string' ? conclusion.irreducible_conflict : null
  const riskRanking = typeof conclusion?.risk_ranking === 'string' ? conclusion.risk_ranking : null

  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className='mb-5 flex items-center gap-3'>
          <div className='h-px flex-1 bg-border' />
          <span className='text-[10px] uppercase tracking-[0.4em]'>Battlefield Map</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
          >
            {badge.label}
          </span>
          <div className='h-px flex-1 bg-border' />
        </div>
        <div className='flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5'>
          <div className='text-[9px] font-semibold uppercase tracking-[0.2em] text-destructive'>Synthesis failed</div>
          <p className='m-0 text-sm leading-relaxed text-foreground/85'>
            The battlefield map synthesizer could not produce a valid map. The panel outputs above are still available —
            copy the transcript to preserve them.
          </p>
          <p className='m-0 text-sm leading-relaxed text-muted-foreground'>
            This usually happens when the synthesis model runs out of output tokens or returns malformed JSON. Try
            running the deliberation again with a more capable model for the synthesizer role.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className='mb-5 flex items-center gap-3'>
        <div className='h-px flex-1 bg-border' />
        <span className='text-[10px] uppercase tracking-[0.4em]'>Battlefield Map</span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
        <div className='h-px flex-1 bg-border' />
      </div>

      <div className='flex flex-col gap-5 rounded-xl border border-border bg-card p-5'>
        {isFlagged && (
          <div className='rounded-md border border-warning/40 bg-warning/5 p-3'>
            <div className='mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-warning'>
              Flagged during review
            </div>
            <p className='m-0 text-[12px] leading-relaxed text-foreground/70'>
              The Blind Critic flagged the battlefield map. The best available synthesis is shown below — treat it as a
              working draft, not a final one.
            </p>
            <p className='m-0 mt-2 text-[12px] leading-relaxed text-foreground/85'>
              <span className='font-semibold'>Critic:</span> {criticVerdict}
            </p>
          </div>
        )}

        {conclusion ? (
          <>
            {coreAgreement && (
              <div>
                <div className='mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em]'>Core Agreement</div>
                <div className='text-[15px] leading-[1.7] text-foreground/85'>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                    {coreAgreement}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {concessions.length > 0 && (
              <div className='border-t border-border pt-4'>
                <div className='mb-2.5 text-[9px] font-semibold uppercase tracking-[0.2em]'>Concessions</div>
                <ul className='m-0 flex flex-col gap-2 pl-0'>
                  {concessions.map((c, i) => (
                    <li key={i} className='flex gap-2 text-[13px] leading-relaxed text-foreground/80'>
                      <span className='mt-[3px] shrink-0 font-mono text-[10px] text-muted-foreground'>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {irreducibleConflict && (
              <div className='border-t border-border pt-4'>
                <div className='mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em]'>Irreducible Conflict</div>
                <div className='text-[13px] leading-relaxed text-foreground/80'>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                    {irreducibleConflict}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {riskRanking && (
              <div className='border-t border-border pt-4'>
                <div className='mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em]'>Top Risk</div>
                <div className='text-[13px] leading-relaxed text-foreground/80'>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                    {riskRanking}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </>
        ) : hasSynthesizer ? (
          <p className='m-0 text-sm text-muted-foreground'>
            The synthesizer did not produce a renderable battlefield map. The panel outputs above are still available —
            copy the transcript to preserve them.
          </p>
        ) : null}
      </div>
    </motion.div>
  )
}
