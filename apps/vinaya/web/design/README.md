# Design fixtures — how-it-works rings diagram

Static design references, **not shipped code**. Not imported by any app route.

- `how-it-works-mockup.html` — plainer static version; the live `/how-it-works` page currently follows this shape.
- `how-it-works-rings-drilldown.html` — polished interactive version (GitHub-centered hub, three enforcement rings, drilldown), not yet applied anywhere.
- `vinaya-landing-brief.md` — the original zero-context brief these mockups were built from.

These files use raw hex colours intentionally — acceptable in a committed static reference, but must **never** be copied into live app code. The live diagram derives from the DiagramModel (see #506), not from these HTML files directly.
