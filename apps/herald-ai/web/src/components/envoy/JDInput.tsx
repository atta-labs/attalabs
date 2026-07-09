'use client'

import type { FileUIPart } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { DiscordIcon, GitHubIcon, LinkedInIcon } from '@/components/social-icons'
import { SmartPromptInput } from '@atta/ui/smart-prompt-input'
import { useComponents } from '@atta/ui/lib/library-provider'
import { NextLink } from '@atta/ui/lib/next-link'
import { cn } from '@atta/ui/lib/utils'
import { AvatarFrame } from '@/components/avatar-frame'
import { SummaryMarkdown } from '@/components/summary-markdown'
import { useHeroCollapse } from './hero-collapse-context'

async function downloadCv(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank')
  }
}

/**
 * Extracts plain text from a PDF data URL. Mirrors the exact `unpdf`
 * `extractText` call shape used server-side in
 * `apps/herald-ai/web/src/app/api/admin/parse-cv/route.ts` and client-side
 * in `packages/ui/doc-collector/doc-collector.tsx`. Dynamic-imported (never
 * a static top-level import) so this page's initial bundle doesn't pay for
 * PDF.js unless a PDF is actually attached.
 */
async function extractPdfText(dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return ''
  try {
    const data = dataUrl.slice(comma + 1)
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    const { extractText } = await import('unpdf')
    const result = await extractText(bytes)
    return Array.isArray(result.text) ? result.text.join('\n') : result.text
  } catch {
    return ''
  }
}

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
  isOwner = false,
  isPublished = true,
  ownerSettingsHref,
  preview = false,
  username
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
  isPublished?: boolean
  ownerSettingsHref?: string
  preview?: boolean
  username: string
}) {
  const { setIsCollapsed } = useHeroCollapse()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const [promptNear, setPromptNear] = useState(false)
  const components = useComponents()
  const { Button, Badge } = components

  // Attention gradient border — fires once the prompt is (nearly) scrolled
  // into view, not only once it's fully at rest at the bottom.
  useEffect(() => {
    const el = promptRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => entry && setPromptNear(entry.isIntersecting), {
      root: null,
      threshold: 0.6
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setIsCollapsed(false)
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsCollapsed(!entry.isIntersecting)
      },
      { root: null, rootMargin: '0px', threshold: 0 }
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

  async function handleSubmit(text: string, files: FileUIPart[]) {
    let jd = text.trim()
    if (!jd && files.length > 0) {
      const pdfFile = files.find((f) => f.mediaType === 'application/pdf')
      if (pdfFile?.url.startsWith('data:')) {
        jd = await extractPdfText(pdfFile.url)
      } else {
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
    }
    if (jd) onSubmit(jd)
  }

  return (
    <div>
      {/* Hero — flows on the page; scrolls with the page (no internal scroller) */}
      <div>
        <div className='mx-auto max-w-[680px] px-6 pt-10 pb-4'>
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
                                aria-label='Download CV'
                                title='Download CV'
                                onClick={() => downloadCv(candidateCvUrl!, cvFilename!)}
                              >
                                <Download className='h-4 w-4' />
                              </Button>
                              <Button
                                variant='outline'
                                size='icon'
                                aria-label='Open CV'
                                title='Open CV'
                                onClick={() => window.open(candidateCvUrl!, '_blank')}
                              >
                                <ExternalLink className='h-4 w-4' />
                              </Button>
                            </>
                          ) : (
                            <>
                              <a
                                href={candidateCvUrl}
                                aria-label='Download CV'
                                title='Download CV'
                                className='flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                                onClick={(e) => {
                                  e.preventDefault()
                                  downloadCv(candidateCvUrl!, cvFilename!)
                                }}
                              >
                                <Download className='h-4 w-4' />
                              </a>
                              <a
                                href={candidateCvUrl}
                                target='_blank'
                                rel='noreferrer'
                                aria-label='Open CV'
                                title='Open CV'
                                className='flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                              >
                                <ExternalLink className='h-4 w-4' />
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
                              aria-label='GitHub'
                              title='GitHub'
                              onClick={() => window.open(`https://github.com/${candidateGithub}`, '_blank')}
                            >
                              <GitHubIcon className='h-4 w-4' />
                            </Button>
                          ) : (
                            <a
                              href={`https://github.com/${candidateGithub}`}
                              target='_blank'
                              rel='noreferrer'
                              aria-label='GitHub'
                              title='GitHub'
                              className='flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                            >
                              <GitHubIcon className='h-4 w-4' />
                            </a>
                          ))}
                        {candidateLinkedin &&
                          (Button ? (
                            <Button
                              variant='outline'
                              size='icon'
                              aria-label='LinkedIn'
                              title='LinkedIn'
                              onClick={() => window.open(candidateLinkedin!, '_blank')}
                            >
                              <LinkedInIcon className='h-4 w-4' />
                            </Button>
                          ) : (
                            <a
                              href={candidateLinkedin}
                              target='_blank'
                              rel='noreferrer'
                              aria-label='LinkedIn'
                              title='LinkedIn'
                              className='flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                            >
                              <LinkedInIcon className='h-4 w-4' />
                            </a>
                          ))}
                        {candidateDiscord &&
                          (Button ? (
                            <Button
                              variant='outline'
                              size='icon'
                              aria-label={`Discord: ${candidateDiscord}`}
                              title={`Discord: ${candidateDiscord}`}
                            >
                              <DiscordIcon className='h-4 w-4' />
                            </Button>
                          ) : (
                            <span
                              role='img'
                              aria-label={`Discord: ${candidateDiscord}`}
                              title={`Discord: ${candidateDiscord}`}
                              className='flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground'
                            >
                              <DiscordIcon className='h-4 w-4' />
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
                              <Badge key={s} variant='outline' className='font-mono text-xs'>
                                {s}
                              </Badge>
                            ) : (
                              <span
                                key={s}
                                className='rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground'
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

      {/* Input / audit gate. The real prompt (auditAvailable) flows with the
          page rather than sticking to the viewport bottom — it gets an
          attention gradient border instead once scrolled (near) into view. */}
      {preview ? (
        <div className='sticky bottom-0 z-30 bg-background/95 backdrop-blur-md'>
          <div className='mx-auto max-w-[680px] px-6 py-4'>
            <div className='rounded border border-dashed border-border bg-card/50 px-6 py-8 text-center'>
              <p className='font-mono text-xs text-muted-foreground'>Recruiters will paste a job description here</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {auditAvailable && (
            <div className='relative mx-auto max-w-[680px] px-6 py-10'>
              {/* Scroll teaser — fixed to the viewport (not the page), so it's
                  visible from the very top: a wide, SHORT ellipse (width and
                  height set independently — not a circle) mostly below the
                  fold, only its top third peeking above the viewport bottom
                  edge. translate-y-2/3 pushes 2/3 of its own height below
                  bottom:0, leaving the top third showing. Fades out smoothly as
                  the real input scrolls into view (promptNear) instead of
                  unmounting outright — the outer div owns the fade transition,
                  the inner div owns the pulse animation, kept on separate
                  elements so the two don't fight over the same opacity
                  property. Its own .ai-gradient-border takes over as the
                  "you're here" cue once fully near, so we don't show both. */}
              <div
                aria-hidden='true'
                className={cn(
                  'pointer-events-none fixed bottom-0 left-1/2 h-20 w-[75vw] -translate-x-1/2 translate-y-2/3 transition-opacity duration-700 ease-out',
                  promptNear ? 'opacity-0' : 'opacity-100'
                )}
              >
                <div className='h-full w-full animate-[pulse_6s_ease-in-out_infinite] rounded-full bg-radial from-primary/35 to-transparent blur-2xl' />
              </div>
              <div ref={promptRef} className={cn('relative rounded-xl', promptNear && 'ai-gradient-border')}>
                <SmartPromptInput
                  onSubmit={handleSubmit}
                  placeholder="Paste the job description here. I'll show you exactly how I fit — and why."
                  submitOn='cmdenter'
                  pasteToFileChars={1000}
                  // One JD in, one report out — this page audits a single job
                  // description at a time (bulk/multi-candidate is a separate,
                  // not-yet-built surface). accept + maxFiles enforce that at
                  // the input itself rather than relying on handleSubmit's
                  // silent first-text-file extraction below.
                  accept='.md,.pdf'
                  maxFiles={1}
                  surface='popover'
                  textareaVariant='bare'
                  ctaLabel={`Audit ${username}`}
                  // INJECTION CONTRACT (see ui-library-system SKILL.md):
                  // SmartPromptInput resolves NO library. Herald's library is selected
                  // at runtime per user via LibraryProvider; useComponents() returns
                  // the active map (Button/Textarea/DropdownMenu*). The component map
                  // starts empty during the dynamic-import window — the vendor falls
                  // back to native HTML on undefined keys.
                  components={{
                    Textarea: components.Textarea,
                    Button: components.Button,
                    DropdownMenu: components.DropdownMenu,
                    DropdownMenuTrigger: components.DropdownMenuTrigger,
                    DropdownMenuContent: components.DropdownMenuContent,
                    DropdownMenuItem: components.DropdownMenuItem
                  }}
                />
              </div>
            </div>
          )}
          {/* One sticky footer for every owner-only notice. auditAvailable and
              isPublished are independent facts — each renders its own line
              only when true, so they stack in one box instead of two sticky
              elements fighting over the same bottom:0 position. */}
          {isOwner && (!auditAvailable || !isPublished) && (
            <div className='sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md'>
              <div className='mx-auto flex max-w-[680px] flex-col gap-1.5 px-6 py-3'>
                {!auditAvailable && (
                  <div className='flex items-center justify-between gap-4'>
                    <p className='font-mono text-xs text-warning'>No API key — recruiters can't run audits yet.</p>
                    <NextLink
                      href={ownerSettingsHref ?? '/'}
                      variant='subtle'
                      className='shrink-0 underline underline-offset-2'
                    >
                      Settings → API Keys
                    </NextLink>
                  </div>
                )}
                {!isPublished && (
                  <div className='flex items-center justify-between gap-4'>
                    <p className='font-mono text-xs text-warning'>Not published yet — only you can see this.</p>
                    <NextLink
                      href={ownerSettingsHref ?? '/'}
                      variant='subtle'
                      className='shrink-0 underline underline-offset-2'
                    >
                      Publish in Settings
                    </NextLink>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
