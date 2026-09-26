// Same "find the nearest scrolling ancestor" pattern `LandingInteractions.tsx`'s
// `RevealGrid` uses — this app's scroll container is `SiteContentPad`'s
// `.overflow-y-auto` div in `(site)/layout.tsx`, never `window`.
function scrollParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return null
}

// Smooth-scrolls `section` so its top lands flush under the sticky `switcher`.
//
// Everything is measured at call time, nothing hardcoded: the switcher's stuck
// position is the scroll container's top edge plus its own padding (the `pt-14`
// clearing the fixed TopBar — sticky insets resolve inside that padding) plus
// the switcher's own computed `top`, and the offset below it is the switcher's
// rendered height. Works whether the switcher is currently stuck or still in
// normal flow above the section — the delta is taken from where the section is
// now to where it must end up.
export function scrollToPanelStart(section: HTMLElement, switcher: HTMLElement) {
  const container = scrollParent(section)
  if (!container) return

  const containerTop = container.getBoundingClientRect().top
  const paddingTop = Number.parseFloat(window.getComputedStyle(container).paddingTop) || 0
  const stickyTop = Number.parseFloat(window.getComputedStyle(switcher).top) || 0
  const landingY = containerTop + paddingTop + stickyTop + switcher.getBoundingClientRect().height

  const delta = section.getBoundingClientRect().top - landingY
  container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' })
}
