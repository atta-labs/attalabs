'use client'

import { createContext, type ReactNode, useContext } from 'react'

type DocsChrome = {
  /** The static sidebar lockup: the brand mark with "Development / Harness" beside it. */
  wordmark: ReactNode
  /** The site nav links and theme toggle, as a bar with no logo on desktop. */
  topStrip: ReactNode
}

const DocsChromeContext = createContext<DocsChrome>({ wordmark: null, topStrip: null })

/**
 * Hands the docs shell the two pieces of site chrome it draws itself, built once in
 * `(site)/layout.tsx` next to the site-wide bar they replace on docs routes. The same
 * distribution `FooterGate` does for the footer: nested docs layouts render these, never
 * construct a second nav or issue another CMS branding read of their own. Renders no DOM
 * node, so `SiteContentPad` still wraps each route's children directly.
 */
export function DocsChromeProvider({ wordmark, topStrip, children }: DocsChrome & { children: ReactNode }) {
  return <DocsChromeContext.Provider value={{ wordmark, topStrip }}>{children}</DocsChromeContext.Provider>
}

export function useDocsChrome(): DocsChrome {
  return useContext(DocsChromeContext)
}
