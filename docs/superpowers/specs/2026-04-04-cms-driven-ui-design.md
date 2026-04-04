# CMS-Driven UI Architecture

Herald's UI (theme, color scheme, library) is fully driven by Sanity CMS for the platform and by per-user DB settings for Envoy pages. Components are loaded dynamically at runtime via `useLibraryLoader` — no build-time library switching.

---

## 1. Sanity CMS Schema

### 1.1 "User Interface" Studio Group

A Structure Builder group in the Sanity Studio sidebar (not a document type). Contains:

- **Themes** — list of `theme` documents
- **Libraries** — list of `library` documents

Mirrors Summon's "User Interface" group exactly (see Summon CMS screenshot for reference), replacing "Kits" with "Libraries".

### 1.2 `theme` Document Type

Existing `uiTheme` schema. Internal `_type` stays `uiTheme` (avoids migration of existing documents). Displayed as "Themes" in the Studio structure. No structural changes.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Theme name (e.g., "Minimal Dark") |
| light | object | 42 color fields (background, foreground, card, primary, etc.) |
| dark | object | 42 color fields (same as light) |
| typography | object | fontSans, fontSerif, fontMono, trackingNormal |
| spacing | object | radius, spacing |
| shadows | object | shadow2xs through shadow2xl |

Tabs: All Fields, Light Mode, Dark Mode, Typography, Spacing & Radius, Shadows, Info.

### 1.3 `library` Document Type (New)

Mirrors Summon's `componentLibrary` schema.

| Field | Type | Description |
|-------|------|-------------|
| id | string, required | `"basic"` \| `"retro"` \| `"animate"` \| `"brutal"` |
| name | string, required | Display name (e.g., "Standard", "Retro") |
| description | text | Style description |
| style | string | Style category (e.g., "Modern / Minimal") |
| order | number | Display ordering |

Four documents created: basic, retro, animate, brutal.

### 1.4 `heraldConfig` Singleton Document (New)

Controls the Portal + Admin look. Updated in CMS, takes effect on next SSR request.

| Field | Type | Description |
|-------|------|-------------|
| userInterface.theme | reference → theme | Active theme for the platform |
| userInterface.colorScheme | string | `"dark"` \| `"light"` |
| userInterface.library | reference → library | Active component library |

Document ID: `heraldConfig` (singleton pattern).

### 1.5 CMS Queries (New)

| Function | Purpose |
|----------|---------|
| `getHeraldConfig(client)` | Fetch heraldConfig singleton with dereferenced theme + library |
| `getLibraries(client)` | Fetch all library documents, ordered by `order` |
| `getLibraryById(client, id)` | Fetch single library by id field |

Existing theme queries (`getThemes`, `getThemeById`, etc.) remain unchanged.

### 1.6 CMS Exports

Add to `@herald/cms` package exports:
- `getHeraldConfig`, `getLibraries`, `getLibraryById`
- Types: `CMSLibrary`, `HeraldConfig`

---

## 2. Database (Neon Postgres)

### 2.1 Users Table — No Schema Changes

The existing columns already cover what's needed:

| Column | Type | Purpose |
|--------|------|---------|
| `theme_id` | varchar | Sanity theme document `_id` |
| `color_scheme` | varchar | `"dark"` \| `"light"` |
| `library` | varchar | `"basic"` \| `"retro"` \| `"animate"` \| `"brutal"` |

These fields store each user's Envoy page UI preferences, set via the ThemeBrowser in admin.

### 2.2 Unified Publish Endpoint

Replace separate `/api/admin/theme` and `/api/admin/library` with a single endpoint:

```
POST /api/admin/publish
Body: { themeId: string, colorScheme: string, library: string }
```

Updates all three user interface fields in one transaction. The old endpoints are removed.

### 2.3 DB Query Changes

| Function | Change |
|----------|--------|
| `updateUserUI(clerkId, { themeId, colorScheme, library })` | New — replaces `updateUserTheme` + `updateUserLibrary` |

---

## 3. SSR Loading

### 3.1 Portal + Admin (from CMS)

**Root layout** (`apps/herald/src/app/layout.tsx`):

1. Fetch `heraldConfig` from Sanity via `getHeraldConfig(cmsClient)`
2. Resolve theme → generate CSS via `generateThemeCSSForScheme(theme, colorScheme)`
3. Load Google Fonts if typography specified
4. Inject `<style>` tag with theme CSS variables
5. Pass `library` to a client-side `LibraryProvider` context (or as a prop to components that need it)

This replaces the current hardcoded dark theme in `globals.css` with CMS-driven values.

### 3.2 Envoy Page (from DB)

**Envoy page** (`apps/herald/src/app/[username]/page.tsx`):

1. Fetch user from DB via `getUserByUsername(username)`
2. Fetch theme from Sanity via `getThemeById(cmsClient, user.themeId)`
3. Generate CSS, load fonts (existing logic, unchanged)
4. Pass `user.library` to client-side `useLibraryLoader`

This is mostly the existing flow. The addition is passing the library choice to the client for dynamic component loading.

---

## 4. Dynamic Library Loading

### 4.1 `useLibraryLoader` Hook

Copied from Summon (`apps/portal/src/app-tenants/common/hooks/useLibraryLoader.ts`). Lives at `apps/herald/src/hooks/useLibraryLoader.ts`.

```typescript
const LIBRARY_IMPORTERS: Record<UILibrary, () => Promise<Record<string, unknown>>> = {
  basic: () => import('@herald/ui/basic/components'),
  animate: () => import('@herald/ui/animate/components'),
  retro: () => import('@herald/ui/retro/components'),
  brutal: () => import('@herald/ui/brutal/components')
}
```

Returns `{ components: ComponentMap, loadLibrary: (library) => void }`.

Race-condition safe: a slower import won't overwrite a later one (ref-based guard).

### 4.2 ComponentMap Type

Defines the shape of the loaded component set:

```typescript
type ComponentMap = Record<string, React.ComponentType<any>>
```

Components available in all libraries (from the existing `@herald/ui` contract): `Button`, `Card`, `Input`, `Textarea`, `Badge`, `Separator`, `Heading`, `Text`, `Flex`.

### 4.3 LibraryProvider Context

A React context that wraps the app and provides the loaded components:

```typescript
const LibraryContext = createContext<ComponentMap>({})

export function LibraryProvider({ library, children }) {
  const { components, loadLibrary } = useLibraryLoader()
  useEffect(() => { loadLibrary(library) }, [library, loadLibrary])
  return <LibraryContext.Provider value={components}>{children}</LibraryContext.Provider>
}

export function useComponents() {
  return useContext(LibraryContext)
}
```

Used by all components to get `Button`, `Card`, etc. from the active library.

### 4.4 Integration Points

| Surface | How library is loaded |
|---------|----------------------|
| Portal layout | `<LibraryProvider library={heraldConfig.userInterface.library.id}>` |
| Envoy page | `<LibraryProvider library={user.library}>` |
| Admin preview iframe | `useLibraryLoader` + postMessage listener swaps on `PREVIEW_LIBRARY` |

---

## 5. Preview System — Library Switching

### 5.1 New Message Type: `PREVIEW_LIBRARY`

Added to the existing postMessage protocol:

| Message | Payload | Handler |
|---------|---------|---------|
| `PREVIEW_THEME` | `{ theme, colorScheme }` | `applyThemeToDOM()` (existing) |
| `PREVIEW_LIBRARY` | `{ library: string }` | `loadLibrary(library)` (new) |

### 5.2 ThemeBrowser Changes

The ThemeBrowser left sidebar already has the Themes list (top) and Libraries grid (bottom, added earlier). Changes:

1. **Clicking a library** sends `PREVIEW_LIBRARY` postMessage to iframe (in addition to saving state)
2. **Publish button** moves to top-right of the preview panel (not the theme sidebar)
3. **Publish** calls unified `POST /api/admin/publish` with `{ themeId, colorScheme, library }`
4. **`hasChanges`** checks all three fields against current DB values

### 5.3 PreviewThemeListener Changes

Add handler for `PREVIEW_LIBRARY` message type:

```typescript
if (event.data.type === 'PREVIEW_LIBRARY') {
  loadLibrary(event.data.library)
}
```

This calls `useLibraryLoader.loadLibrary()` which dynamically imports the new library's components. All components re-render with the new set.

---

## 6. Component Refactoring

### 6.1 Envoy Components

All Envoy components refactored to use library components via `useComponents()`:

| Component | Library Components Used |
|-----------|------------------------|
| `JDInput.tsx` | `Card`, `Textarea`, `Button`, `Text` |
| `ReportView.tsx` | `Card`, `Badge`, `Text`, `Heading`, `Separator` |
| `LoadingState.tsx` | `Card`, `Text` |
| `EnvoyFlow.tsx` | Orchestrator — passes components down or children use `useComponents()` |
| `EnvoyFooter.tsx` | `Text`, `Button` |

### 6.2 Portal Components

| Component | Library Components Used |
|-----------|------------------------|
| `LandingPage.tsx` | `Button`, `Card`, `Text`, `Heading` |
| `ProfileEditor.tsx` | `Card`, `Input`, `Textarea`, `Button`, `Text` |
| `AIOnboarding.tsx` | `Card`, `Input`, `Button`, `Text` |

### 6.3 Admin Components

`AdminSidebar.tsx` already imports from `@herald/ui/components/sidebar` — this is a static import (not library-switched) since the sidebar is an admin primitive, not a themed component. Admin primitives (sidebar, sheet, collapsible, tooltip) remain static imports.

### 6.4 Pattern

Components use the hook to get library components:

```typescript
function JDInput({ profile }) {
  const { Card, Textarea, Button, Text } = useComponents()
  return (
    <Card>
      <Text>{profile.name}</Text>
      <Textarea placeholder="Paste job description..." />
      <Button>Run Audit</Button>
    </Card>
  )
}
```

---

## 7. File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `packages/cms/schemas/library.ts` | Library document schema |
| `packages/cms/schemas/herald-config.ts` | heraldConfig singleton schema |
| `packages/cms/src/queries/library.ts` | Library GROQ queries |
| `packages/cms/src/queries/herald-config.ts` | heraldConfig GROQ query |
| `apps/herald/src/hooks/useLibraryLoader.ts` | Dynamic library import hook |
| `apps/herald/src/components/providers/LibraryProvider.tsx` | Library context provider |
| `apps/herald/src/app/api/admin/publish/route.ts` | Unified publish endpoint |

### Modified Files

| File | Change |
|------|--------|
| `packages/cms/schemas/index.ts` | Add library + heraldConfig schemas |
| `packages/cms/src/index.ts` | Export new queries and types |
| `packages/cms/sanity.config.ts` | Add Structure Builder for "User Interface" group |
| `apps/herald/src/app/layout.tsx` | Fetch heraldConfig, inject theme CSS, wrap with LibraryProvider |
| `apps/herald/src/app/[username]/page.tsx` | Pass user.library to LibraryProvider |
| `apps/herald/src/components/portal/ThemeBrowser.tsx` | Send PREVIEW_LIBRARY, move Publish button, unified save |
| `apps/herald/src/components/theme/PreviewThemeListener.tsx` | Handle PREVIEW_LIBRARY message |
| `apps/herald/src/components/envoy/*.tsx` | Refactor to use useComponents() |
| `apps/herald/src/components/portal/ProfileEditor.tsx` | Refactor to use useComponents() |
| `apps/herald/src/components/portal/AIOnboarding.tsx` | Refactor to use useComponents() |
| `apps/herald/src/components/portal/LandingPage.tsx` | Refactor to use useComponents() |
| `apps/herald/src/db/queries.ts` | Add updateUserUI, remove updateUserTheme + updateUserLibrary |

### Deleted Files

| File | Reason |
|------|--------|
| `apps/herald/src/app/api/admin/theme/route.ts` | Replaced by unified /api/admin/publish |
| `apps/herald/src/app/api/admin/library/route.ts` | Replaced by unified /api/admin/publish |
| `apps/herald/src/components/portal/LibraryPicker.tsx` | Libraries now inline in ThemeBrowser |
