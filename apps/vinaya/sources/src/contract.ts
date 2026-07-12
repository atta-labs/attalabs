/**
 * Re-exports the StateSource contract from `@atta/aeg-core` — the type lives
 * there (aeg-core's purity charter keeps the contract itself I/O-free); this
 * module is the adapter package's own named surface for it, so consumers
 * importing from `@atta/vinaya-sources` don't need to know the contract's
 * origin package.
 */
export type { StateSource } from '@atta/aeg-core'
export type { DoctrineContent, DoctrineSource } from '@atta/aeg-core'
