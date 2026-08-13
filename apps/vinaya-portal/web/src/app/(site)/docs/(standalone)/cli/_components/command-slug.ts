/** Anchor id for a command's section — the one slug shared between the
 * sidebar's hrefs (client) and the content pane's section ids (server), so a
 * click target and its heading can never drift. Command names are unique, so
 * the slug is too. Lives in a plain (non-`'use client'`) module so the server
 * page can call it directly. */
export function commandSlug(name: string) {
  return `command-${name.replace(/\s+/g, '-')}`
}
