'use client'

import { useMemo, useRef, useState } from 'react'

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'] as const

const COUNTRIES = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Cape Verde',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Djibouti',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe'
]

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
  const [locationSearch, setLocationSearch] = useState(profile.location)
  const [locationOpen, setLocationOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const cvInputRef = useRef<HTMLInputElement>(null)

  const filteredCountries = useMemo(() => {
    if (!locationSearch) return COUNTRIES
    const q = locationSearch.toLowerCase()
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q))
  }, [locationSearch])

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

  async function handleCvUpload(file: File) {
    setUploading(true)
    setSaved(false)
    try {
      const formData = new FormData()
      formData.append('cv', file)
      const res = await fetch('/api/admin/parse-cv', { method: 'POST', body: formData })
      if (!res.ok) return

      const parsed = await res.json()
      setForm({
        name: parsed.name ?? form.name,
        title: parsed.title ?? form.title,
        location: parsed.location ?? form.location,
        availability: parsed.availability ?? form.availability,
        github: parsed.github_handle ?? parsed.github ?? form.github,
        summary: parsed.summary ?? form.summary,
        stack: Array.isArray(parsed.stack) ? parsed.stack.join(', ') : form.stack
      })
      if (parsed.location) setLocationSearch(parsed.location)
    } finally {
      setUploading(false)
      if (cvInputRef.current) cvInputRef.current.value = ''
    }
  }

  const inputClass =
    'w-full border border-border bg-card px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none'
  const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'

  return (
    <div className='space-y-8'>
      {/* CV Upload */}
      <section className='rounded border border-dashed border-border p-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Replace from CV</h2>
            <p className='mt-1 font-mono text-[10px] text-muted-foreground'>
              Upload a new CV to overwrite all profile fields at once.
            </p>
          </div>
          <div>
            <input
              ref={cvInputRef}
              type='file'
              accept='.pdf,.txt,.md'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCvUpload(file)
              }}
            />
            <button
              type='button'
              onClick={() => cvInputRef.current?.click()}
              disabled={uploading}
              className='border border-foreground/20 bg-foreground/5 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-30'
            >
              {uploading ? 'Parsing...' : 'Upload CV'}
            </button>
          </div>
        </div>
      </section>

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

          {/* Location — country search dropdown */}
          <div className='relative'>
            <span className={labelClass}>Location</span>
            <input
              className={inputClass}
              value={locationSearch}
              onChange={(e) => {
                setLocationSearch(e.target.value)
                setLocationOpen(true)
              }}
              onFocus={() => setLocationOpen(true)}
              placeholder='Search country...'
            />
            {locationOpen && filteredCountries.length > 0 && (
              <div className='absolute z-20 mt-1 max-h-48 w-full overflow-y-auto border border-border bg-card shadow-lg'>
                {filteredCountries.map((country) => (
                  <button
                    key={country}
                    type='button'
                    onClick={() => {
                      setLocationSearch(country)
                      update('location', country)
                      setLocationOpen(false)
                    }}
                    className={`w-full px-3 py-1.5 text-left font-sans text-sm transition-colors hover:bg-foreground/10 ${
                      form.location === country ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Availability — work mode select */}
          <div>
            <span className={labelClass}>Work Mode</span>
            <select
              className={`${inputClass} appearance-none`}
              value={form.availability}
              onChange={(e) => update('availability', e.target.value)}
            >
              <option value=''>Select...</option>
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

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
