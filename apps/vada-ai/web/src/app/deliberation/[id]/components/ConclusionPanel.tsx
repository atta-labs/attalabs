'use client'

import { motion } from 'motion/react'
import { Card, CardContent, Text } from '@atta/ui'

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  CLEAN: { label: 'Clean', color: '#2ECC71' },
  REVISED: { label: 'Revised', color: '#C8A84B' },
  UNCONVERGED: { label: 'Unconverged', color: '#DB4A4A' }
}

export function ConclusionPanel({
  terminalState,
  conclusion
}: {
  terminalState: string
  conclusion: Record<string, unknown> | null
}) {
  const stateInfo = STATE_LABELS[terminalState] ?? STATE_LABELS.UNCONVERGED!

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className='mb-4 flex items-center justify-center gap-3'>
        <div className='h-px flex-1 bg-border' />
        <Text as='span' className='text-[11px] uppercase tracking-[0.4em] text-muted-foreground/50'>
          Conclusion
        </Text>
        <span
          className='rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
          style={{ background: stateInfo.color, color: 'var(--background)' }}
        >
          {stateInfo.label}
        </span>
        <div className='h-px flex-1 bg-border' />
      </div>

      <Card>
        <CardContent className='space-y-4 p-6'>
          {conclusion ? (
            <>
              <div>
                <Text as='label' size='xs' className='mb-1 block uppercase tracking-wider text-muted-foreground'>
                  Recommendation
                </Text>
                <Text as='p' size='sm' className='leading-relaxed'>
                  {conclusion.recommendation as string}
                </Text>
              </div>
              <div>
                <Text as='label' size='xs' className='mb-1 block uppercase tracking-wider text-muted-foreground'>
                  Key Condition
                </Text>
                <Text as='p' size='sm' className='leading-relaxed'>
                  {conclusion.key_condition as string}
                </Text>
              </div>
              {(conclusion.unresolved_points as Array<{ point: string; agents_involved: string[] }>)?.length > 0 && (
                <div>
                  <Text as='label' size='xs' className='mb-1 block uppercase tracking-wider text-muted-foreground'>
                    Unresolved Points
                  </Text>
                  <ul className='space-y-1'>
                    {(conclusion.unresolved_points as Array<{ point: string; agents_involved: string[] }>).map(
                      (p, i) => (
                        <li key={i}>
                          <Text as='span' size='sm'>
                            — {p.point}{' '}
                            <Text as='span' size='xs' className='text-muted-foreground'>
                              ({p.agents_involved.join(', ')})
                            </Text>
                          </Text>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {typeof conclusion.review_by === 'string' && (
                <div>
                  <Text as='label' size='xs' className='mb-1 block uppercase tracking-wider text-muted-foreground'>
                    Review By
                  </Text>
                  <Text as='p' size='sm'>
                    {conclusion.review_by}
                  </Text>
                </div>
              )}
            </>
          ) : (
            <Text as='p' size='sm' className='text-muted-foreground'>
              The agents could not produce a conclusion that survived independent review.
            </Text>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
