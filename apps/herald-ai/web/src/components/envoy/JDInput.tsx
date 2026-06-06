'use client'

import type { FileUIPart } from 'ai'
import { useEffect, useRef } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { DiscordIcon, GitHubIcon, LinkedInIcon } from '@/components/social-icons'
import { SmartPromptInput } from '@atta/ui/smart-prompt-input'
import { useComponents } from '@atta/ui/lib/library-provider'
import { AvatarFrame } from '@/components/avatar-frame'
import { SummaryMarkdown } from '@/components/summary-markdown'
import { useHeroCollapse } from './hero-collapse-context'

const ACCEPTED_DOC_TYPES = '.pdf,.md,.txt,application/pdf,text/markdown,text/plain'

export function JDInput({
  onSubmit,
  candidateName = 'Dani Estevez Martin',
  candidateTitle = 'Senior Frontend Architect · AI Systems · Web3',
  candidateAvatarUrl,
  candidateSummary,
  candidateStack,
  candidateLocation,
  candidateAvailability,
  candidateCvUrl,
  candidateGithub,
  candidateLinkedin,
  candidateDiscord,
  auditAvailable = true,
  isOwner = false
}: {
  onSubmit: (jd: string) => void
  candidateName?: string
  candidateTitle?: string
  candidateAvatarUrl?: string
  candidateSummary?: string
  candidateStack?: string[]
  candidateLocation?: string
  candidateAvailability?: string
  candidateCvUrl?: string
  candidateGithub?: string
  candidateLinkedin?: string
  candidateDiscord?: string
  auditAvailable?: boolean
  isOwner?: boolean
}) {
  const { setIsCollapsed } = useHeroCollapse()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { Button, Badge } = useComponents()

  useEffect(() => {
    setIsCollapsed(false)
    const sentinel = sentinelRef.current
    const scroller = scrollRef.current
    if (!sentinel || !scroller) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsCollapsed(!entry.isIntersecting)
      },
      { root: scroller, rootMargin: '0px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [setIsCollapsed])

  const topStack = candidateStack ?? []
  const locationLine = [candidateLocation, candidateAvailability].filter(Boolean).join(' · ')
  const cvRawFile = candidateCvUrl ? (candidateCvUrl.split('/').pop() ?? '') : null
  const cvExt = cvRawFile ? (cvRawFile.split('.').pop() ?? 'pdf') : 'pdf'
  const cvFilename = candidateCvUrl ? `${(candidateName ?? 'CV').replace(/\s+/g, '_')}_CV.${cvExt}` : null
  const hasSocialLinks = !!(candidateGithub || candidateLinkedin || candidateDiscord)

  function handleSubmit(text: string, files: FileUIPart[]) {
    let jd = text.trim()
    if (!jd && files.length > 0) {
      const textFile = files.find((f) => f.mediaType?.startsWith('text/'))
      if (textFile?.url.startsWith('data:')) {
        const comma = textFile.url.indexOf(',')
        if (comma !== -1) {
          const header = textFile.url.slice(0, comma)
          const data = textFile.url.slice(comma + 1)
          try {
            jd = header.includes(';base64') ? atob(data) : decodeURIComponent(data)
          } catch {
            // ignore decode failure
          }
        }
      }
    }
    if (jd) onSubmit(jd)
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Scrollable candidate info */}
      <div className='min-h-0 flex-1 overflow-y-auto' ref={scrollRef}>
        <div className='mx-auto max-w-[680px] px-6 pt-20 pb-4'>
          <header>
            <div className='flex items-start gap-5'>
              {candidateAvatarUrl && (
                <AvatarFrame
                  src={candidateAvatarUrl}
                  alt={candidateName ?? ''}
                  variant='dossier'
                  pennant
                  pennantAnimated
                />
              )}
              <div className='min-w-0'>
                <h1 className='mt-1 font-display text-4xl tracking-tight text-foreground'>{candidateName}</h1>
                <p className='mt-2 font-mono text-xl text-muted-foreground'>{candidateTitle}</p>
              </div>
            </div>

            {/* Sentinel: collapse triggers when this exits the scroll container's top */}
            <div ref={sentinelRef} aria-hidden='true' className='h-px' />

            <div className='mt-6'>
              {(topStack.length > 0 || locationLine || (candidateCvUrl && cvFilename) || hasSocialLinks) && (
                <dl className='grid grid-cols-[80px_1fr] items-center gap-y-2'>
                  {locationLine && (
                    <>
                      <dt className='font-mono text-xs tracking-wide text-muted-foreground'>LOCATION</dt>
                      <dd className='text-sm text-foreground'>{locationLine}</dd>
                    </>
                  )}
                  {candidateCvUrl && cvFilename && (
                    <>
                      <dt className='font-mono text-xs tracking-wide text-muted-foreground'>CV</dt>
                      <dd className='flex items-center justify-between gap-2'>
                        <span className='min-w-0 truncate font-mono text-sm text-foreground'>{cvFilename}</span>
                        <div className='flex shrink-0 items-center gap-1'>
                          {Button ? (
                            <>
                              <Button
                                variant='outline'
                                size='icon'
                                className='h-7 w-7'
                                aria-label='Download CV'
                                title='Download CV'
                                onClick={() => {
                                  const a = document.createElement('a')
                                  a.href = candidateCvUrl!
                                  a.download = ''
                                  a.click()
                                }}
                              >
                                <Download className='h-3.5 w-3.5' />
                              </Button>
                              <Button
                                variant='outline'
                                size='icon'
                                className='h-7 w-7'
                                aria-label='Open CV'
                                title='Open CV'
                                onClick={() => window.open(candidateCvUrl!, '_blank')}
                              >
                                <ExternalLink className='h-3.5 w-3.5' />
                              </Button>
                            </>
                          ) : (
                            <>
                              <a
                                href={candidateCvUrl}
                                download
                                aria-label='Download CV'
                                title='Download CV'
                                className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                              >
                                <Download className='h-3.5 w-3.5' />
                              </a>
                              <a
                                href={candidateCvUrl}
                                target='_blank'
                                rel='noreferrer'
                                aria-label='Open CV'
                                title='Open CV'
                                className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                              >
                                <ExternalLink className='h-3.5 w-3.5' />
                              </a>
                            </>
                          )}
                        </div>
                      </dd>
                    </>
                  )}
                  {hasSocialLinks && (
                    <>
                      <dt className='font-mono text-xs tracking-wide text-muted-foreground'>LINKS</dt>
                      <dd className='flex items-center gap-1.5'>
                        {candidateGithub &&
                          (Button ? (
                            <Button
                              variant='outline'
                              size='icon'
                              className='h-7 w-7'
                              aria-label='GitHub'
                              title='GitHub'
                              onClick={() => window.open(`https://github.com/${candidateGithub}`, '_blank')}
                            >
                              <GitHubIcon className='h-3.5 w-3.5' />
                            </Button>
                          ) : (
                            <a
                              href={`https://github.com/${candidateGithub}`}
                              target='_blank'
                              rel='noreferrer'
                              aria-label='GitHub'
                              title='GitHub'
                              className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                            >
                              <GitHubIcon className='h-3.5 w-3.5' />
                            </a>
                          ))}
                        {candidateLinkedin &&
                          (Button ? (
                            <Button
                              variant='outline'
                              size='icon'
                              className='h-7 w-7'
                              aria-label='LinkedIn'
                              title='LinkedIn'
                              onClick={() => window.open(candidateLinkedin!, '_blank')}
                            >
                              <LinkedInIcon className='h-3.5 w-3.5' />
                            </Button>
                          ) : (
                            <a
                              href={candidateLinkedin}
                              target='_blank'
                              rel='noreferrer'
                              aria-label='LinkedIn'
                              title='LinkedIn'
                              className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                            >
                              <LinkedInIcon className='h-3.5 w-3.5' />
                            </a>
                          ))}
                        {candidateDiscord &&
                          (Button ? (
                            <Button
                              variant='outline'
                              size='icon'
                              className='h-7 w-7'
                              aria-label={`Discord: ${candidateDiscord}`}
                              title={`Discord: ${candidateDiscord}`}
                            >
                              <DiscordIcon className='h-3.5 w-3.5' />
                            </Button>
                          ) : (
                            <span
                              role='img'
                              aria-label={`Discord: ${candidateDiscord}`}
                              title={`Discord: ${candidateDiscord}`}
                              className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground'
                            >
                              <DiscordIcon className='h-3.5 w-3.5' />
                            </span>
                          ))}
                      </dd>
                    </>
                  )}
                  {topStack.length > 0 && (
                    <>
                      <dt className='self-start pt-1 font-mono text-xs tracking-wide text-muted-foreground'>STACK</dt>
                      <dd>
                        <div className='flex flex-wrap gap-1.5'>
                          {topStack.map((s) =>
                            Badge ? (
                              <Badge key={s} variant='outline' className='font-mono text-[11px]'>
                                {s}
                              </Badge>
                            ) : (
                              <span
                                key={s}
                                className='rounded border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground'
                              >
                                {s}
                              </span>
                            )
                          )}
                        </div>
                      </dd>
                    </>
                  )}
                </dl>
              )}

              {candidateSummary && (
                <div className='mt-6 max-w-[65ch]'>
                  <SummaryMarkdown text={candidateSummary} />
                </div>
              )}
            </div>
          </header>
        </div>
      </div>

      {/* Pinned input / audit gate */}
      {auditAvailable ? (
        <div className='shrink-0 bg-background'>
          <div className='mx-auto max-w-[680px] px-6 py-4'>
            <SmartPromptInput
              onSubmit={handleSubmit}
              placeholder="Paste the job description here. I'll show you exactly how I fit — and why."
              submitOn='cmdenter'
              hint='Cmd+Enter to submit'
              accept={ACCEPTED_DOC_TYPES}
              pasteToFileChars={1000}
            />
          </div>
        </div>
      ) : isOwner ? (
        <div className='shrink-0 border-t border-border bg-background'>
          <div className='mx-auto flex max-w-[680px] items-center justify-between px-6 py-3'>
            <p className='font-mono text-xs text-warning'>No API key — recruiters can't run audits yet.</p>
            <a
              href='/candidate/settings'
              className='shrink-0 font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground'
            >
              Settings → API Keys
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
