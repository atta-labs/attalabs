/**
 * Default Minimal Dark theme — fallback when no Sanity theme is loaded.
 * These values match Herald's original hardcoded globals.css tokens.
 * Injected in the root layout to prevent FOUC.
 */
export const DEFAULT_THEME_CSS = `:root {
  --background: #0D0B08;
  --foreground: #E8D5B7;
  --muted: #7A6A50;
  --muted-foreground: #7A6A50;
  --card: #1A1610;
  --card-foreground: #E8D5B7;
  --border: #2A2318;
  --input: #2A2318;
  --ring: #C8A84B;
  --primary: #C8A84B;
  --primary-foreground: #0D0B08;
  --secondary: #1A1610;
  --secondary-foreground: #E8D5B7;
  --accent: #C8A84B;
  --accent-foreground: #0D0B08;
  --destructive: #C85A4B;
  --destructive-foreground: #E8D5B7;
  --popover: #1A1610;
  --popover-foreground: #E8D5B7;
  --radius: 0.5rem;
}
`
