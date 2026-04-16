'use client'

import type { CMSTheme } from '@atta/cms'
import { useState } from 'react'
import { ThemePreviewPanel } from './theme-preview-panel'
import { ThemesSidebar } from './themes-sidebar'

interface ThemesBrowseClientProps {
  themes: CMSTheme[]
}

export function ThemesBrowseClient({ themes }: ThemesBrowseClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(themes[0]?._id ?? null)

  const selectedTheme = themes.find((t) => t._id === selectedId) ?? null

  return (
    <div className='flex h-full'>
      {/* Left sidebar ~260px */}
      <div className='w-64 shrink-0'>
        <ThemesSidebar
          themes={themes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNewTheme={() => {
            /* TODO: wire up in actions task */
          }}
        />
      </div>

      {/* Right panel */}
      <div className='flex-1 overflow-hidden'>
        {selectedTheme ? (
          <ThemePreviewPanel
            theme={selectedTheme}
            onRename={() => {
              /* TODO */
            }}
            onDelete={() => {
              /* TODO */
            }}
            onPublish={() => {
              /* TODO */
            }}
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
