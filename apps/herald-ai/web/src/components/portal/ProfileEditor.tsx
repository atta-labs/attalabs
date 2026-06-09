'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
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
} from '@atta/ui/components'
import { Download, ExternalLink, Upload, X } from 'lucide-react'
import { AttaUserProfile, ProviderKeysSection } from '@atta/ui/account'
import { AvatarFrame } from '@/components/avatar-frame'
import { DiscordIcon, GitHubIcon, LinkedInIcon } from '@/components/social-icons'
import { SummaryMarkdown } from '@/components/summary-markdown'

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
  linkedin: string
  discord: string
  summary: string
  stack: string[]
  cvUrl: string | null
  avatarUrl: string | null
  isPublished: boolean
  hasAnthropicKey: boolean
}

export function ProfileEditor({ profile }: { profile: ProfileData }) {
  const [form, setForm] = useState({
    name: profile.name,
    title: profile.title,
    location: profile.location,
    availability: profile.availability,
    github: profile.github,
    linkedin: profile.linkedin,
    discord: profile.discord,
    summary: profile.summary,
    stack: profile.stack.join(', ')
  })
  const [cvUrl, setCvUrl] = useState<string | null>(profile.cvUrl)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [stackInput, setStackInput] = useState('')
  const [summaryMode, setSummaryMode] = useState<'edit' | 'preview'>('edit')
  const { successToast, errorToast } = useToastContext()
  const [saving, setSaving] = useState(false)
  const [published, setPublished] = useState(profile.isPublished)
  const [publishing, setPublishing] = useState(false)
  const [showKeylessConfirm, setShowKeylessConfirm] = useState(false)
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

  async function handleAvatarUpload(file: File) {
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'avatar')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) return
      const { url } = (await res.json()) as { url: string }
      setAvatarUrl(url)
    } finally {
      setAvatarUploading(false)
    }
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
          linkedinUrl: form.linkedin,
          discordHandle: form.discord,
          summary: form.summary,
          stack: form.stack
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          cvUrl,
          avatarUrl
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
        linkedin: form.linkedin,
        discord: form.discord,
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

  async function doPublish() {
    setShowKeylessConfirm(false)
    setPublishing(true)
    try {
      const next = !published
      const res = await fetch('/api/admin/profile-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: next })
      })
      if (res.ok) {
        setPublished(next)
        successToast(
          next ? 'Profile published' : 'Profile unpublished',
          next ? 'Your profile is now publicly accessible.' : 'Your profile is now hidden from public view.'
        )
      } else {
        errorToast('Failed', 'Could not update visibility. Please try again.')
      }
    } catch {
      errorToast('Failed', 'Could not update visibility. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  function handleTogglePublish() {
    if (!published && !profile.hasAnthropicKey) {
      setShowKeylessConfirm(true)
      return
    }
    void doPublish()
  }

  const STACK_MAX = 20

  const stackTags = form.stack
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const stackAtLimit = stackTags.length >= STACK_MAX
  const stackOverLimit = stackTags.length > STACK_MAX

  const cvFilename = cvUrl
    ? `${form.name.replace(/\s+/g, '_')}_CV.${cvUrl.split('.').pop()?.split('?')[0] ?? 'pdf'}`
    : null

  function addTag(value: string) {
    const tag = value.trim()
    if (!tag || stackTags.includes(tag) || stackAtLimit) return
    update('stack', [...stackTags, tag].join(', '))
  }

  function removeTag(tag: string) {
    update('stack', stackTags.filter((t) => t !== tag).join(', '))
  }

  const labelClass = 'mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'
  const inputClass =
    'bg-card border-border focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
  const sectionHeadClass = 'mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'

  return (
    <div>
      <div className='mb-8 flex justify-end'>
        {showKeylessConfirm ? (
          <div className='flex shrink-0 flex-col items-end gap-2'>
            <p className='max-w-[260px] text-right font-mono text-[10px] text-muted-foreground'>
              Recruiters won't be able to run the audit until you add an Anthropic API key. Publish anyway?
            </p>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setShowKeylessConfirm(false)}
                className='font-mono text-[10px] uppercase tracking-[0.2em]'
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='default'
                size='sm'
                onClick={() => void doPublish()}
                disabled={publishing}
                className='font-mono text-[10px] uppercase tracking-[0.2em]'
              >
                {publishing ? '...' : 'Publish Anyway'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type='button'
            variant={published ? 'outline' : 'default'}
            onClick={handleTogglePublish}
            disabled={publishing}
            className='shrink-0 font-mono text-xs uppercase tracking-[0.2em]'
          >
            {publishing ? '...' : published ? 'Unpublish' : 'Publish Profile'}
          </Button>
        )}
      </div>
      {!profile.hasAnthropicKey && (
        <Card className='mb-6 w-full border-destructive/25 bg-destructive/8'>
          <CardContent className='py-3'>
            <p className='font-mono text-xs text-destructive'>
              Audit disabled — add your Anthropic API key in the API Keys tab to enable forensic match reports for
              recruiters.
            </p>
          </CardContent>
        </Card>
      )}
      <Tabs defaultValue='profile'>
        <TabsList>
          <TabsTrigger value='profile'>Profile</TabsTrigger>
          <TabsTrigger value='experience'>Experience</TabsTrigger>
          <TabsTrigger value='connections'>Connections</TabsTrigger>
          <TabsTrigger value='api-keys'>API Keys</TabsTrigger>
          <TabsTrigger value='account'>Account</TabsTrigger>
        </TabsList>

        {/* ── Profile ──────────────────────────────────────────── */}
        <TabsContent value='profile'>
          <div className='space-y-8'>
            <section>
              <div className='flex items-center gap-6 pb-5'>
                {avatarUrl ? (
                  <AvatarFrame src={avatarUrl} alt={form.name} size={80} />
                ) : (
                  <div className='relative shrink-0' style={{ width: 80, height: 80 }}>
                    <div className='absolute inset-0 flex items-center justify-center overflow-hidden rounded-[10px] border-[1.5px] border-border bg-card'>
                      <span className='font-mono text-lg text-muted-foreground'>?</span>
                      <div className='absolute right-1.5 top-1.5 h-[6px] w-[6px] border-r border-t border-muted-foreground' />
                      <div className='absolute bottom-1.5 left-1.5 h-[6px] w-[6px] border-b border-l border-muted-foreground' />
                    </div>
                  </div>
                )}
                <div className='flex flex-col gap-2'>
                  <input
                    ref={avatarInputRef}
                    type='file'
                    accept='image/jpeg,image/png,image/webp'
                    className='hidden'
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleAvatarUpload(file)
                    }}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className='gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em]'
                  >
                    <Upload className='h-3 w-3' />
                    {avatarUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <p className='font-mono text-[10px] text-muted-foreground'>JPG, PNG, WebP · max 5 MB</p>
                </div>
              </div>
            </section>

            <section>
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

        {/* ── Experience ───────────────────────────────────────── */}
        <TabsContent value='experience'>
          <div className='space-y-8'>
            <section>
              <div className='mb-2 flex items-baseline justify-between'>
                <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Summary</h2>
                <div className='flex overflow-hidden rounded border border-border'>
                  <Button
                    type='button'
                    variant={summaryMode === 'edit' ? 'default' : 'ghost'}
                    onClick={() => setSummaryMode('edit')}
                    className='h-auto rounded-none px-2.5 py-0.5 font-mono text-[9px]'
                  >
                    Edit
                  </Button>
                  <Button
                    type='button'
                    variant={summaryMode === 'preview' ? 'default' : 'ghost'}
                    onClick={() => setSummaryMode('preview')}
                    className='h-auto rounded-none border-l border-border px-2.5 py-0.5 font-mono text-[9px]'
                  >
                    Preview
                  </Button>
                </div>
              </div>
              {summaryMode === 'edit' ? (
                <>
                  <Textarea
                    className={`${inputClass} h-40 max-h-[160px] resize-none overflow-y-auto font-mono text-xs`}
                    value={form.summary}
                    onChange={(e) => update('summary', e.target.value)}
                    placeholder={
                      '**One-line lead — your seniority and focus in a single bold sentence.**\n\n## Background\nWhere you started and how you got here.\n\n## How I Work\nYour approach, values, what makes you effective.\n\n## Your Lab / Projects\nWhat you build independently.'
                    }
                  />
                  <p className='mt-1 font-mono text-[9px] text-muted-foreground/60'>
                    Use <strong className='font-medium'>**bold**</strong> for the lead and ## for section titles.
                  </p>
                </>
              ) : (
                <div className='min-h-40 rounded-md border border-border px-4 py-3'>
                  {form.summary ? (
                    <SummaryMarkdown text={form.summary} />
                  ) : (
                    <p className='font-mono text-[9px] text-muted-foreground/60'>Nothing to preview.</p>
                  )}
                </div>
              )}
            </section>

            <section>
              <div className='mb-2 flex items-baseline justify-between'>
                <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Stack</h2>
                <span
                  className={`font-mono text-[9px] ${stackOverLimit ? 'text-destructive' : stackAtLimit ? 'text-warning' : 'text-muted-foreground/60'}`}
                >
                  {stackOverLimit
                    ? `${stackTags.length}/${STACK_MAX} — remove tags to reach limit`
                    : stackAtLimit
                      ? `${stackTags.length}/${STACK_MAX} · limit reached`
                      : `${stackTags.length}/${STACK_MAX} · Enter or comma to add`}
                </span>
              </div>
              <div
                className='flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 focus-within:border-foreground/30'
                onClick={(e) => {
                  const input = (e.currentTarget as HTMLElement).querySelector('input')
                  input?.focus()
                }}
              >
                {stackTags.map((tag) => (
                  <span
                    key={tag}
                    className='flex items-center gap-1 rounded border border-border px-2 py-0.5 font-mono text-xs text-foreground'
                  >
                    {tag}
                    <Button
                      type='button'
                      variant='ghost'
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag}`}
                      className='h-auto w-auto p-0 text-muted-foreground hover:text-foreground'
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </span>
                ))}
                {!stackAtLimit && (
                  <Input
                    value={stackInput}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val.endsWith(',')) {
                        addTag(val.slice(0, -1))
                        setStackInput('')
                      } else {
                        setStackInput(val)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(stackInput)
                        setStackInput('')
                      } else if (e.key === 'Backspace' && !stackInput && stackTags.length > 0) {
                        const last = stackTags[stackTags.length - 1]
                        if (last) removeTag(last)
                      }
                    }}
                    placeholder={stackTags.length === 0 ? 'React, TypeScript, Node...' : ''}
                    className='h-auto min-w-24 flex-1 border-0 bg-transparent px-0 py-0 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0'
                  />
                )}
              </div>
            </section>

            {/* ── CV (file state) ─────────────────────────────────── */}
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
            <section>
              <h2 className={sectionHeadClass}>CV File</h2>
              {cvUrl ? (
                <Card className='w-full'>
                  <CardContent className='p-4'>
                    <div className='mb-4 flex items-center gap-2.5'>
                      <span className='font-mono text-sm text-foreground'>{cvFilename}</span>
                      <span className='rounded-sm bg-success/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-success'>
                        Uploaded
                      </span>
                    </div>
                    <div className='flex items-center gap-4'>
                      <a
                        href={cvUrl}
                        download={cvFilename ?? undefined}
                        className='inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground'
                      >
                        <Download className='h-3.5 w-3.5' />
                        Download
                      </a>
                      <a
                        href={cvUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground'
                      >
                        <ExternalLink className='h-3.5 w-3.5' />
                        Open
                      </a>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => cvDirectRef.current?.click()}
                        disabled={cvUploading}
                        className='h-auto px-0 font-mono text-xs text-muted-foreground hover:bg-transparent hover:text-foreground'
                      >
                        {cvUploading ? 'Uploading...' : 'Replace'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className='flex flex-col items-start gap-3 rounded border border-dashed border-border p-6'>
                  <p className='font-mono text-xs text-muted-foreground'>No CV uploaded yet.</p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => cvDirectRef.current?.click()}
                    disabled={cvUploading}
                    className='gap-1.5 font-mono text-xs uppercase tracking-[0.15em]'
                  >
                    <Upload className='h-3.5 w-3.5' />
                    {cvUploading ? 'Uploading...' : 'Upload CV'}
                  </Button>
                </div>
              )}
            </section>

            {/* ── Parse & overwrite (destructive) ────────────────── */}
            <section>
              <div className='rounded border border-dashed border-destructive/30 p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-destructive'>
                      Overwrite from CV
                    </h2>
                    <p className='mt-1 font-mono text-[10px] text-muted-foreground'>
                      Parse a CV and overwrite name, title, summary, and stack. Cannot be undone.
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => cvInputRef.current?.click()}
                    disabled={uploading}
                    className='shrink-0 border-destructive/40 font-mono text-[10px] uppercase tracking-[0.15em] text-destructive hover:bg-destructive/10 hover:text-destructive'
                  >
                    {uploading ? 'Parsing...' : 'Parse & Overwrite'}
                  </Button>
                </div>
              </div>
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

        {/* ── API Keys ─────────────────────────────────────────── */}
        <TabsContent value='api-keys'>
          <ProviderKeysSection />
        </TabsContent>

        {/* ── Account ──────────────────────────────────────────── */}
        <TabsContent value='account'>
          <AttaUserProfile />
        </TabsContent>

        {/* ── Connections ──────────────────────────────────────── */}
        <TabsContent value='connections'>
          <div className='space-y-8'>
            <section>
              <div className='mb-4 flex items-center gap-2'>
                <GitHubIcon className='h-3.5 w-3.5 text-foreground' />
                <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>GitHub</h2>
              </div>
              <label htmlFor='field-github' className={labelClass}>
                Handle
              </label>
              <Input
                id='field-github'
                className={inputClass}
                value={form.github}
                onChange={(e) => update('github', e.target.value)}
                placeholder='yourhandle'
              />
            </section>

            <section>
              <div className='mb-4 flex items-center gap-2'>
                <LinkedInIcon className='h-3.5 w-3.5 text-foreground' />
                <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>LinkedIn</h2>
              </div>
              <label htmlFor='field-linkedin' className={labelClass}>
                Profile URL
              </label>
              <Input
                id='field-linkedin'
                className={inputClass}
                value={form.linkedin}
                onChange={(e) => update('linkedin', e.target.value)}
                placeholder='https://linkedin.com/in/yourname'
              />
            </section>

            <section>
              <div className='mb-4 flex items-center gap-2'>
                <DiscordIcon className='h-3.5 w-3.5 text-foreground' />
                <h2 className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Discord</h2>
              </div>
              <label htmlFor='field-discord' className={labelClass}>
                Handle
              </label>
              <Input
                id='field-discord'
                className={inputClass}
                value={form.discord}
                onChange={(e) => update('discord', e.target.value)}
                placeholder='@username'
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
    </div>
  )
}
