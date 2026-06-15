import type { LedgerRow, LedgerTotals } from './types'

/**
 * Pure aggregate over ledger rows. The iteration total is derived from the
 * rows — never stored — so re-entry (a role appending a second row for the
 * same phase) naturally adds to the total without any "replace existing"
 * semantics. This is the same philosophy as derived task status and the
 * append-only decision log: don't store the aggregate, sum the immutable
 * entries.
 *
 * Null cells contribute zero — a claude.ai row the Principal has not yet
 * filled in does not inflate the total with imaginary tokens. The row
 * count includes those rows so a UI can still surface "5 entries, 2
 * pending fill".
 */
export function sumLedger(rows: LedgerRow[]): LedgerTotals {
  let tokensIn = 0
  let tokensOut = 0
  let cost = 0
  for (const r of rows) {
    if (r.tokensIn != null) tokensIn += r.tokensIn
    if (r.tokensOut != null) tokensOut += r.tokensOut
    if (r.cost != null) cost += r.cost
  }
  return { tokensIn, tokensOut, cost, rows: rows.length }
}
