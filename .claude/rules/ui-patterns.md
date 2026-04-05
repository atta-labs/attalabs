# UI Patterns — Atta AI

## Theme: Minimal Dark Editorial

All UI must follow the Minimal Dark theme defined in the relevant product BUILD-SPEC.md.

### Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0D0B08` | Page background |
| Primary text | `#E8D5B7` | Body text |
| Accent | `#C8A84B` | Grade badges, CTAs, links |
| Secondary text | `#7A6A50` | Labels, metadata |
| Card background | `#1A1610` | Report cards, input areas |
| Border | `#2A2318` | Subtle dividers |

### Typography

- **Playfair Display** — headings, grade display, italic for emphasis
- **DM Mono** — signal titles, technical data, code-like content
- **DM Sans** — labels, buttons, navigation

### Layout Rules

- Single column, editorial layout
- Generous whitespace — this is a premium product, not a dashboard
- Information density increases as user scrolls
- Decision Anchor (grade + recommendation) is always the most prominent element

### Component Rules

- Use shadcn/ui components as the base
- Use `lucide-react` for all icons
- No custom primitive components — extend shadcn
- Error states must be graceful, never raw error messages
