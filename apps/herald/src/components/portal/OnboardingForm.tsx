'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function OnboardingForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    username: '',
    githubHandle: '',
    name: '',
    title: '',
    location: '',
    availability: '',
    summary: '',
    stack: ''
  })
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'username') setUsernameStatus('idle')
  }

  async function checkUsername() {
    const username = form.username.trim().toLowerCase()
    if (username.length < 3) return
    setUsernameStatus('checking')
    try {
      const res = await fetch(`/api/admin/check-username?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      setUsernameStatus(data.available ? 'available' : 'taken')
    } catch {
      setUsernameStatus('idle')
    }
  }

  async function handleSubmit() {
    if (!form.username.trim() || !form.name.trim() || !form.title.trim() || !form.summary.trim()) {
      setError('Username, name, title, and summary are required.')
      return
    }
    if (usernameStatus === 'taken') {
      setError('Username is taken.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim().toLowerCase(),
          githubHandle: form.githubHandle.trim() || undefined,
          name: form.name.trim(),
          title: form.title.trim(),
          location: form.location.trim() || undefined,
          availability: form.availability.trim() || undefined,
          summary: form.summary.trim(),
          stack: form.stack
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong.')
        return
      }

      router.push('/admin')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full border border-border bg-card px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted focus:border-foreground/30 focus:outline-none'
  const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted'

  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8'>
        <h1 className='font-display text-2xl tracking-tight'>Launch Your Envoy</h1>
        <p className='mt-1 text-sm text-muted'>Set up your profile. This takes about a minute.</p>
      </header>

      <div className='space-y-6'>
        {/* ── Username ── */}
        <label>
          <span className={labelClass}>Username (your URL: heyherald.com/username)</span>
          <div className='flex gap-2'>
            <input
              className={inputClass}
              value={form.username}
              onChange={(e) => update('username', e.target.value.replace(/[^a-z0-9-]/g, ''))}
              placeholder='dani'
            />
            <button
              type='button'
              onClick={checkUsername}
              disabled={form.username.trim().length < 3}
              className='shrink-0 border border-border px-3 py-2 font-mono text-[10px] uppercase text-muted transition-colors hover:text-foreground disabled:opacity-30'
            >
              Check
            </button>
          </div>
          {usernameStatus === 'available' && <p className='mt-1 font-mono text-[10px] text-foreground'>Available</p>}
          {usernameStatus === 'taken' && <p className='mt-1 font-mono text-[10px] text-destructive'>Taken</p>}
        </label>

        {/* ── GitHub ── */}
        <label>
          <span className={labelClass}>GitHub Handle (optional — enables signal detection)</span>
          <input
            className={inputClass}
            value={form.githubHandle}
            onChange={(e) => update('githubHandle', e.target.value)}
            placeholder='daniboomerang'
          />
        </label>

        {/* ── Identity ── */}
        <div className='grid grid-cols-2 gap-4'>
          <label>
            <span className={labelClass}>Full Name</span>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder='Dani Estevez Martin'
            />
          </label>
          <label>
            <span className={labelClass}>Title</span>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder='Senior Frontend Architect'
            />
          </label>
          <label>
            <span className={labelClass}>Location</span>
            <input
              className={inputClass}
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder='Koh Phangan, Thailand (Remote)'
            />
          </label>
          <label>
            <span className={labelClass}>Availability</span>
            <input
              className={inputClass}
              value={form.availability}
              onChange={(e) => update('availability', e.target.value)}
              placeholder='Available immediately'
            />
          </label>
        </div>

        {/* ── Summary ── */}
        <label>
          <span className={labelClass}>Summary</span>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            value={form.summary}
            onChange={(e) => update('summary', e.target.value)}
            placeholder='Senior Frontend Architect with 15+ years experience...'
          />
        </label>

        {/* ── Stack ── */}
        <label>
          <span className={labelClass}>Stack (comma-separated)</span>
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={form.stack}
            onChange={(e) => update('stack', e.target.value)}
            placeholder='React, Next.js, TypeScript, Tailwind CSS'
          />
        </label>

        {/* ── Submit ── */}
        {error && <p className='font-mono text-xs text-destructive'>{error}</p>}

        <button
          type='button'
          onClick={handleSubmit}
          disabled={saving}
          className='w-full border border-foreground/20 bg-foreground/5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-30'
        >
          {saving ? 'Launching...' : 'Launch My Envoy'}
        </button>
      </div>
    </div>
  )
}
