'use client'

import type { ModelEntry, RouteProvider } from '@atta/models'
import { PROVIDERS, ROUTE_PROVIDER_ORDER } from '@atta/models'
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
  className
}: ModelPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [keyEntryRoute, setKeyEntryRoute] = React.useState<RouteProvider | null>(null)
  const [pendingModel, setPendingModel] = React.useState<ModelEntry | null>(null)
  const [keyInput, setKeyInput] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setKeyEntryRoute(null)
      setPendingModel(null)
      setKeyInput('')
    }
  }, [open])

  const grouped = React.useMemo(() => {
    const byRoute = new Map<RouteProvider, ModelEntry[]>()
    for (const opt of options) {
      const bucket = byRoute.get(opt.route) ?? []
      bucket.push(opt)
      byRoute.set(opt.route, bucket)
    }
    return ROUTE_PROVIDER_ORDER.filter((r) => byRoute.has(r)).map((r) => ({
      route: r,
      label: PROVIDERS[r].label,
      entries: byRoute.get(r)!
    }))
  }, [options])

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger ?? defaultTrigger}</PopoverTrigger>
      <PopoverContent align={align} side={side} className={cn('w-80 border-border/60 bg-popover p-0', className)}>
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
            <CommandInput placeholder='Search models…' />
            <CommandList>
              <CommandEmpty>No model found.</CommandEmpty>
              {grouped.map((group) => (
                <CommandGroup key={group.route} heading={group.label}>
                  {group.entries.map((entry) => {
                    const isSelected = value?.route === entry.route && value?.modelId === entry.modelId
                    const locked = !configuredRoutes.has(entry.route)
                    return (
                      <CommandItem
                        key={entry.id}
                        value={`${entry.label} ${entry.description ?? ''} ${group.label}`}
                        disabled={locked && !onProvideKey}
                        onSelect={() => handleSelect(entry)}
                        className='flex items-center gap-2'
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
              ))}
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
      </PopoverContent>
    </Popover>
  )
}
