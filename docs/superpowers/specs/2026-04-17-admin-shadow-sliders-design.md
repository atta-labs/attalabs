# Admin Shadow Sliders — Design

**Date:** 2026-04-17
**Scope:** `tools/admin` — theme editor shadow controls
**Status:** Approved, pending implementation plan

---

## Problem

The theme editor's **Shadows** section currently exposes each of the 8 shadow tokens (`shadow2xs` … `shadow2xl`) as a freeform CSS string input. Editing requires the user to parse `0 4px 8px -2px rgba(0,0,0,0.15)`, understand which token controls what, and hand-edit values consistently across all 8 fields. The common real-world task — "this theme has too much shadow, make it lighter" — currently requires 8 synchronized manual edits.

Target: let the user explore the shadow "feel" of a theme with two intuitive controls (intensity, area), see the effect live in the iframe, and commit the result to the theme when they like it.

---

## Non-goals

- Per-shadow-token controls (one slider per row). Rejected — user explicitly wants a single gesture that tunes the whole theme.
- Editing shadow **offsets** or **spread**. Those define shadow *direction*, which is out of scope.
- Persisting the slider positions themselves. Sliders are session-ephemeral; only committed values persist.
- A visual shadow builder (X/Y/blur/spread pickers). Rejected — adds UI for values the user doesn't want to think about.

---

## UX

### Layout

At the top of the existing `Shadows` `<Section>` in `theme-form.tsx`, above the 8 field rows, a new sub-block:

```
SHADOWS
┌─────────────────────────────────────────┐
│ Preview scale (not saved)               │
│                                         │
│ Intensity  ─────●───────  100%    [⟲]   │
│ Area       ───●─────────   80%          │
│                                         │
│              [ Apply to values ]        │
└─────────────────────────────────────────┘
shadow2xs   0 1px 2px rgba(0,0,0,0.05)
shadowXs    …
```

### Controls

- **Intensity slider** — range `0–200%`, step `10%`, default `100%`. Scales the alpha channel of every shadow color proportionally.
- **Area slider** — range `0–200%`, step `10%`, default `100%`. Scales the blur radius of every shadow proportionally.
- **Reset (⟲)** — icon button. Sets both sliders back to `100%`.
- **Apply to values** — primary button. Writes the currently-previewed scaled shadow strings back into the 8 shadow text fields below (using the existing `updateShadow` flow) and resets sliders to `100%`. Disabled when both sliders are at `100%` (nothing to apply).
- **Caption** — small muted-foreground text "Preview scale (not saved)" makes it obvious the sliders don't persist on their own.

### Behavior

- Sliders always start at `100%` on mount. They do not persist across navigation, theme switch, or reload.
- Dragging a slider updates the iframe preview in real time (debounced, reusing the editor's existing 80 ms debounce).
- The saved `data.shadows` is **not** mutated while sliding — the scaled values only exist in the outbound preview message. Until the user clicks **Apply to values**, nothing is written back to the theme data or the DB.
- After **Apply to values**, the scaled strings are normal theme data; the user still has to click the existing **Save** button to persist to the DB, just like any other field change.

---

## Scaling math

Each shadow CSS string is parsed into parts: `offset-x offset-y blur [spread] color`.

- **Intensity** multiplies the alpha channel of the color. Example: `rgba(0,0,0,0.15)` at 50 % intensity → `rgba(0,0,0,0.075)`. Clamped to `[0, 1]`.
- **Area** multiplies the blur radius (the third length). Example: `8px` at 150 % area → `12px`. Clamped to `>= 0`.
- **Offsets and spread are left unchanged.** Those encode shadow *direction*, which is not part of the "intensity / area" mental model.

### Supported color forms

The alpha scaler supports the forms that actually appear in our themes (we already parse these in `parse-shadcn-css.ts`):

- `rgba(r, g, b, a)` / `rgb(r, g, b)` (treats missing `a` as `1`)
- `hsla(h, s%, l%, a)` / `hsl(...)`
- `oklch(l c h / a)` / `oklch(l c h)`
- `#rrggbb` / `#rrggbbaa`

For any other color form (e.g. a named color like `black`), intensity is left untouched for that shadow; its blur is still scaled. The slider will appear partially effective on that token — acceptable, since this path is not hit by shadcn-generated themes.

### Pure function boundary

Scaling lives in a new module `tools/admin/src/lib/scale-shadow.ts`:

```ts
export function scaleShadow(
  shadowCss: string,
  opts: { intensity: number; area: number }
): string

export function scaleShadows(
  shadows: Record<string, string>,
  opts: { intensity: number; area: number }
): Record<string, string>
```

No React, no side effects — trivially testable if tests are added later.

---

## Data flow

Slider state is local to `ThemeForm` (not part of the shared `ThemeEditorData` shape). The form communicates preview intent to the editor-client through a single callback prop.

```
┌──────────────────────────────────────────────────────────────┐
│ ThemeForm                                                    │
│                                                              │
│  [intensity, area] ──► effect:                               │
│    if (intensity===1 && area===1)  onOverride(null)          │
│    else                             onOverride(scaleShadows( │
│                                        data.shadows,         │
│                                        { intensity, area })) │
│                                                              │
│  [Apply]: for each SHADOW_FIELD:                             │
│    updateShadow(field, scaleShadow(data.shadows[field], …))  │
│    setIntensity(1); setArea(1)                               │
└──────────┬───────────────────────────────────────────────────┘
           │ onPreviewShadowsOverride
           ▼
┌──────────────────────────────────────────────────────────────┐
│ ThemeEditorClient                                            │
│                                                              │
│  const [override, setOverride] = useState<null | Record>…    │
│                                                              │
│  debounced effect on [data, colorScheme, override]:          │
│    sendMessage(buildMessage(data, colorScheme, override))    │
│                                                              │
│  buildMessage(data, cs, override) → {                        │
│    type: 'PREVIEW_THEME',                                    │
│    theme: { …, shadows: override ?? data.shadows },          │
│    colorScheme: cs                                           │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

Key properties:

- Saved state (`data.shadows`) is never mutated during slider drag.
- Preview message shape (`PREVIEW_THEME`) is unchanged — only the contents of `theme.shadows` differ.
- Preview listener in the iframe (`PreviewThemeListener`) needs no changes.
- Reset and "both sliders at 100 %" produce identical wire state: `override === null`, iframe renders authored shadows.
- **Apply to values** commits via the existing `updateShadow` flow → `data.shadows` is updated → `dirty` becomes true → existing Save button handles DB persistence.

---

## File changes

### New

- `tools/admin/src/lib/scale-shadow.ts`
  Pure module: `scaleShadow`, `scaleShadows`, and the small color-alpha helpers they depend on.

### Modified

- `tools/admin/src/app/themes/[themeId]/edit/_components/theme-form.tsx`
  - Add `onPreviewShadowsOverride: (shadows: Record<string, string> | null) => void` to `ThemeFormProps`.
  - Add local state `intensity`, `area` (default `1`).
  - Inside the existing `Shadows` `<Section>`, render the new sub-block (two `Slider`s from `@atta/ui/components/slider`, percentage readouts, reset icon button, **Apply to values** button) above the field rows.
  - `useEffect` on `[intensity, area, data.shadows]` → compute and push override (or `null`).
  - Apply handler: iterate `SHADOW_FIELDS`, call `updateShadow(field, scaleShadow(data.shadows[field] ?? '', { intensity, area }))`, then reset sliders.

- `tools/admin/src/app/themes/[themeId]/edit/_components/theme-editor-client.tsx`
  - New state `previewShadowsOverride`.
  - `buildMessage` gains an `override` argument and uses `override ?? data.shadows`.
  - Debounced preview effect reads `previewShadowsOverride` and includes it in deps.
  - Pass `onPreviewShadowsOverride={setPreviewShadowsOverride}` to `<ThemeForm>`.

### Not touched

- `_types.ts` — no changes to `ThemeEditorData` (sliders are ephemeral, not data).
- `parse-shadcn-css.ts` — unrelated.
- `preview-theme-listener.tsx` / iframe host — message shape unchanged.
- Database schema / server actions — unchanged. Apply-then-Save uses the existing persistence path.

---

## Rules / conventions

- Uses `Slider`, `Button` from `@atta/ui` (no raw HTML primitives).
- Semantic tokens only (`text-muted-foreground`, `border-border/50`, etc.) — no palette colors, no hex.
- No inline styles; percentage readouts use Tailwind classes.
- Named exports only, `type` imports where applicable.
- Biome-clean, typecheck-clean.

---

## Verification

Manual verification (the admin tool has no automated tests today):

1. Open any existing theme in `tools/admin` (`bun run dev` → `http://localhost:3100`, navigate to theme edit page, with Vada running on `localhost:3003`).
2. Slide **Intensity** down to ~30 % → iframe shadows become visibly lighter in real time.
3. Slide **Area** up to 150 % → shadows spread wider.
4. Click **Reset (⟲)** → iframe returns to the authored shadow values; Apply button disables.
5. Re-adjust sliders, click **Apply to values** → the 8 shadow text inputs below now contain the scaled strings; sliders return to 100 %; Apply button disables; the Save button becomes active (dirty).
6. Click **Save** → DB is updated with the scaled values (standard existing flow).
7. `bun run typecheck` passes.

---

## Future (out of scope for this spec)

- Per-token intensity/area overrides (e.g. keep `shadowSm` unchanged while heavy-weight shadows shift).
- An "offsets" slider (though ratio-scaling offsets rarely produces results users want).
- Saving slider positions as part of the theme (a theme-level shadow vibe multiplier).
