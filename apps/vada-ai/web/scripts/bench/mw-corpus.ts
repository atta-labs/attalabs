// MW (Manual Workflow, historical) corpus — see vada-reviewers-spec.md §6a.
//
// Maps a corpus question id (apps/vada-ai/web/scripts/bench/corpus.ts) to the
// original Dani-collected manual-workflow response: chat-product reviewers,
// Dani synthesizer. §5.2 treats MW as the empirical ceiling "where available."
//
// No historical responses have been transcribed into the repo yet — this table
// is intentionally empty. run-benchmark.ts's MW condition looks a question id
// up here; a miss is recorded as an absent MW row (not an error) per §6a.
//
// To populate: add an entry keyed by the corpus question id with the original
// reviewer-collected synthesis text and a `source` note (e.g. which chat
// session/date it came from).

export interface MwEntry {
  response: string
  source: string
}

export const mwCorpus: Record<string, MwEntry> = {}
