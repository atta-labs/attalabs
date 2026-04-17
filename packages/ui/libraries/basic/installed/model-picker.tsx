'use client'

import type { ModelEntry, RouteProvider } from '@atta/models'
import { PROVIDERS, ROUTE_PROVIDER_ORDER } from '@atta/models'
import { ProviderIcon } from '@lobehub/icons'
import { Check, ChevronsUpDown, ExternalLink, Lock } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/utils'
import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from './command'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './dialog'
import { Input } from './input'
import { ModelIcon } from './model-icon'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export interface ModelPickerValue {
  route: RouteProvider
  modelId: string
}

export interface ModelPickerProps {
  options: ModelEntry[]
  value: ModelPickerValue | null
  onChange: (value: ModelPickerValue) => void
  configuredRoutes: Set<RouteProvider>
  onProvideKey?: (route: RouteProvider, key: string) => void
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
  const [keyEntryRoute, setKeyEntryRoute] = React.useState<RouteProvider | null>(null)
  const [pendingModel, setPendingModel] = React.useState<ModelEntry | null>(null)
  const [keyInput, setKeyInput] = React.useState('')
  const [flagshipOnly, setFlagshipOnly] = React.useState(false)
  const [freeOnly, setFreeOnly] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')
  const [expandedGroups, setExpandedGroups] = React.useState<Set<RouteProvider>>(new Set())

  const COLLAPSED_LIMIT = 4
  const isSearching = searchValue.trim().length > 0

  const toggleGroup = (route: RouteProvider) => {
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
    const byRoute = new Map<RouteProvider, ModelEntry[]>()
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
    return ROUTE_PROVIDER_ORDER.filter((r) => byRoute.has(r)).map((r) => ({
      route: r,
      label: PROVIDERS[r].label,
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
    if (!configuredRoutes.has(entry.route) && onProvideKey) {
      setKeyEntryRoute(entry.route)
      setPendingModel(entry)
      setKeyInput('')
      return
    }
    if (!configuredRoutes.has(entry.route)) return
    onChange({ route: entry.route, modelId: entry.modelId })
    setOpen(false)
  }

  const handleSaveKey = () => {
    if (!keyEntryRoute || !pendingModel || !onProvideKey) return
    const trimmed = keyInput.trim()
    if (!trimmed) return
    onProvideKey(keyEntryRoute, trimmed)
    onChange({ route: pendingModel.route, modelId: pendingModel.modelId })
    setOpen(false)
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
          <ModelIcon model={selectedEntry.modelId} size={14} type='avatar' />
          <span className='font-mono text-[10px] uppercase tracking-widest'>{selectedEntry.label}</span>
        </span>
      ) : (
        <span className='font-mono text-[10px] uppercase tracking-widest'>Select model</span>
      )}
      <ChevronsUpDown className='h-3 w-3' />
    </Button>
  )

  const content = (
    <>
      {keyEntryRoute && pendingModel ? (
        <div className='flex flex-col gap-3 p-3'>
          <div className='flex items-center gap-2'>
            <ModelIcon model={pendingModel.modelId} size={16} type='avatar' />
            <p className='font-mono text-[11px] uppercase tracking-widest text-foreground'>
              {PROVIDERS[keyEntryRoute].label} key required
            </p>
          </div>
          <Input
            type='password'
            autoComplete='off'
            autoFocus
            placeholder={PROVIDERS[keyEntryRoute].keyPlaceholder}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
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
              }
            }}
            className='font-mono text-xs'
          />
          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setKeyEntryRoute(null)
                setPendingModel(null)
                setKeyInput('')
              }}
            >
              Cancel
            </Button>
            <Button size='sm' onClick={handleSaveKey} disabled={!keyInput.trim()}>
              Save & select
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
                'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest transition-colors',
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
                'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest transition-colors',
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
                        {group.label}
                      </>
                    }
                  >
                    {visibleEntries.map((entry) => {
                      const isSelected = value?.route === entry.route && value?.modelId === entry.modelId
                      const locked = !configuredRoutes.has(entry.route)
                      return (
                        <CommandItem
                          key={entry.id}
                          value={`${entry.label} ${entry.description ?? ''} ${group.label}`}
                          disabled={locked && !onProvideKey}
                          onSelect={() => handleSelect(entry)}
                          className='flex items-center gap-2 pl-6 pr-3'
                        >
                          <ModelIcon model={entry.modelId} size={16} type='avatar' />
                          <div className='flex flex-1 flex-col gap-0.5 overflow-hidden'>
                            <span className='font-mono text-[11px] uppercase tracking-widest text-foreground'>
                              {entry.label}
                            </span>
                            {entry.description && (
                              <span className='truncate text-[11px] text-muted-foreground'>{entry.description}</span>
                            )}
                          </div>
                          {locked ? (
                            <Lock className='h-3 w-3 shrink-0 text-muted-foreground' aria-label='API key required' />
                          ) : isSelected ? (
                            <Check className='h-3.5 w-3.5 shrink-0 text-foreground' />
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
                        className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground'
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
