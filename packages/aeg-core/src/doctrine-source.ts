/**
 * The seam the pure derivation (`deriveDiagramModel`) consumes doctrine
 * through, instead of reading `aeg-root/` paths directly. Doctrine is the raw
 * markdown that governs the methodology — `enforcement.md`, the role files,
 * the contract files. Implementations (file-backed today, package-bundled for
 * adopters tomorrow) perform I/O and therefore live outside `aeg-core`
 * (`apps/vinaya/sources`) — this package only defines the contract, so the
 * library can be packaged for repos that have no `aeg-root/` of their own
 * (D-111). Same discipline as `state-source.ts`: zero I/O here, async on the
 * adapter so callers get one uniform type regardless of the backing store.
 */
export type DoctrineContent = {
  /** Raw `enforcement.md` content. */
  enforcement: string
  /** Raw `roles/*.md` files (path + content). */
  roles: Array<{ path: string; content: string }>
  /** Raw `contracts/*.md` files (path + content). */
  contracts: Array<{ path: string; content: string }>
}

export type DoctrineSource = {
  getDoctrine(): Promise<DoctrineContent>
}
