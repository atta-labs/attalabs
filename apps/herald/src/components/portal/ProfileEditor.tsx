'use client'

import { useState } from 'react'

interface ProfileData {
  name: string
  title: string
  location: string
  availability: string
  github: string
  summary: string
  stack: string[]
}

export function ProfileEditor({ profile }: { profile: ProfileData }) {
  const [form, setForm] = useState({
    name: profile.name,
    title: profile.title,
    location: profile.location,
    availability: profile.availability,
    github: profile.github,
    summary: profile.summary,
    stack: profile.stack.join(', ')
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          title: form.title,
          location: form.location,
          availability: form.availability,
          githubHandle: form.github,
          summary: form.summary,
          stack: form.stack
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        })
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full border border-border bg-card px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none'
  const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'

  return (
    <div className='space-y-8'>
      <section>
        <h2 className='mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Identity</h2>
        <div className='grid grid-cols-2 gap-4'>
          <label>
            <span className={labelClass}>Name</span>
            <input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Title</span>
            <input className={inputClass} value={form.title} onChange={(e) => update('title', e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Location</span>
            <input className={inputClass} value={form.location} onChange={(e) => update('location', e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Availability</span>
            <input
              className={inputClass}
              value={form.availability}
              onChange={(e) => update('availability', e.target.value)}
            />
          </label>
          <label>
            <span className={labelClass}>GitHub Handle</span>
            <input className={inputClass} value={form.github} onChange={(e) => update('github', e.target.value)} />
          </label>
        </div>
      </section>

      <section>
        <h2 className='mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Summary</h2>
        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          value={form.summary}
          onChange={(e) => update('summary', e.target.value)}
        />
      </section>

      <section>
        <h2 className='mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
          Stack (comma-separated)
        </h2>
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={form.stack}
          onChange={(e) => update('stack', e.target.value)}
        />
      </section>

      <div className='flex items-center gap-3 border-t border-border pt-6'>
        <button
          type='button'
          onClick={handleSave}
          disabled={saving}
          className='border border-foreground/20 bg-foreground/5 px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-30'
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        {saved && <span className='font-mono text-xs text-muted-foreground'>Saved</span>}
      </div>
    </div>
  )
}
