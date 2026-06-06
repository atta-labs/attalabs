'use client'

import { Button, Input, Textarea } from '@atta/ui'
import { type UIMessage, useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface OnboardingState {
  username?: string
  usernameValid?: boolean
  githubHandle?: string
  githubValid?: boolean
  githubAvatar?: string
  cvParsed?: boolean
  cvProfile?: { name: string; title: string; stack: string[]; projects: number; experience: number }
  waitingForCv?: boolean
  complete?: boolean
}

interface ToolPart {
  type: string
  toolCallId: string
  state?: string // undefined during SDK streaming transitions
  input?: unknown
  output?: unknown
}

function getToolParts(msg: UIMessage): ToolPart[] {
  if (!msg?.parts) return []
  return msg.parts
    .filter((p): p is NonNullable<typeof p> => p != null && (p.type === 'dynamic-tool' || p.type.startsWith('tool-')))
    .map((p) => p as unknown as ToolPart)
}

function getToolName(part: ToolPart): string {
  if (part.type.startsWith('tool-')) return part.type.slice(5)
  return part.type
}

export function AIOnboarding() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<OnboardingState>({})
  const [uploading, setUploading] = useState(false)
  const [cvPasteMode, setCvPasteMode] = useState(false)
  const [cvPasteText, setCvPasteText] = useState('')
  const [started, setStarted] = useState(false)
  const [hasUserSent, setHasUserSent] = useState(false)
  const [input, setInput] = useState('')
  const handledToolCalls = useRef(new Set<string>())

  const { messages, sendMessage, addToolOutput, status, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/admin/onboarding-chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (e) => console.error('[AIOnboarding SDK error — root cause]', e)
  })

  useEffect(() => {
    if (!started && messages.length === 0) {
      setStarted(true)
      sendMessage({ text: 'Start onboarding' })
    }
  }, [started, messages.length, sendMessage])

  const handleComplete = useCallback(
    async (username: string, githubHandle: string | undefined, toolCallId: string) => {
      setState((s) => ({ ...s, complete: true }))

      try {
        const cvData = (window as any).__heraldCvData
        const res = await fetch('/api/admin/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            githubHandle: githubHandle || state.githubHandle || undefined,
            name: cvData?.name ?? state.cvProfile?.name ?? 'Unknown',
            title: cvData?.title ?? state.cvProfile?.title ?? 'Professional',
            summary: cvData?.summary ?? '',
            stack: cvData?.stack ?? state.cvProfile?.stack ?? [],
            projects: cvData?.projects ?? [],
            experience: cvData?.experience ?? [],
            cvUrl: cvData?.cvUrl ?? null
          })
        })

        addToolOutput({ tool: 'complete_onboarding', toolCallId, output: { success: res.ok } })

        if (res.ok) {
          setTimeout(() => {
            router.push('/candidate')
            router.refresh()
          }, 1500)
        }
      } catch {
        setState((s) => ({ ...s, complete: false }))
        addToolOutput({ tool: 'complete_onboarding', toolCallId, state: 'output-error', errorText: 'Failed' })
      }
    },
    [state.cvProfile, state.githubHandle, router, addToolOutput]
  )

  const handleCompleteRef = useRef(handleComplete)
  handleCompleteRef.current = handleComplete

  useEffect(() => {
    for (const msg of messages) {
      for (const tp of getToolParts(msg)) {
        if (!tp) continue
        const name = getToolName(tp)

        if (tp.output && !handledToolCalls.current.has(`result-${tp.toolCallId}`)) {
          handledToolCalls.current.add(`result-${tp.toolCallId}`)

          if (name === 'check_username') {
            const r = tp.output as { available: boolean; username: string }
            setState((s) => ({ ...s, username: r.username, usernameValid: r.available }))
          }
          if (name === 'verify_github') {
            const r = tp.output as { valid: boolean; handle: string; avatarUrl?: string }
            setState((s) => ({ ...s, githubHandle: r.handle, githubValid: r.valid, githubAvatar: r.avatarUrl }))
          }
        }

        if (tp.state != null && tp.state === 'input-available' && !handledToolCalls.current.has(tp.toolCallId)) {
          handledToolCalls.current.add(tp.toolCallId)

          if (name === 'request_cv_upload') {
            setState((s) => ({ ...s, waitingForCv: true }) as OnboardingState)
          }
          if (name === 'complete_onboarding' && tp.input != null) {
            const args = tp.input as { username: string; githubHandle?: string }
            if (args.username) {
              handleCompleteRef.current(args.username, args.githubHandle, tp.toolCallId)
            }
          }
        }
      }
    }
  }, [messages])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('cv', file)

    let toolCallId = ''
    for (const msg of messages) {
      for (const tp of getToolParts(msg)) {
        if (!tp) continue
        if (getToolName(tp) === 'request_cv_upload') toolCallId = tp.toolCallId
      }
    }

    try {
      const res = await fetch('/api/admin/parse-cv', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Parse failed')
      const profile = await res.json()

      ;(window as any).__heraldCvData = { ...profile, cvUrl: profile.cvUrl ?? null }

      setState((s) => ({
        ...s,
        cvParsed: true,
        cvProfile: {
          name: profile.name,
          title: profile.title,
          stack: profile.stack ?? [],
          projects: profile.projects?.length ?? 0,
          experience: profile.experience?.length ?? 0
        }
      }))

      addToolOutput({
        tool: 'request_cv_upload',
        toolCallId,
        output: {
          success: true,
          name: profile.name,
          title: profile.title,
          skills: profile.stack?.length ?? 0,
          projects: profile.projects?.length ?? 0,
          experience: profile.experience?.length ?? 0
        }
      })
    } catch {
      addToolOutput({
        tool: 'request_cv_upload',
        toolCallId,
        state: 'output-error',
        errorText: 'Failed to parse CV'
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleCvPasteSubmit() {
    if (!cvPasteText.trim()) return

    setUploading(true)

    let toolCallId = ''
    for (const msg of messages) {
      for (const tp of getToolParts(msg)) {
        if (!tp) continue
        if (getToolName(tp) === 'request_cv_upload') toolCallId = tp.toolCallId
      }
    }

    try {
      const res = await fetch('/api/admin/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cvPasteText })
      })
      if (!res.ok) throw new Error('Parse failed')
      const profile = await res.json()

      ;(window as any).__heraldCvData = profile

      setState((s) => ({
        ...s,
        cvParsed: true,
        cvProfile: {
          name: profile.name,
          title: profile.title,
          stack: profile.stack ?? [],
          projects: profile.projects?.length ?? 0,
          experience: profile.experience?.length ?? 0
        }
      }))

      addToolOutput({
        tool: 'request_cv_upload',
        toolCallId,
        output: {
          success: true,
          name: profile.name,
          title: profile.title,
          skills: profile.stack?.length ?? 0,
          projects: profile.projects?.length ?? 0,
          experience: profile.experience?.length ?? 0
        }
      })
      setCvPasteMode(false)
      setCvPasteText('')
    } catch {
      addToolOutput({
        tool: 'request_cv_upload',
        toolCallId,
        state: 'output-error',
        errorText: 'Failed to parse CV text'
      })
    } finally {
      setUploading(false)
    }
  }

  function handleSend() {
    if (!input.trim() || isThinking || state.complete) return
    if (!hasUserSent) setHasUserSent(true)
    sendMessage({ text: input })
    setInput('')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, state])

  const isThinking = status === 'streaming' || status === 'submitted'

  // Get the first agent message for the centered initial state
  const firstAgentMsg = messages.find((m) => {
    if (m.role !== 'assistant') return false
    const text = m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
    return text.length > 0
  })

  const firstAgentText =
    firstAgentMsg?.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''

  // ── Initial centered state (before user sends first message) ──
  if (!hasUserSent) {
    return (
      <div className='flex h-[calc(100vh-57px)] flex-col items-center justify-center px-6'>
        <div className='w-full max-w-[560px]'>
          <p className='mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Herald</p>
          {firstAgentText ? (
            <p className='mb-8 text-lg leading-relaxed text-foreground/80'>{firstAgentText}</p>
          ) : (
            <p className='mb-8 animate-pulse text-lg text-muted-foreground'>...</p>
          )}

          <input ref={fileRef} type='file' accept='.pdf,.txt,.md' onChange={handleFileUpload} className='hidden' />

          <div className='flex gap-2'>
            <Input
              className='h-12 rounded-none border-border bg-card px-4 font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder='Your answer...'
              disabled={isThinking || !firstAgentText}
              autoFocus
            />
            <Button
              type='button'
              variant='outline'
              onClick={handleSend}
              disabled={isThinking || !input.trim()}
              className='h-12 shrink-0 rounded-none border-border px-5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:bg-transparent hover:text-foreground'
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Conversation state (after first user message) ──
  return (
    <div className='flex min-h-screen flex-col'>
      {/* Messages area — scrollable */}
      <div className='flex-1 overflow-y-auto pb-24'>
        <div className='mx-auto max-w-[560px] px-6 pt-8'>
          <div className='flex flex-col gap-5'>
            {messages.map((m) => {
              const text = m.parts
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('')
              if (!text || text === 'Start onboarding') return null

              if (m.role === 'user') {
                return (
                  <div key={m.id} className='flex justify-end'>
                    <div className='max-w-[75%] border border-foreground/10 bg-foreground/5 px-4 py-3 text-sm leading-relaxed text-foreground'>
                      {text}
                    </div>
                  </div>
                )
              }

              return (
                <div key={m.id} className='text-sm leading-relaxed text-foreground/80'>
                  {text}
                </div>
              )
            })}

            {state.cvParsed && state.cvProfile && (
              <div className='border-l-2 border-foreground/20 py-1 pl-3'>
                <p className='font-mono text-sm text-foreground'>
                  ✓ {state.cvProfile.name} — {state.cvProfile.title}
                </p>
                <p className='mt-0.5 font-mono text-[10px] text-muted-foreground'>
                  {state.cvProfile.stack.length} skills · {state.cvProfile.projects} projects ·{' '}
                  {state.cvProfile.experience} roles
                </p>
              </div>
            )}

            {state.complete && <div className='text-sm text-foreground/80'>✓ Your Herald is live — redirecting...</div>}

            {uploading && <div className='animate-pulse text-sm text-muted-foreground'>Extracting your profile...</div>}
            {isThinking && !uploading && <div className='animate-pulse text-sm text-muted-foreground'>...</div>}

            {status === 'error' && !state.complete && (
              <div className='flex items-center gap-3'>
                <span className='text-sm text-destructive'>Something went wrong. Try again?</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => regenerate()}
                  className='h-7 rounded-none font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground'
                >
                  Retry
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input — fixed at bottom */}
      <input ref={fileRef} type='file' accept='.pdf,.txt,.md' onChange={handleFileUpload} className='hidden' />

      <div className='fixed bottom-0 left-0 right-0 border-t border-border bg-background'>
        <div className='mx-auto max-w-[560px] px-6 py-4'>
          {state.waitingForCv && !state.cvParsed && !uploading ? (
            cvPasteMode ? (
              <div className='flex flex-col gap-2'>
                <Textarea
                  className='h-32 resize-none border-border bg-card font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
                  placeholder='Paste your CV text here...'
                  value={cvPasteText}
                  onChange={(e) => setCvPasteText(e.target.value)}
                  autoFocus
                />
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleCvPasteSubmit}
                    disabled={!cvPasteText.trim()}
                    className='h-10 flex-1 rounded-none border-border font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground'
                  >
                    Extract Profile
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => {
                      setCvPasteMode(false)
                      setCvPasteText('')
                    }}
                    className='h-10 rounded-none font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground'
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => fileRef.current?.click()}
                  className='h-12 flex-1 justify-start rounded-none border-border bg-card px-4 font-mono text-sm text-muted-foreground hover:bg-card hover:border-foreground/30 hover:text-foreground'
                >
                  📎 Upload PDF
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setCvPasteMode(true)}
                  className='h-12 rounded-none border-border bg-card px-4 font-mono text-sm text-muted-foreground hover:bg-card hover:border-foreground/30 hover:text-foreground'
                >
                  Paste as text
                </Button>
              </div>
            )
          ) : (
            <div className='flex gap-2'>
              <Input
                className='h-12 rounded-none border-border bg-card px-4 font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder='Your answer...'
                disabled={isThinking || state.complete}
              />
              <Button
                type='button'
                variant='outline'
                onClick={handleSend}
                disabled={isThinking || !input.trim() || state.complete}
                className='h-12 shrink-0 rounded-none border-border px-5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:bg-transparent hover:text-foreground'
              >
                Send
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
