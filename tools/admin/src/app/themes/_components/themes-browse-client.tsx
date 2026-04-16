'use client'

import type { CMSTheme } from '@atta/cms'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createThemeAction, deleteThemeAction, renameThemeAction } from '../actions'
import { ThemePreviewPanel } from './theme-preview-panel'
import { ThemesSidebar } from './themes-sidebar'

interface ThemesBrowseClientProps {
  themes: CMSTheme[]
}

export function ThemesBrowseClient({ themes }: ThemesBrowseClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(themes[0]?._id ?? null)
  const router = useRouter()

  const selectedTheme = themes.find((t) => t._id === selectedId) ?? null

  async function handleNewTheme() {
    const name = window.prompt('Theme name:')
    if (!name?.trim()) return
    try {
      const created = await createThemeAction(name.trim())
      router.refresh()
      setSelectedId(created._id)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRename(id: string, name: string) {
    try {
      await renameThemeAction(id, name)
      router.refresh()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this theme?')) return
    try {
      await deleteThemeAction(id)
      if (selectedId === id) setSelectedId(null)
      router.refresh()
    } catch (err) {
      console.error(err)
    }
  }

  function handlePublish(id: string) {
    window.alert(`Publish vars: open in Sanity Studio to edit colors (id: ${id})`)
  }

  return (
    <div className='flex h-full'>
      {/* Left sidebar ~260px */}
      <div className='w-64 shrink-0'>
        <ThemesSidebar themes={themes} selectedId={selectedId} onSelect={setSelectedId} onNewTheme={handleNewTheme} />
      </div>

      {/* Right panel */}
      <div className='flex-1 overflow-hidden'>
        {selectedTheme ? (
          <ThemePreviewPanel
            theme={selectedTheme}
            onRename={handleRename}
            onDelete={handleDelete}
            onPublish={handlePublish}
          />
        ) : (
          <div className='flex h-full items-center justify-center'>
            <p className='text-muted-foreground text-sm'>Select a theme to preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
