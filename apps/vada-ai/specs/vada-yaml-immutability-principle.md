# Vāda — YAML Immutability Principle

**Date captured:** April 25, 2026
**Status:** Partially superseded by D-025 (April 26, 2026)

> **April 26, 2026 — Naming convention section superseded (D-025).** The `-v1` / `-vN` suffix naming convention described in the "Naming convention" section below was dropped in Phase 7.3. YAML files are now named semantically without version suffixes (`crucible.yaml`, not `crucible-v1.yaml`). All other sections of this document remain active: the core principle (do not modify benchmarked YAMLs; iterate by forking) is unchanged. The worked example references to `-v1` / `-v2` filenames are illustrative; the actual mechanism (copy, new id, benchmark separately) still applies.

---

## The principle, in one sentence

Once a Vāda YAML file has accumulated benchmark run data, it is immutable. To iterate, fork to a new file with a new id. Benchmark history accumulates per file as the historical record of that exact configuration.

---

## Why immutability

Without immutability, benchmark data is meaningless.

Suppose `crucible-v1.yaml` has 50 benchmark runs over two months. The first 30 runs used a specific Strategist prompt. Then someone fixed a typo in the prompt. Then the next 20 runs used the corrected prompt.

If the file is the same `crucible-v1.yaml`, all 50 runs are recorded against that file. Cross-comparison is now corrupted: "crucible-v1's average score is 3.7" averages over runs of two different configurations as if they were one.

A future analyst looking at this data has no way to know:
- When the change happened
- What changed
- Whether the score difference between the early and late runs reflects the change or random variance
- Whether to trust any conclusion drawn from the average

Multiply this across many YAMLs and many small changes, and the benchmark dataset becomes useless for comparing configurations.

Immutability fixes this. A YAML is a precise specification. Its benchmark history is the empirical record of running THAT specification. To improve a configuration, fork — `crucible-v2.yaml` becomes a separate file with separate history. Comparing v1 to v2 is now a clean question with a clean answer.

---

## How forking works

When you want to iterate on a YAML:

1. Copy the file: `crucible-v1.yaml` → `crucible-v2.yaml`
2. Update the new file's `id` to match: `id: crucible-v2`
3. Make the changes you want in the new file
4. Both files remain in the repository
5. Both files can be benchmarked independently
6. Comparing them is meaningful

The old file is not deleted. It remains as historical record. If a user (or consumer) prefers v1 over v2 because v2 made a change they don't like, they can keep using v1. The data shows them why.

---

## Naming convention

YAML files end with `-v{N}` where N is a positive integer:
- `crucible-v1.yaml`
- `crucible-v2.yaml`
- `brokered-trio-v1.yaml`
- `brokered-real-case-v1.yaml`

The version number tracks substantive forks of the same conceptual configuration. It is not a semver — there is no `v1.0.1` for a typo fix. There is `v1` and there is `v2`. Either the file changed (fork to v2) or it didn't (still v1).

The `id` field inside the YAML matches the filename:

```yaml
schema_version: "1.0"
id: crucible-v2
display_name: Crucible
description: Four-agent debate, three rounds, dual audit. v2 differs from v1 by [specific change].
```

When a YAML is forked, the new file's description should briefly note what's different from its predecessor.

---

## When does forking happen vs editing

The hard rule: **if the YAML has benchmark runs linked to it, do not edit it. Fork.**

Pre-benchmark editing is fine. While a YAML is being developed and has no benchmark history yet, normal editing applies. The "immutability commitment" is triggered the first time benchmark data attaches to the file.

The implementation of this commitment can be:

**Honor system (current).** Developers know the rule. They self-discipline.

**Marked status.** The YAML carries a `benchmarked: true` flag once it has benchmark data. The CI checks for changes to benchmarked files and rejects them.

**External registry.** A separate file (e.g., `apps/vada-ai/yamls/.locked.json`) tracks which YAMLs are locked. Locking happens automatically when the first benchmark run attaches. Modification attempts are rejected.

**File system.** Locked YAMLs become read-only. Unlocking requires explicit override.

The current implementation is honor system. Phase 11 (cost calculator) and Phase 12 (validation experiments) will likely need stronger enforcement; the mechanism can be designed then.

---

## What counts as a "change requiring a fork"

Any modification to the YAML that could affect deliberation behavior:
- System prompt edits (even typos)
- Model selection changes
- Round count changes
- Adding or removing agents
- Audit configuration changes
- Synthesis prompt changes
- Any change to template content

Modifications that do NOT require a fork:
- Whitespace cleanup (no semantic change)
- Comment changes (if comments don't affect rendering)
- Description field updates (cosmetic, doesn't affect runtime behavior)

When in doubt, fork. Forks are cheap. Corrupted benchmark data is not.

---

## What this enables

### Cross-version comparison
"crucible-v1 averages 3.7 across 50 runs; crucible-v2 averages 4.1 across 30 runs" is a meaningful comparison if both versions are immutable. The fork delineates a clean boundary.

### Cost-quality frontier per configuration
Each YAML's benchmark history reveals its own cost-quality profile. Plotting all YAMLs on a (cost, quality) chart shows the Pareto frontier. Identifying which configurations are dominated (cheaper alternatives produce equal or better quality) becomes data, not opinion.

### Catalog as living archive
The collection of YAMLs in `apps/vada-ai/yamls/` is a living archive. Old configurations remain even when superseded. Users can choose any of them. Researchers can compare patterns across years.

### Reproducibility
A user reporting "I ran crucible-v1 and got X" can be verified by running crucible-v1 again — the file hasn't changed. A user reporting "I ran crucible-v2 and got Y" can be verified independently. Reproducibility is structural, not aspirational.

### Honest improvement claims
"crucible-v3 outperforms crucible-v2 on these metrics" is a checkable claim if both versions are immutable. The data either supports it or doesn't.

---

## What this prevents

### Silent regressions
Without immutability, a small change to a prompt could degrade quality without anyone noticing. The aggregate score moves slightly, but in benchmark systems with noise, slight movements are explained away as variance. With immutability, every meaningful change creates a new file with a new score history; comparing v2 to v1 surfaces regressions clearly.

### Bias in benchmark interpretation
If a YAML can be edited mid-experiment, motivated reasoning creeps in: "let me tweak this prompt and the next 10 runs will be the 'real' performance." With immutability, you commit to running an experiment on a fixed configuration. The data is what it is.

### Mystery configurations
"What was crucible-v1 doing in March 2026?" is unanswerable if the file has been edited many times since. With immutability, the file in March 2026 IS the file today. The git log of crucible-v1.yaml has only the commits leading to its initial form, not endless tweaks.

---

## How this interacts with deletion

YAML files in the catalog are not deleted, even if superseded. They remain as historical record.

There are two exceptions:

1. **Pre-benchmark deletion.** A YAML that was created and never benchmarked can be deleted. It produced no data, and its existence is just clutter.

2. **Demonstrably broken YAMLs.** A YAML that turned out to have a bug that prevented runs (e.g., reference to an agent that doesn't exist, malformed schema) can be deleted if it produced no benchmark data. If it DID produce benchmark data despite the bug, the data needs to be flagged as such, but the file should remain.

When a YAML is superseded by a newer version, the older version stays. Users may continue to invoke it. Its benchmark history continues to exist.

---

## How this interacts with the registry

Vāda's MCP server loads a set of YAMLs at startup (the "registry"). Not every YAML in `apps/vada-ai/yamls/` needs to be in the registry — only the ones publicly exposed.

The registry is allowed to change. Today's registry might include `crucible-v1` and `sparring-v1`. Tomorrow's might include `crucible-v2` and `sparring-v2` (with v1 still in the catalog but not registered).

This separates two concerns:
- **Catalog membership** (the `apps/vada-ai/yamls/` directory contents) — append-only after benchmarking
- **Registry membership** (which YAMLs the MCP exposes by default) — mutable

A user knowing a YAML's id can still invoke it directly via full-content MCP calls (D-017), even if it's no longer in the registry.

---

## Worked example

**Scenario:** Crucible-v1 ships. After 100 benchmark runs, analysis shows the Synthesizer prompt is too verbose, hurting length_efficiency scores. We want to fix it.

**Wrong way:** Edit `crucible-v1.yaml`. Trim the Synthesizer prompt. Subsequent runs reflect the shorter prompt. The benchmark history now mixes 100 runs of the long prompt with however many runs of the short prompt, all under one file.

**Right way:**
1. Copy `crucible-v1.yaml` → `crucible-v2.yaml`
2. Update `id: crucible-v2` and `description: ... v2: shortened Synthesizer prompt.`
3. Trim the Synthesizer prompt in v2 only
4. Both files stay in the repo
5. Run benchmarks on v2
6. Compare v1's 100 runs against v2's new runs
7. If v2 wins consistently, optionally remove v1 from the registry (don't delete the file). Users invoking v1 directly still get v1.
8. The benchmark dashboard shows the v1 → v2 comparison as a clean two-configuration comparison

---

## Why this principle is here, separately

This principle is not just a coding convention. It is a structural commitment about how Vāda makes claims about deliberation quality.

If every YAML can be edited freely, Vāda cannot honestly claim "configuration X produces higher-quality deliberation than configuration Y" — because X and Y are moving targets.

Treating YAMLs as immutable artifacts is what makes Vāda's empirical claims meaningful. It is what enables a catalog to grow into something like a deliberation marketplace where configurations have measurable, defensible properties.

The principle is foundational enough to deserve its own document, separate from the broader product recognitions.

---

## Open questions

### How is immutability technically enforced?
Currently honor system. Stronger enforcement (CI checks, file system permissions, registry-based locking) is deferred until needed. Logged in `vada-state.md` as OQ-E.

### How are YAMLs versioned at the catalog level?
When `crucible-v2.yaml` appears, how do consumers (Caller Claude, the web app, third-party MCP clients) know about it? Auto-detection? Manual registry update? The mechanism is undecided. Logged in `vada-state.md` as OQ-F.

### What about hotfixes for unambiguous bugs?
If `crucible-v1.yaml` has a YAML syntax error that prevents it from loading, fixing the syntax error doesn't change deliberation behavior — it just allows the YAML to load. This is arguably an exception to immutability. The current stance: if no benchmark data exists yet (because the file never loaded), it's free to edit. If benchmark data exists, fork to v2 even for a syntax fix, to maintain the principle. This is conservative; revisit if it becomes painful.
