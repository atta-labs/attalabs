'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Button, Input } from '@atta/ui/components'

type ParseStatus = 'idle' | 'uploading' | 'parsed' | 'error'
type FieldStatus = 'idle' | 'checking' | 'valid' | 'invalid'

interface ParsedProfile {
  name: string
  title: string
  location?: string
  availability?: string
  summary: string
  stack: string[]
  projects: Array<{ title: string; description: string }>
  experience: Array<{ company: string; role: string; period: string; highlights: string[] }>
}

export function OnboardingForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState('')
  const [githubHandle, setGithubHandle] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>('idle')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [githubStatus, setGithubStatus] = useState<FieldStatus>('idle')
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle')
  const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkUsername() {
    const u = username.trim().toLowerCase()
    if (u.length < 3) {
      setUsernameStatus('invalid')
      setUsernameError('Must be at least 3 characters')
      return
    }
    if (!/^[a-z0-9-]+$/.test(u)) {
      setUsernameStatus('invalid')
      setUsernameError('Only lowercase letters, numbers, and hyphens')
      return
    }
    setUsernameStatus('checking')
    setUsernameError(null)
    try {
      const res = await fetch(`/api/admin/check-username?username=${encodeURIComponent(u)}`)
      const data = await res.json()
      if (data.available) {
        setUsernameStatus('valid')
        setUsernameError(null)
      } else {
        setUsernameStatus('invalid')
        setUsernameError(data.reason ?? 'Taken')
      }
    } catch {
      setUsernameStatus('idle')
    }
  }

  async function checkGitHub() {
    const handle = githubHandle.trim()
    if (!handle) {
      setGithubStatus('idle')
      return
    }
    setGithubStatus('checking')
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`)
      setGithubStatus(res.ok ? 'valid' : 'invalid')
    } catch {
      setGithubStatus('idle')
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseStatus('uploading')
    setError(null)

    const formData = new FormData()
    formData.append('cv', file)

    try {
      const res = await fetch('/api/admin/parse-cv', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to parse CV')
      }
      const profile: ParsedProfile = await res.json()
      setParsedProfile(profile)
      setParseStatus('parsed')
    } catch (err) {
      setParseStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to parse CV')
    }
  }

  async function handleSubmit() {
    if (usernameStatus !== 'valid') {
      setError('Please enter a valid, available username.')
      return
    }
    if (githubHandle.trim() && githubStatus !== 'valid') {
      setError('GitHub handle is invalid.')
      return
    }
    if (!parsedProfile) {
      setError('Please upload your CV first.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          githubHandle: githubHandle.trim() || undefined,
          ...parsedProfile
        })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong.')
        return
      }

      router.push('/bulk-audit')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const labelClass = 'mb-1 block font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'

  function statusIndicator(status: FieldStatus, invalidMsg?: string) {
    if (status === 'checking') return <p className='mt-1 font-mono text-xs text-muted-foreground'>Checking...</p>
    if (status === 'valid') return <p className='mt-1 font-mono text-xs text-foreground'>✓ Valid</p>
    if (status === 'invalid')
      return <p className='mt-1 font-mono text-xs text-destructive'>{invalidMsg ?? 'Invalid'}</p>
    return null
  }

  const canSubmit =
    usernameStatus === 'valid' && parsedProfile && !saving && (!githubHandle.trim() || githubStatus === 'valid')

  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8'>
        <h1 className='font-display text-2xl tracking-tight'>Launch Your Herald</h1>
        <p className='mt-1 text-sm text-muted-foreground'>Pick a username, upload your CV. We extract the rest.</p>
      </header>

      <div className='flex flex-col gap-6'>
        {/* ── Username + GitHub (same row) ── */}
        <div className='grid grid-cols-2 gap-4'>
          <label htmlFor='onboarding-username'>
            <span className={labelClass}>Username</span>
            <Input
              id='onboarding-username'
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.replace(/[^a-z0-9-]/g, ''))
                setUsernameStatus('idle')
                setUsernameError(null)
              }}
              onBlur={checkUsername}
              placeholder='dani'
            />
            {statusIndicator(usernameStatus, usernameError ?? 'Taken')}
          </label>
          <label htmlFor='onboarding-github'>
            <span className={labelClass}>GitHub Handle (optional)</span>
            <Input
              id='onboarding-github'
              value={githubHandle}
              onChange={(e) => {
                setGithubHandle(e.target.value)
                setGithubStatus('idle')
              }}
              onBlur={checkGitHub}
              placeholder='daniboomerang'
            />
            {statusIndicator(githubStatus, 'GitHub user not found')}
          </label>
        </div>

        {/* ── CV Upload ── */}
        <div>
          <span className={labelClass}>CV / Resume (PDF, TXT, or Markdown)</span>
          <input ref={fileRef} type='file' accept='.pdf,.txt,.md' onChange={handleFileUpload} className='hidden' />
          <Button
            type='button'
            variant='outline'
            onClick={() => fileRef.current?.click()}
            disabled={parseStatus === 'uploading'}
            className='w-full justify-start font-sans text-sm'
          >
            {parseStatus === 'uploading' ? 'Parsing your CV...' : fileName ? `✓ ${fileName}` : 'Click to upload'}
          </Button>
          {parseStatus === 'parsed' && parsedProfile && (
            <div className='mt-3 border-l border-foreground/10 pl-3'>
              <p className='font-mono text-xs text-foreground'>
                Extracted: {parsedProfile.name} — {parsedProfile.title}
              </p>
              <p className='mt-0.5 font-mono text-xs text-muted-foreground'>
                {parsedProfile.stack.length} skills · {parsedProfile.projects.length} projects ·{' '}
                {parsedProfile.experience.length} roles
              </p>
            </div>
          )}
          {parseStatus === 'error' && <p className='mt-1 font-mono text-xs text-destructive'>Failed to parse CV</p>}
        </div>

        {/* ── Error ── */}
        {error && <p className='font-mono text-xs text-destructive'>{error}</p>}

        {/* ── Submit ── */}
        <Button
          type='button'
          variant='outline'
          onClick={handleSubmit}
          disabled={!canSubmit}
          className='w-full py-3 font-mono text-xs uppercase tracking-[0.2em] disabled:opacity-30'
        >
          {saving ? 'Launching...' : 'Launch My Herald'}
        </Button>
      </div>
    </div>
  )
}
