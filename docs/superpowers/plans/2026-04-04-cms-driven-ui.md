# CMS-Driven UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Herald's entire UI (theme, color scheme, library) driven by Sanity CMS for the platform and per-user DB settings for Envoy pages, with dynamic runtime library switching via `useLibraryLoader`.

**Architecture:** Sanity CMS gets a "User Interface" group with Themes (existing `uiTheme`) and Libraries (new). A `heraldConfig` singleton controls portal look. Users' DB records control their Envoy pages. `useLibraryLoader` dynamically imports component libraries at runtime. All components render via a `LibraryProvider` context. The admin ThemeBrowser sends `PREVIEW_LIBRARY` postMessages to the preview iframe for real-time library switching.

**Tech Stack:** Sanity CMS (schemas, Structure Builder, GROQ), Neon Postgres + Drizzle ORM, Next.js 16 SSR, React Context, dynamic `import()`, postMessage API.

**Spec:** `docs/superpowers/specs/2026-04-04-cms-driven-ui-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `packages/cms/schemas/library.ts` | Sanity `library` document schema (id, name, description, style, order) |
| `packages/cms/schemas/herald-config.ts` | Sanity `heraldConfig` singleton schema (userInterface: theme + colorScheme + library) |
| `packages/cms/src/queries/library.ts` | GROQ queries for libraries |
| `packages/cms/src/queries/herald-config.ts` | GROQ query for heraldConfig with dereferenced theme + library |
| `apps/herald/src/hooks/useLibraryLoader.ts` | Dynamic library import hook (copy of Summon's pattern) |
| `apps/herald/src/components/providers/LibraryProvider.tsx` | React context providing loaded library components |
| `apps/herald/src/app/api/admin/publish/route.ts` | Unified publish endpoint (themeId + colorScheme + library) |

### Modified Files

| File | Change |
|------|--------|
| `packages/cms/schemas/index.ts` | Register library + heraldConfig schemas |
| `packages/cms/sanity.config.ts` | Add Structure Builder for "User Interface" group |
| `packages/cms/src/index.ts` | Export new queries and types |
| `packages/cms/src/types.ts` | Add `CMSLibrary` and `HeraldConfig` types |
| `apps/herald/src/app/layout.tsx` | Fetch heraldConfig from CMS, inject theme CSS, wrap with LibraryProvider |
| `apps/herald/src/app/[username]/page.tsx` | Wrap Envoy with LibraryProvider using user.library |
| `apps/herald/src/db/queries.ts` | Add `updateUserUI`, remove `updateUserTheme` + `updateUserLibrary` |
| `apps/herald/src/components/theme/PreviewThemeListener.tsx` | Handle `PREVIEW_LIBRARY` message |
| `apps/herald/src/components/portal/ThemeBrowser.tsx` | Send PREVIEW_LIBRARY, move Publish button, unified save |
| `apps/herald/src/components/envoy/JDInput.tsx` | Use library components via `useComponents()` |
| `apps/herald/src/components/envoy/ReportView.tsx` | Use library components via `useComponents()` |
| `apps/herald/src/components/envoy/LoadingState.tsx` | Use library components via `useComponents()` |
| `apps/herald/src/components/envoy/EnvoyFlow.tsx` | Wrap children with LibraryProvider |
| `apps/herald/src/components/envoy/EnvoyFooter.tsx` | Use library components via `useComponents()` |

### Deleted Files

| File | Reason |
|------|--------|
| `apps/herald/src/app/api/admin/theme/route.ts` | Replaced by `/api/admin/publish` |
| `apps/herald/src/app/api/admin/library/route.ts` | Replaced by `/api/admin/publish` |
| `apps/herald/src/components/portal/LibraryPicker.tsx` | Libraries now inline in ThemeBrowser |

---

## Task 1: Sanity `library` Document Schema

**Files:**
- Create: `packages/cms/schemas/library.ts`
- Modify: `packages/cms/schemas/index.ts`

- [ ] **Step 1: Create the library schema**

```typescript
// packages/cms/schemas/library.ts
import { defineField, defineType } from 'sanity'

export const library = defineType({
  name: 'library',
  title: 'Component Library',
  type: 'document',
  fields: [
    defineField({
      name: 'id',
      title: 'ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Unique identifier: basic, retro, animate, brutal'
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Display name (e.g., "Standard", "Retro")'
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Short style description'
    }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      description: 'Style category (e.g., "Modern / Minimal")'
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Display ordering'
    })
  ],
  preview: {
    select: { title: 'name', subtitle: 'id' }
  }
})
```

- [ ] **Step 2: Register in schema index**

Replace the contents of `packages/cms/schemas/index.ts`:

```typescript
import { library } from './library'
import { uiTheme } from './ui-theme'

export const schemaTypes = [uiTheme, library]
```

- [ ] **Step 3: Verify Sanity studio loads**

Run: `cd packages/cms && bun run studio`

Expected: Studio opens at localhost:3333 with no errors. "Component Library" document type visible.

- [ ] **Step 4: Commit**

```bash
git add packages/cms/schemas/library.ts packages/cms/schemas/index.ts
git commit -m "Feat: Add library document schema to Sanity CMS"
```

---

## Task 2: Sanity `heraldConfig` Singleton Schema

**Files:**
- Create: `packages/cms/schemas/herald-config.ts`
- Modify: `packages/cms/schemas/index.ts`

- [ ] **Step 1: Create the heraldConfig schema**

```typescript
// packages/cms/schemas/herald-config.ts
import { defineField, defineType } from 'sanity'

export const heraldConfig = defineType({
  name: 'heraldConfig',
  title: 'Herald Config',
  type: 'document',
  fields: [
    defineField({
      name: 'userInterface',
      title: 'User Interface',
      type: 'object',
      fields: [
        defineField({
          name: 'theme',
          title: 'Theme',
          type: 'reference',
          to: [{ type: 'uiTheme' }],
          description: 'Active theme for the Herald portal'
        }),
        defineField({
          name: 'colorScheme',
          title: 'Color Scheme',
          type: 'string',
          options: {
            list: [
              { title: 'Dark', value: 'dark' },
              { title: 'Light', value: 'light' }
            ]
          },
          initialValue: 'dark'
        }),
        defineField({
          name: 'library',
          title: 'Library',
          type: 'reference',
          to: [{ type: 'library' }],
          description: 'Active component library for the Herald portal'
        })
      ]
    })
  ],
  preview: {
    prepare: () => ({ title: 'Herald Config' })
  }
})
```

- [ ] **Step 2: Register in schema index**

```typescript
// packages/cms/schemas/index.ts
import { heraldConfig } from './herald-config'
import { library } from './library'
import { uiTheme } from './ui-theme'

export const schemaTypes = [uiTheme, library, heraldConfig]
```

- [ ] **Step 3: Commit**

```bash
git add packages/cms/schemas/herald-config.ts packages/cms/schemas/index.ts
git commit -m "Feat: Add heraldConfig singleton schema to Sanity CMS"
```

---

## Task 3: Sanity Structure Builder — "User Interface" Group

**Files:**
- Modify: `packages/cms/sanity.config.ts`

- [ ] **Step 1: Add Structure Builder with User Interface group**

Replace `packages/cms/sanity.config.ts`:

```typescript
import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'herald',
  title: 'Herald CMS',
  projectId: 'e9gbd2d1',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Herald Content')
          .items([
            S.listItem()
              .title('Herald Config')
              .child(S.document().schemaType('heraldConfig').documentId('heraldConfig').title('Herald Config')),
            S.listItem()
              .title('User Interface')
              .child(
                S.list()
                  .title('Herald User Interface')
                  .items([
                    S.listItem()
                      .title('Themes')
                      .child(S.documentTypeList('uiTheme').title('Herald Themes')),
                    S.listItem()
                      .title('Libraries')
                      .child(S.documentTypeList('library').title('Herald Libraries'))
                  ])
              )
          ])
    }),
    visionTool()
  ],
  schema: { types: schemaTypes }
})
```

- [ ] **Step 2: Verify Structure Builder in studio**

Run: `cd packages/cms && bun run studio`

Expected: Left sidebar shows "Herald Content" with "Herald Config" (singleton) and "User Interface" (expandable to Themes + Libraries). Matches the Summon screenshot structure.

- [ ] **Step 3: Commit**

```bash
git add packages/cms/sanity.config.ts
git commit -m "Feat: Add Structure Builder with User Interface group in Sanity Studio"
```

---

## Task 4: CMS Types and Queries

**Files:**
- Modify: `packages/cms/src/types.ts`
- Create: `packages/cms/src/queries/library.ts`
- Create: `packages/cms/src/queries/herald-config.ts`
- Modify: `packages/cms/src/index.ts`

- [ ] **Step 1: Add CMSLibrary and HeraldConfig types**

Add to the end of `packages/cms/src/types.ts`:

```typescript
export interface CMSLibrary {
  _id: string
  id: string
  name: string
  description?: string
  style?: string
  order?: number
}

export interface HeraldConfig {
  _id: string
  userInterface: {
    theme: CMSTheme | null
    colorScheme: ColorScheme
    library: CMSLibrary | null
  }
}
```

- [ ] **Step 2: Create library queries**

```typescript
// packages/cms/src/queries/library.ts
import type { SanityClient } from '@sanity/client'
import type { CMSLibrary } from '../types'

const LIBRARY_PROJECTION = `{
  _id,
  id,
  name,
  description,
  style,
  order
}`

/** Fetch all published libraries, ordered by order field */
export async function getLibraries(client: SanityClient): Promise<CMSLibrary[]> {
  return client.fetch(
    `*[_type == "library" && !(_id in path("drafts.**"))] ${LIBRARY_PROJECTION} | order(order asc)`
  )
}

/** Fetch a single library by its id field */
export async function getLibraryById(client: SanityClient, id: string): Promise<CMSLibrary | null> {
  return client.fetch(`*[_type == "library" && id == $id][0] ${LIBRARY_PROJECTION}`, { id })
}
```

- [ ] **Step 3: Create heraldConfig query**

```typescript
// packages/cms/src/queries/herald-config.ts
import type { SanityClient } from '@sanity/client'
import type { HeraldConfig } from '../types'

const THEME_PROJECTION = `{
  _id,
  name,
  light,
  dark,
  typography,
  spacing,
  shadows
}`

const LIBRARY_PROJECTION = `{
  _id,
  id,
  name,
  description,
  style,
  order
}`

/** Fetch the heraldConfig singleton with dereferenced theme and library */
export async function getHeraldConfig(client: SanityClient): Promise<HeraldConfig | null> {
  return client.fetch(
    `*[_type == "heraldConfig" && _id == "heraldConfig"][0] {
      _id,
      userInterface {
        "theme": theme-> ${THEME_PROJECTION},
        colorScheme,
        "library": library-> ${LIBRARY_PROJECTION}
      }
    }`
  )
}
```

- [ ] **Step 4: Export from package index**

Replace `packages/cms/src/index.ts`:

```typescript
// @herald/cms — Sanity CMS client, types, queries, and theme utilities

// Client
export { cmsClient, cmsConfig, cmsWriteClient, createCmsClient } from './client'
// Queries
export { getHeraldConfig } from './queries/herald-config'
export { getLibraries, getLibraryById } from './queries/library'
export { getThemeById, getThemeByName, getThemeList, getThemes } from './queries/theme'
// Types
export type { CMSLibrary, CMSTheme, ColorScheme, HeraldConfig, ThemeSpacing, ThemeTypography } from './types'
export { FIELD_TO_CSS_VAR, SHADOW_TO_CSS_VAR } from './types'

// Utils
export { generateThemeCSS, generateThemeCSSForScheme } from './utils/theme'
```

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`

Expected: All packages pass.

- [ ] **Step 6: Commit**

```bash
git add packages/cms/src/types.ts packages/cms/src/queries/library.ts packages/cms/src/queries/herald-config.ts packages/cms/src/index.ts
git commit -m "Feat: Add library and heraldConfig queries and types to CMS package"
```

---

## Task 5: Unified Publish Endpoint + DB Query

**Files:**
- Modify: `apps/herald/src/db/queries.ts`
- Create: `apps/herald/src/app/api/admin/publish/route.ts`
- Delete: `apps/herald/src/app/api/admin/theme/route.ts`
- Delete: `apps/herald/src/app/api/admin/library/route.ts`

- [ ] **Step 1: Add updateUserUI query, remove old ones**

In `apps/herald/src/db/queries.ts`, replace `updateUserTheme` and `updateUserLibrary` (lines 67-74) with:

```typescript
export async function updateUserUI(
  clerkId: string,
  ui: { themeId: string; colorScheme: string; library: string }
) {
  await db
    .update(schema.users)
    .set({
      themeId: ui.themeId,
      colorScheme: ui.colorScheme,
      library: ui.library,
      updatedAt: new Date()
    })
    .where(eq(schema.users.clerkId, clerkId))
}
```

- [ ] **Step 2: Create unified publish route**

```typescript
// apps/herald/src/app/api/admin/publish/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { updateUserUI } from '@/db/queries'

const VALID_LIBRARIES = ['basic', 'retro', 'animate', 'brutal']
const VALID_SCHEMES = ['dark', 'light']

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { themeId?: string; colorScheme?: string; library?: string }

  if (!body.themeId || typeof body.themeId !== 'string') {
    return NextResponse.json({ error: 'themeId required' }, { status: 400 })
  }
  if (!body.colorScheme || !VALID_SCHEMES.includes(body.colorScheme)) {
    return NextResponse.json({ error: 'Invalid colorScheme' }, { status: 400 })
  }
  if (!body.library || !VALID_LIBRARIES.includes(body.library)) {
    return NextResponse.json({ error: 'Invalid library' }, { status: 400 })
  }

  await updateUserUI(userId, {
    themeId: body.themeId,
    colorScheme: body.colorScheme,
    library: body.library
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Delete old API routes**

```bash
rm apps/herald/src/app/api/admin/theme/route.ts
rm apps/herald/src/app/api/admin/library/route.ts
rmdir apps/herald/src/app/api/admin/theme
rmdir apps/herald/src/app/api/admin/library
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`

Expected: Pass. (ThemeBrowser still references old endpoints — will be fixed in Task 8.)

- [ ] **Step 5: Commit**

```bash
git add apps/herald/src/db/queries.ts apps/herald/src/app/api/admin/publish/route.ts
git add -A apps/herald/src/app/api/admin/theme apps/herald/src/app/api/admin/library
git commit -m "Feat: Unified publish endpoint, remove separate theme/library routes"
```

---

## Task 6: `useLibraryLoader` Hook

**Files:**
- Create: `apps/herald/src/hooks/useLibraryLoader.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/herald/src/hooks/useLibraryLoader.ts
'use client'

import type { ComponentType } from 'react'
import { useCallback, useRef, useState } from 'react'

export type UILibrary = 'basic' | 'animate' | 'retro' | 'brutal'

export type ComponentMap = Record<string, ComponentType<any>>

const LIBRARY_IMPORTERS: Record<UILibrary, () => Promise<Record<string, unknown>>> = {
  basic: () => import('@herald/ui/basic/components'),
  animate: () => import('@herald/ui/animate/components'),
  retro: () => import('@herald/ui/retro/components'),
  brutal: () => import('@herald/ui/brutal/components')
}

/**
 * Dynamic import of UI component libraries.
 * Guards against race conditions — a slower import won't overwrite a later one.
 *
 * Copied from Summon's useLibraryLoader pattern.
 */
export function useLibraryLoader() {
  const [components, setComponents] = useState<ComponentMap>({})
  const loadedLibraryRef = useRef<UILibrary | null>(null)

  const loadLibrary = useCallback((library: UILibrary) => {
    if (loadedLibraryRef.current === library) return
    loadedLibraryRef.current = library
    LIBRARY_IMPORTERS[library]()
      .then((mod) => {
        if (loadedLibraryRef.current !== library) return
        setComponents(mod as unknown as ComponentMap)
      })
      .catch((err) => {
        console.error(`[useLibraryLoader] Failed to load "${library}" library:`, err)
      })
  }, [])

  return { components, loadLibrary }
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add apps/herald/src/hooks/useLibraryLoader.ts
git commit -m "Feat: Add useLibraryLoader hook for dynamic library imports"
```

---

## Task 7: `LibraryProvider` Context

**Files:**
- Create: `apps/herald/src/components/providers/LibraryProvider.tsx`

- [ ] **Step 1: Create the provider**

```typescript
// apps/herald/src/components/providers/LibraryProvider.tsx
'use client'

import { createContext, useContext, useEffect } from 'react'
import { type ComponentMap, type UILibrary, useLibraryLoader } from '@/hooks/useLibraryLoader'

const LibraryContext = createContext<ComponentMap>({})

export function LibraryProvider({
  library,
  children
}: {
  library: UILibrary
  children: React.ReactNode
}) {
  const { components, loadLibrary } = useLibraryLoader()

  useEffect(() => {
    loadLibrary(library)
  }, [library, loadLibrary])

  return <LibraryContext.Provider value={components}>{children}</LibraryContext.Provider>
}

/**
 * Access the currently loaded library components.
 * Returns a ComponentMap with Button, Card, Input, etc.
 */
export function useComponents() {
  return useContext(LibraryContext)
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add apps/herald/src/components/providers/LibraryProvider.tsx
git commit -m "Feat: Add LibraryProvider context for dynamic component access"
```

---

## Task 8: SSR — Root Layout Loads heraldConfig from CMS

**Files:**
- Modify: `apps/herald/src/app/layout.tsx`

- [ ] **Step 1: Update root layout to fetch heraldConfig and wrap with LibraryProvider**

Replace `apps/herald/src/app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import type { ColorScheme } from '@herald/cms'
import { cmsClient, generateThemeCSSForScheme, getHeraldConfig } from '@herald/cms'
import type { Metadata } from 'next'
import { DM_Mono, DM_Sans, Geist, Playfair_Display } from 'next/font/google'

import { LibraryProvider } from '@/components/providers/LibraryProvider'
import type { UILibrary } from '@/hooks/useLibraryLoader'
import { DEFAULT_THEME_CSS } from '@/lib/default-theme'
import { getGoogleFontsUrl } from '@/lib/font-loader'
import { cn } from '@/lib/utils'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap'
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap'
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Herald — Forensic Match Audit',
  description: 'Evidence-based match reports for recruiters and hiring managers.'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch Herald platform UI config from CMS
  const config = await getHeraldConfig(cmsClient).catch(() => null)
  const theme = config?.userInterface?.theme ?? null
  const colorScheme: ColorScheme = config?.userInterface?.colorScheme ?? 'dark'
  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  // Generate theme CSS from CMS config, fall back to default
  let themeCSS = DEFAULT_THEME_CSS
  let fontsUrl: string | null = null
  if (theme) {
    themeCSS = generateThemeCSSForScheme(theme, colorScheme)
    if (theme.typography) {
      fontsUrl = getGoogleFontsUrl(theme.typography)
    }
  }

  return (
    <html lang='en' className={cn(playfair.variable, dmMono.variable, dmSans.variable, 'font-sans', geist.variable)}>
      <head>
        {fontsUrl && (
          <>
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
            <link rel='stylesheet' href={fontsUrl} />
          </>
        )}
        <style id='herald-theme' dangerouslySetInnerHTML={{ __html: themeCSS }} />
      </head>
      <body className='min-h-screen bg-background text-foreground'>
        <ClerkProvider>
          <LibraryProvider library={libraryId}>{children}</LibraryProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

Expected: Pass.

- [ ] **Step 3: Verify dev server starts**

Run: `bun run dev`

Expected: App loads at localhost:3000. Falls back to DEFAULT_THEME_CSS if heraldConfig not yet created in Sanity.

- [ ] **Step 4: Commit**

```bash
git add apps/herald/src/app/layout.tsx
git commit -m "Feat: Root layout fetches heraldConfig from CMS, wraps with LibraryProvider"
```

---

## Task 9: Envoy Page — LibraryProvider with User's Library

**Files:**
- Modify: `apps/herald/src/app/[username]/page.tsx`

- [ ] **Step 1: Wrap Envoy page with LibraryProvider using user's library choice**

Replace `apps/herald/src/app/[username]/page.tsx`:

```typescript
import type { ColorScheme } from '@herald/cms'
import { cmsClient, generateThemeCSSForScheme, getThemeById } from '@herald/cms'
import { notFound } from 'next/navigation'
import { EnvoyFlow } from '@/components/envoy/EnvoyFlow'
import { EnvoyFooter } from '@/components/envoy/EnvoyFooter'
import { LibraryProvider } from '@/components/providers/LibraryProvider'
import { PreviewThemeListener } from '@/components/theme/PreviewThemeListener'
import type { UILibrary } from '@/hooks/useLibraryLoader'
import { getUserByUsername } from '@/db/queries'
import { getGoogleFontsUrl } from '@/lib/font-loader'

export default async function EnvoyPage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { username } = await params
  const { preview } = await searchParams
  const isPreview = preview === 'true'

  const user = await getUserByUsername(username)
  if (!user) notFound()

  const profile = {
    name: user.name,
    title: user.title,
    github: user.githubHandle ?? undefined,
    summary: user.summary,
    stack: JSON.parse(user.stack) as string[],
    projects: JSON.parse(user.projects) as Array<{ title: string; description: string }>,
    experience: JSON.parse(user.experience) as Array<{
      company: string
      role: string
      period: string
      highlights: string[]
    }>,
    location: user.location ?? undefined,
    availability: user.availability ?? undefined
  }

  // Fetch theme from Sanity if user has one selected
  let themeCSS: string | null = null
  let fontsUrl: string | null = null
  if (user.themeId) {
    const theme = await getThemeById(cmsClient, user.themeId)
    if (theme) {
      const colorScheme = (user.colorScheme as ColorScheme) ?? 'dark'
      themeCSS = generateThemeCSSForScheme(theme, colorScheme)
      if (theme.typography) {
        fontsUrl = getGoogleFontsUrl(theme.typography)
      }
    }
  }

  const userLibrary = (user.library ?? 'basic') as UILibrary

  return (
    <>
      {fontsUrl && (
        <>
          <link rel='preconnect' href='https://fonts.googleapis.com' />
          <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
          <link rel='stylesheet' href={fontsUrl} />
        </>
      )}
      {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      <PreviewThemeListener />
      <LibraryProvider library={userLibrary}>
        <div className='flex min-h-screen flex-col'>
          <div className='flex-1'>
            <EnvoyFlow profile={profile} />
          </div>
          {!isPreview && <EnvoyFooter />}
        </div>
      </LibraryProvider>
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add apps/herald/src/app/\\[username\\]/page.tsx
git commit -m "Feat: Envoy page wraps with LibraryProvider using user's library choice"
```

---

## Task 10: PreviewThemeListener — Handle PREVIEW_LIBRARY

**Files:**
- Modify: `apps/herald/src/components/theme/PreviewThemeListener.tsx`

- [ ] **Step 1: Add PREVIEW_LIBRARY message handling**

In `apps/herald/src/components/theme/PreviewThemeListener.tsx`, update the type definitions and handler:

Add `PreviewLibraryMessage` to the types (after line 17):

```typescript
interface PreviewLibraryMessage {
  type: 'PREVIEW_LIBRARY'
  library: string
}
```

Update the union type:

```typescript
type PreviewMessage = PreviewThemeMessage | PreviewColorSchemeMessage | PreviewLibraryMessage
```

Update `isPreviewMessage` to include the new type:

```typescript
function isPreviewMessage(data: unknown): data is PreviewMessage {
  if (!data || typeof data !== 'object') return false
  const msg = data as { type?: string }
  return msg.type === 'PREVIEW_THEME' || msg.type === 'PREVIEW_COLOR_SCHEME' || msg.type === 'PREVIEW_LIBRARY'
}
```

Add a `loadLibrary` prop to the component and handle the new message in `handleMessage`:

```typescript
export function PreviewThemeListener({ onLibraryChange }: { onLibraryChange?: (library: string) => void } = {}) {
```

Inside `handleMessage`, add after the `PREVIEW_COLOR_SCHEME` handler:

```typescript
      } else if (data.type === 'PREVIEW_LIBRARY') {
        onLibraryChange?.(data.library)
      }
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add apps/herald/src/components/theme/PreviewThemeListener.tsx
git commit -m "Feat: PreviewThemeListener handles PREVIEW_LIBRARY messages"
```

---

## Task 11: ThemeBrowser — PREVIEW_LIBRARY + Unified Publish

**Files:**
- Modify: `apps/herald/src/components/portal/ThemeBrowser.tsx`

- [ ] **Step 1: Update ThemeBrowser**

The ThemeBrowser needs three changes:
1. Send `PREVIEW_LIBRARY` postMessage when library is clicked
2. Move Publish button to the preview panel header
3. Unified publish to `/api/admin/publish`

In `handleLibrarySelect`, after `setSelectedLibrary(libraryId)` and `setLibSaved(false)`, add:

```typescript
    // Send preview message to iframe
    if (isReady) {
      sendMessage({ type: 'PREVIEW_LIBRARY', library: libraryId })
    }
```

Remove the `startLibTransition` fetch call from `handleLibrarySelect` — saving now happens only via Publish.

Update `handlePublish` to use the unified endpoint:

```typescript
  function handlePublish() {
    if (!selectedId) return
    startTransition(async () => {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: selectedId,
          colorScheme: selectedScheme,
          library: selectedLibrary
        })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }
```

Update `hasChanges` to include library:

```typescript
  const hasChanges =
    selectedId !== currentThemeId ||
    selectedScheme !== currentColorScheme ||
    selectedLibrary !== currentLibrary
```

Move the Publish button from the theme sidebar header to the preview panel header (the `<div>` with the green/yellow connection dot). Remove `isLibPending`, `libSaved`, and `startLibTransition` state since library saving is now unified.

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`

Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add apps/herald/src/components/portal/ThemeBrowser.tsx
git commit -m "Feat: ThemeBrowser sends PREVIEW_LIBRARY, unified publish endpoint"
```

---

## Task 12: Refactor Envoy Components to Use Library Components

**Files:**
- Modify: `apps/herald/src/components/envoy/JDInput.tsx`
- Modify: `apps/herald/src/components/envoy/ReportView.tsx`
- Modify: `apps/herald/src/components/envoy/LoadingState.tsx`
- Modify: `apps/herald/src/components/envoy/EnvoyFlow.tsx`
- Modify: `apps/herald/src/components/envoy/EnvoyFooter.tsx`

This task requires reading each component's current implementation and replacing raw HTML elements with library components accessed via `useComponents()`. The pattern:

```typescript
import { useComponents } from '@/components/providers/LibraryProvider'

function MyComponent() {
  const { Card, Button, Text } = useComponents()
  // Use Card, Button, Text instead of raw <div>, <button>, <span>
}
```

- [ ] **Step 1: Read each Envoy component to understand current structure**

Read all 5 files to identify which HTML elements map to which library components.

- [ ] **Step 2: Refactor JDInput.tsx**

Add `'use client'` if not present. Import `useComponents`. Replace the main container with `Card`, the textarea with the library `Textarea`, the submit button with `Button`, and text elements with `Text`/`Heading` as appropriate. Preserve all existing logic (validation, Cmd+Enter, etc.).

- [ ] **Step 3: Refactor ReportView.tsx**

This is the largest component. Replace: section containers with `Card`, grade display with `Badge` + `Heading`, signal titles with `Text`, the divider with `Separator`. Preserve all conditional rendering and print styles.

- [ ] **Step 4: Refactor LoadingState.tsx**

Replace the container with `Card` and step labels with `Text`.

- [ ] **Step 5: Refactor EnvoyFlow.tsx**

This is the orchestrator. It may only need `'use client'` and to pass through. If it renders wrapper elements, replace with library components.

- [ ] **Step 6: Refactor EnvoyFooter.tsx**

Replace link elements with `Button` variant="link" and text with `Text`.

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`

Expected: Pass.

- [ ] **Step 8: Test in browser**

Navigate to a user's Envoy page. Verify components render correctly with the basic library (default).

- [ ] **Step 9: Commit**

```bash
git add apps/herald/src/components/envoy/
git commit -m "Refactor: Envoy components use library components via useComponents()"
```

---

## Task 13: Delete LibraryPicker.tsx

**Files:**
- Delete: `apps/herald/src/components/portal/LibraryPicker.tsx`

- [ ] **Step 1: Verify no imports reference LibraryPicker**

Run: `grep -r "LibraryPicker" apps/herald/src/`

Expected: No results (it was only used by the deleted `/admin/libraries/page.tsx`).

- [ ] **Step 2: Delete the file**

```bash
rm apps/herald/src/components/portal/LibraryPicker.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A apps/herald/src/components/portal/LibraryPicker.tsx
git commit -m "Chore: Remove standalone LibraryPicker, libraries now inline in ThemeBrowser"
```

---

## Task 14: Seed Library Documents in Sanity

**Files:** None (CMS data, not code)

- [ ] **Step 1: Start Sanity Studio**

Run: `cd packages/cms && bun run studio`

- [ ] **Step 2: Create 4 library documents**

In the Studio, navigate to User Interface → Libraries and create:

| id | name | description | style | order |
|----|------|-------------|-------|-------|
| basic | Standard | Clean, minimal. Soft shadows, rounded corners. | Modern / Minimal | 1 |
| retro | Retro | Bold borders, heavy shadows. 80s/cyberpunk aesthetic. | Neobrutalist / Retro | 2 |
| animate | Animated | Motion-enhanced interactions. Scale on hover, spring on tap. | Motion-Enhanced | 3 |
| brutal | Brutal | Neobrutalism. Hard offset shadows, thick borders. | Neobrutalist / Stark | 4 |

- [ ] **Step 3: Create heraldConfig singleton**

Navigate to Herald Config, set:
- User Interface → Theme: select the current active theme
- User Interface → Color Scheme: "dark"
- User Interface → Library: select "Standard" (basic)

Publish the document.

- [ ] **Step 4: Verify queries work**

In the Sanity Vision tool, run:

```groq
*[_type == "heraldConfig" && _id == "heraldConfig"][0] {
  _id,
  userInterface {
    "theme": theme-> { _id, name },
    colorScheme,
    "library": library-> { _id, id, name }
  }
}
```

Expected: Returns the config with dereferenced theme and library.

---

## Task 15: End-to-End Verification

- [ ] **Step 1: Verify Portal loads theme from CMS**

Start dev server: `bun run dev`

Navigate to `localhost:3000`. Inspect the `<style id="herald-theme">` tag — it should contain CSS variables from the CMS theme (not the hardcoded default, assuming heraldConfig exists in Sanity).

- [ ] **Step 2: Verify Envoy page uses user's library**

Navigate to `localhost:3000/[username]`. Components should render using the user's selected library from DB.

- [ ] **Step 3: Verify admin preview — theme switching**

Navigate to `localhost:3000/admin/ui`. Click different themes. The preview iframe should update in real-time.

- [ ] **Step 4: Verify admin preview — library switching**

Click different libraries in the 2x2 grid. The preview iframe should swap components dynamically (e.g., brutal shows thick borders, retro shows heavy shadows).

- [ ] **Step 5: Verify unified publish**

Click Publish. Check the DB — user's `theme_id`, `color_scheme`, and `library` should all be updated.

- [ ] **Step 6: Full typecheck + lint**

Run: `bun run check`

Expected: Pass.
