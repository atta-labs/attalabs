'use client'

import { IdentityContext } from '@atta/identity/react'
import type { ModelEntry, VendorId } from '@atta/models'
import { VENDORS, VENDOR_ORDER, getVendor } from '@atta/models'
import { ProviderIcon } from '@lobehub/icons'
import { Check, ChevronsUpDown, ExternalLink, Lock } from 'lucide-react'

const LOBEHUB_MODEL_PREFIXES = ['claude-', 'gpt-', 'o1-', 'o3-', 'o4-', 'gemini-', 'deepseek-', 'llama-']
function hasModelIcon(modelId: string): boolean {
  const lower = modelId.toLowerCase()
  return LOBEHUB_MODEL_PREFIXES.some((p) => lower.startsWith(p))
}
import * as React from 'react'

import { cn } from '../../../../lib/utils'
import { Badge } from '../../installed/badge'
import { Button } from '../interactive/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '../../installed/command'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../../installed/dialog'
import { Input } from '../../installed/input'
import { ModelIcon } from './model-icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../installed/popover'

export interface ModelPickerValue {
  route: VendorId
  modelId: string
}

export interface ModelPickerProps {
  options: ModelEntry[]
  value: ModelPickerValue | null
  onChange: (value: ModelPickerValue) => void
  configuredRoutes?: Set<VendorId>
  // Returning a Promise lets the picker await the caller (e.g. probe the key
  // against the provider) before closing. Throw on failure to keep the key-
  // entry view open and surface the error inline.
  onProvideKey?: (route: VendorId, key: string) => void | Promise<void>
  trigger?: React.ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  settingsHref?: string
  settingsLabel?: string
  className?: string
  /** 'popover' (default) anchors to the trigger; 'modal' opens a centered dialog. */
  mode?: 'popover' | 'modal'
}

export function ModelPicker({
  options,
  value,
  onChange,
  configuredRoutes,
  onProvideKey,
  trigger,
  align = 'start',
  side = 'bottom',
  settingsHref,
  settingsLabel = 'Configure defaults →',
  className,
  mode = 'popover'
}: ModelPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [keyEntryRoute, setKeyEntryRoute] = React.useState<VendorId | null>(null)
  const [pendingModel, setPendingModel] = React.useState<ModelEntry | null>(null)
  const [keyInput, setKeyInput] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [flagshipOnly, setFlagshipOnly] = React.useState(false)
  const [freeOnly, setFreeOnly] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')
  const [expandedGroups, setExpandedGroups] = React.useState<Set<VendorId>>(new Set())

  // Read IdentityContext directly (not via useIdentity) so this component works
  // in apps that don't mount IdentityProvider — e.g. Herald, where BYOK keys
  // live server-side and the caller passes configuredRoutes explicitly.
  const identity = React.useContext(IdentityContext)
  const identityConfigured = React.useMemo(
    () =>
      identity
        ? new Set<VendorId>([
            ...(Object.keys(identity.state.keys) as VendorId[]),
            ...(identity.state.providers as VendorId[])
          ])
        : new Set<VendorId>(),
    [identity]
  )
  const effectiveConfigured = configuredRoutes ?? identityConfigured

  const keyPlaceholder = React.useMemo(() => {
    if (!keyEntryRoute) return 'Your API key'
    const v = getVendor(keyEntryRoute)
    return v.localOnly ? 'no key needed — press Save to enable' : v.keyPrefix ? `${v.keyPrefix}…` : 'Your API key'
  }, [keyEntryRoute])

  const COLLAPSED_LIMIT = 4
  const isSearching = searchValue.trim().length > 0

  const toggleGroup = (route: VendorId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(route)) next.delete(route)
      else next.add(route)
      return next
    })
  }

  React.useEffect(() => {
    if (!open) {
      setKeyEntryRoute(null)
      setPendingModel(null)
      setKeyInput('')
      setFlagshipOnly(false)
      setFreeOnly(false)
      setSearchValue('')
      setExpandedGroups(new Set())
    }
  }, [open])

  const filteredOptions = React.useMemo(() => {
    return options.filter((o) => {
      if (flagshipOnly && o.tier !== 'frontier') return false
      if (freeOnly && o.cost !== 'free') return false
      return true
    })
  }, [options, flagshipOnly, freeOnly])

  const grouped = React.useMemo(() => {
    const byRoute = new Map<VendorId, ModelEntry[]>()
    for (const opt of filteredOptions) {
      const bucket = byRoute.get(opt.route) ?? []
      bucket.push(opt)
      byRoute.set(opt.route, bucket)
    }
    const TIER_ORDER: Record<ModelEntry['tier'], number> = {
      frontier: 0,
      reasoning: 1,
      balanced: 2,
      fast: 3
    }
    return VENDOR_ORDER.filter((r) => byRoute.has(r)).map((r) => ({
      route: r,
      label: VENDORS[r].label,
      entries: byRoute
        .get(r)!
        .slice()
        .sort((a, b) => {
          const tierDiff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
          if (tierDiff !== 0) return tierDiff
          return a.label.localeCompare(b.label)
        })
    }))
  }, [filteredOptions])

  const selectedEntry = value ? options.find((o) => o.route === value.route && o.modelId === value.modelId) : null

  const handleSelect = (entry: ModelEntry) => {
    if (!effectiveConfigured.has(entry.route) && onProvideKey) {
      setKeyEntryRoute(entry.route)
      setPendingModel(entry)
      setKeyInput('')
      return
    }
    if (!effectiveConfigured.has(entry.route)) return
    onChange({ route: entry.route, modelId: entry.modelId })
    setOpen(false)
  }

  const handleSaveKey = async () => {
    if (!keyEntryRoute || !pendingModel || !onProvideKey) return
    const trimmed = keyInput.trim()
    if (!trimmed) return
    setSaving(true)
    setSaveError(null)
    try {
      await Promise.resolve(onProvideKey(keyEntryRoute, trimmed))
      onChange({ route: pendingModel.route, modelId: pendingModel.modelId })
      setKeyEntryRoute(null)
      setPendingModel(null)
      setKeyInput('')
      setOpen(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save key.')
    } finally {
      setSaving(false)
    }
  }

  const defaultTrigger = (
    <Button
      variant='ghost'
      role='combobox'
      aria-expanded={open}
      className='h-auto gap-1.5 p-0 text-foreground/70 hover:bg-transparent hover:text-foreground'
    >
      {selectedEntry ? (
        <span className='flex items-center gap-1.5'>
          {hasModelIcon(selectedEntry.modelId) ? (
            <ModelIcon model={selectedEntry.modelId} size={14} type='avatar' />
          ) : (
            <ProviderIcon provider={selectedEntry.route} size={14} type='avatar' />
          )}
          <span className='text-sm'>{selectedEntry.label}</span>
        </span>
      ) : (
        <span className='text-sm'>Select model</span>
      )}
      <ChevronsUpDown className='h-3 w-3' />
    </Button>
  )

  const content = (
    <>
      {keyEntryRoute && pendingModel ? (
        <div className='flex flex-col gap-3 p-3'>
          <div className='flex items-center gap-2'>
            {hasModelIcon(pendingModel.modelId) ? (
              <ModelIcon model={pendingModel.modelId} size={16} type='avatar' />
            ) : (
              <ProviderIcon provider={pendingModel.route} size={16} type='avatar' />
            )}
            <p className='font-mono text-[11px] uppercase tracking-widest text-foreground'>
              {VENDORS[keyEntryRoute].label} key required
            </p>
          </div>
          <Input
            type='password'
            autoComplete='off'
            autoFocus
            placeholder={keyPlaceholder}
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value)
              if (saveError) setSaveError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSaveKey()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setKeyEntryRoute(null)
                setPendingModel(null)
                setKeyInput('')
                setSaveError(null)
              }
            }}
            disabled={saving}
            className='font-mono text-xs'
          />
          {saveError && <p className='font-mono text-[11px] text-destructive'>{saveError}</p>}
          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setKeyEntryRoute(null)
                setPendingModel(null)
                setKeyInput('')
                setSaveError(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size='sm' onClick={handleSaveKey} disabled={!keyInput.trim() || saving}>
              {saving ? 'Verifying…' : 'Save & select'}
            </Button>
          </div>
        </div>
      ) : (
        <Command>
          <CommandInput placeholder='Search models…' value={searchValue} onValueChange={setSearchValue} />
          <div className='flex items-center gap-1 border-b border-border px-2 py-1.5'>
            <button
              type='button'
              onClick={() => setFlagshipOnly((v) => !v)}
              aria-pressed={flagshipOnly}
              className={cn(
                'rounded-full px-2 py-0.5 text-base transition-colors',
                flagshipOnly ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Flagship
            </button>
            <button
              type='button'
              onClick={() => setFreeOnly((v) => !v)}
              aria-pressed={freeOnly}
              className={cn(
                'rounded-full px-2 py-0.5 text-base transition-colors',
                freeOnly ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Free
            </button>
          </div>
          <CommandList className='min-h-[280px]'>
            <CommandEmpty className='py-20'>No model found.</CommandEmpty>
            {grouped.map((group, groupIdx) => {
              const isExpanded = expandedGroups.has(group.route) || isSearching
              const visibleEntries = isExpanded ? group.entries : group.entries.slice(0, COLLAPSED_LIMIT)
              const hiddenCount = group.entries.length - visibleEntries.length
              return (
                <React.Fragment key={group.route}>
                  {groupIdx > 0 && <CommandSeparator />}
                  <CommandGroup
                    className='p-0 [&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:gap-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-serif [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-foreground'
                    heading={
                      <>
                        <ProviderIcon provider={group.route} size={14} type='avatar' />
                        <span>{group.label}</span>
                        {effectiveConfigured.has(group.route) && (
                          <Badge
                            variant='outline'
                            className='ml-auto border-success/40 font-normal text-[10px] text-success'
                          >
                            Configured
                          </Badge>
                        )}
                      </>
                    }
                  >
                    {visibleEntries.map((entry) => {
                      const isSelected = value?.route === entry.route && value?.modelId === entry.modelId
                      const locked = !effectiveConfigured.has(entry.route)
                      return (
                        <CommandItem
                          key={entry.id}
                          value={`${entry.label} ${entry.description ?? ''} ${group.label}`}
                          disabled={locked && !onProvideKey}
                          onSelect={() => handleSelect(entry)}
                          className='flex items-center gap-2 pl-6 pr-3'
                        >
                          {hasModelIcon(entry.modelId) ? (
                            <ModelIcon model={entry.modelId} size={16} type='avatar' />
                          ) : (
                            <ProviderIcon provider={entry.route} size={16} type='avatar' />
                          )}
                          <div className='flex flex-1 flex-col gap-0.5 overflow-hidden'>
                            <span
                              className={cn(
                                'font-mono text-[11px] uppercase tracking-widest',
                                isSelected ? 'text-success' : 'text-foreground'
                              )}
                            >
                              {entry.label}
                            </span>
                            {entry.description && (
                              <span className='truncate text-[11px] text-muted-foreground'>{entry.description}</span>
                            )}
                          </div>
                          {locked ? (
                            <Lock className='h-3 w-3 shrink-0 text-muted-foreground' aria-label='API key required' />
                          ) : isSelected ? (
                            <Check className='h-3.5 w-3.5 shrink-0 text-success' />
                          ) : null}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  {!isSearching && (hiddenCount > 0 || (isExpanded && group.entries.length > COLLAPSED_LIMIT)) && (
                    <div className='px-3 pb-1'>
                      <button
                        type='button'
                        onClick={() => toggleGroup(group.route)}
                        className='text-base text-muted-foreground hover:text-foreground'
                      >
                        {isExpanded ? 'Show fewer' : `Show all ${group.entries.length}`}
                      </button>
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </CommandList>
          {settingsHref && (
            <>
              <CommandSeparator />
              <div className='p-2'>
                <a
                  href={settingsHref}
                  className='flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground'
                >
                  <ExternalLink className='h-3 w-3' />
                  {settingsLabel}
                </a>
              </div>
            </>
          )}
        </Command>
      )}
    </>
  )

  if (mode === 'modal') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={(trigger ?? defaultTrigger) as React.ReactElement} />
        <DialogContent showCloseButton={false} className={cn('max-w-lg border-border/60 bg-popover p-0', className)}>
          <DialogTitle className='sr-only'>Select model</DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger ?? defaultTrigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        collisionPadding={8}
        className={cn('w-80 border-border/60 bg-popover p-0', className)}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
