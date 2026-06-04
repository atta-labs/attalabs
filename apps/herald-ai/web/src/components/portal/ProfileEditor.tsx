'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToastContext
} from '@atta/ui'
import { Download, Upload } from 'lucide-react'

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
  cvUrl: string | null
}

const triggerClass =
  'pl-0 pr-6 text-muted-foreground data-[active]:border-primary data-[active]:text-foreground hover:text-foreground/70'

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
  const [cvUrl, setCvUrl] = useState<string | null>(profile.cvUrl)
  const { successToast, errorToast } = useToastContext()
  const [saving, setSaving] = useState(false)
  const [locationSearch, setLocationSearch] = useState(profile.location)
  const [locationOpen, setLocationOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cvUploading, setCvUploading] = useState(false)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const cvDirectRef = useRef<HTMLInputElement>(null)

  const filteredCountries = useMemo(() => {
    if (!locationSearch) return COUNTRIES
    const q = locationSearch.toLowerCase()
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q))
  }, [locationSearch])

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
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
            .filter(Boolean),
          cvUrl
        })
      })
      if (res.ok) {
        successToast('Saved', 'Your profile settings have been updated.')
      } else {
        errorToast('Save failed', 'Could not save changes. Please try again.')
      }
    } catch {
      errorToast('Save failed', 'Could not save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCvUpload(file: File) {
    setUploading(true)

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
      if (parsed.cvUrl) setCvUrl(parsed.cvUrl)
    } finally {
      setUploading(false)
      if (cvInputRef.current) cvInputRef.current.value = ''
    }
  }

  async function handleCvDirectUpload(file: File) {
    setCvUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'cv')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) return
      const { url } = await res.json()
      setCvUrl(url)
    } finally {
      setCvUploading(false)
      if (cvDirectRef.current) cvDirectRef.current.value = ''
    }
  }

  const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'
  const inputClass =
    'bg-card border-border focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
  const sectionHeadClass = 'mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'

  return (
    <Tabs defaultValue='profile'>
      <TabsList className='border-border'>
        <TabsTrigger value='profile' className={triggerClass}>
          Profile
        </TabsTrigger>
        <TabsTrigger value='cv' className={triggerClass}>
          CV
        </TabsTrigger>
        <TabsTrigger value='api-keys' className={triggerClass}>
          API Keys
        </TabsTrigger>
        <TabsTrigger value='connections' className={triggerClass}>
          Connections
        </TabsTrigger>
      </TabsList>

      {/* ── Profile ──────────────────────────────────────────── */}
      <TabsContent value='profile'>
        <div className='space-y-8'>
          <section>
            <h2 className={sectionHeadClass}>Identity</h2>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label htmlFor='field-name' className={labelClass}>
                  Name
                </label>
                <Input
                  id='field-name'
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor='field-title' className={labelClass}>
                  Title
                </label>
                <Input
                  id='field-title'
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                />
              </div>

              <div className='relative'>
                <span className={labelClass}>Location</span>
                <Input
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
                      <Button
                        key={country}
                        type='button'
                        variant='ghost'
                        onClick={() => {
                          setLocationSearch(country)
                          update('location', country)
                          setLocationOpen(false)
                        }}
                        className={`h-auto w-full justify-start rounded-none px-3 py-1.5 font-sans text-sm ${
                          form.location === country ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {country}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className={labelClass}>Work Mode</span>
                <Select value={form.availability} onValueChange={(value) => update('availability', value)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder='Select...' />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section>
            <div className='mb-2 flex items-baseline justify-between'>
              <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Summary</h2>
              <span className='font-mono text-[9px] text-muted-foreground/60'>
                markdown supported · headers, lists, bold, code
              </span>
            </div>
            <Textarea
              className={`${inputClass} h-40 max-h-[160px] resize-none overflow-y-auto font-mono text-xs`}
              value={form.summary}
              onChange={(e) => update('summary', e.target.value)}
              placeholder={'# Senior Engineer\n\n15+ years across backend, frontend, and AI systems...'}
            />
          </section>

          <section>
            <div className='mb-2 flex items-baseline justify-between'>
              <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Stack</h2>
              <span className='font-mono text-[9px] text-muted-foreground/60'>comma-separated</span>
            </div>
            <Textarea
              className={`${inputClass} h-24 max-h-[96px] resize-none overflow-y-auto`}
              value={form.stack}
              onChange={(e) => update('stack', e.target.value)}
            />
          </section>

          <div className='flex items-center gap-3 border-t border-border pt-6'>
            <Button
              type='button'
              variant='outline'
              onClick={handleSave}
              disabled={saving}
              className='font-mono text-xs uppercase tracking-[0.2em]'
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>
      </TabsContent>

      {/* ── CV ───────────────────────────────────────────────── */}
      <TabsContent value='cv'>
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
        <input
          ref={cvDirectRef}
          type='file'
          accept='application/pdf'
          className='hidden'
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleCvDirectUpload(file)
          }}
        />
        <div className='space-y-8'>
          <section className='rounded border border-dashed border-border p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
                  Replace from CV
                </h2>
                <p className='mt-1 font-mono text-[10px] text-muted-foreground'>
                  Upload a new CV to overwrite all profile fields at once.
                </p>
              </div>
              <Button
                type='button'
                variant='outline'
                onClick={() => cvInputRef.current?.click()}
                disabled={uploading}
                className='font-mono text-xs uppercase tracking-[0.2em]'
              >
                {uploading ? 'Parsing...' : 'Upload CV'}
              </Button>
            </div>
          </section>

          <section>
            <h2 className={sectionHeadClass}>CV File</h2>
            {cvUrl ? (
              <div className='flex items-center gap-3'>
                <a
                  href={cvUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
                >
                  <Download className='h-3 w-3' />
                  Download CV
                </a>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => cvDirectRef.current?.click()}
                  disabled={cvUploading}
                  className='font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground'
                >
                  {cvUploading ? 'Uploading...' : 'Replace'}
                </Button>
              </div>
            ) : (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => cvDirectRef.current?.click()}
                disabled={cvUploading}
                className='gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em]'
              >
                <Upload className='h-3 w-3' />
                {cvUploading ? 'Uploading...' : 'Upload CV (PDF)'}
              </Button>
            )}
          </section>
        </div>
      </TabsContent>

      {/* ── API Keys ─────────────────────────────────────────── */}
      <TabsContent value='api-keys'>
        <div className='rounded border border-dashed border-border px-6 py-12 text-center'>
          <p className='font-mono text-xs text-muted-foreground'>API key management coming soon.</p>
        </div>
      </TabsContent>

      {/* ── Connections ──────────────────────────────────────── */}
      <TabsContent value='connections'>
        <div className='space-y-8'>
          <section>
            <h2 className={sectionHeadClass}>GitHub</h2>
            <label htmlFor='field-github' className={labelClass}>
              GitHub Handle
            </label>
            <Input
              id='field-github'
              className={inputClass}
              value={form.github}
              onChange={(e) => update('github', e.target.value)}
            />
          </section>

          <div className='flex items-center gap-3 border-t border-border pt-6'>
            <Button
              type='button'
              variant='outline'
              onClick={handleSave}
              disabled={saving}
              className='font-mono text-xs uppercase tracking-[0.2em]'
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
