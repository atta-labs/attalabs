'use client'

import type { CMSTheme } from '@atta/cms'
import { Button } from '@atta/ui/components/button'
import { Input } from '@atta/ui/components/input'
import { Pencil, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

interface ThemePreviewPanelProps {
  theme: CMSTheme
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onPublish: (id: string) => void
}

export function ThemePreviewPanel({ theme, onRename, onDelete, onPublish }: ThemePreviewPanelProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(theme.name)

  function handleRenameSubmit() {
    if (nameValue.trim() && nameValue.trim() !== theme.name) {
      onRename(theme._id, nameValue.trim())
    }
    setEditingName(false)
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-border px-4 py-2'>
        {editingName ? (
          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') {
                setEditingName(false)
                setNameValue(theme.name)
              }
            }}
            className='h-7 w-56 text-sm'
            autoFocus
          />
        ) : (
          <span className='font-medium text-sm'>{theme.name}</span>
        )}
        <div className='flex gap-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setEditingName(true)
              setNameValue(theme.name)
            }}
          >
            <Pencil className='size-3.5' />
            Rename
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={() => onDelete(theme._id)}
          >
            <Trash2 className='size-3.5' />
            Delete
          </Button>
        </div>
      </div>

      {/* iframe preview */}
      <div className='flex-1 overflow-hidden'>
        <iframe src='http://localhost:3003' className='h-full w-full border-0' title={`Preview: ${theme.name}`} />
      </div>

      {/* Footer */}
      <div className='border-t border-border px-4 py-2'>
        <Button variant='outline' size='sm' onClick={() => onPublish(theme._id)}>
          <Upload className='size-3.5 mr-1' />
          Publish vars to this theme
        </Button>
      </div>
    </div>
  )
}
