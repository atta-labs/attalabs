#!/usr/bin/env bun

/**
 * check-forbidden-colors — CI gate that mirrors `.claude/skills/ui-theme-tokens/SKILL.md`.
 *
 * Diff-scoped: only the ADDED lines in changed `.tsx` / `.jsx` / `.ts` / `.js` / `.css`
 * files are scanned. Pre-existing violations elsewhere in the codebase are deliberately
 * NOT flagged — this gate catches what a PR introduces, not legacy debt.
 *
 * Patterns flagged (from the SKILL's "Forbidden Patterns" section):
 *   1. Tailwind palette classes:           text-green-500, bg-zinc-900, hover:ring-blue-400
 *   2. Arbitrary color brackets:           bg-[#1A1610], text-[oklch(...)], border-[rgb(...)]
 *   3. Absolute colors:                    text-white, bg-black, text-white/80
 *   4. Inline style color literals:        style={{ background: '#0D0B08' }},
 *                                          style={{ color: 'oklch(...)' }}
 *
 * .css files: token-definition lines (`--name: ...`) and the canonical token source
 * (`packages/ui/styles/globals.css`) are skipped to avoid false-positives on legitimate
 * `oklch(...)` definitions.
 *
 * `packages/ui/libraries/<lib>/installed/` (and nested helper trees) is exempt — verbatim
 * upstream CLI paste, see D-065.
 *
 * Modes:
 *   --pr   Reads BASE_SHA / HEAD_SHA env vars (CI) or falls back to origin/main…HEAD.
 *   (none) Same as --pr (no full-repo scan; the gate is intentionally diff-only).
 *
 * Exit 1 on any violation; output `file:line: <snippet>` per violation.
 */

import { execSync } from 'node:child_process'

const TAILWIND_PROPS = [
  'text',
  'bg',
  'border',
  'ring',
  'from',
  'to',
  'via',
  'placeholder',
  'decoration',
  'outline',
  'caret',
  'fill',
  'stroke',
  'divide',
  'accent',
  'shadow'
].join('|')

const TAILWIND_PALETTE = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose'
].join('|')

const STYLE_COLOR_PROPS = [
  'color',
  'background',
  'backgroundColor',
  'backgroundImage',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'caretColor',
  'fill',
  'stroke',
  'textDecorationColor'
].join('|')

// Tailwind palette classes (preceded by start, whitespace, quote, or variant separator
// like `:`). The lookbehind `(?<![\w-])` rejects matches inside identifiers like
// `is-blue-team-500` (not a Tailwind class), while still allowing `hover:bg-red-500`.
const PALETTE_RE = new RegExp(`(?<![\\w-])(?:${TAILWIND_PROPS})-(?:${TAILWIND_PALETTE})-\\d{2,3}(?![\\w-])`, 'g')

// Arbitrary color brackets: bg-[#FFF], text-[oklch(...)], border-[rgb(...)], etc.
const ARBITRARY_HEX_RE = new RegExp(`(?<![\\w-])(?:${TAILWIND_PROPS})-\\[#[0-9a-fA-F]{3,8}\\]`, 'g')
const ARBITRARY_FUNC_RE = new RegExp(`(?<![\\w-])(?:${TAILWIND_PROPS})-\\[(?:oklch|hsla?|rgba?)\\(`, 'g')

// Absolute colors: text-white, bg-black, text-white/80 — these never theme.
const ABSOLUTE_RE = new RegExp(`(?<![\\w-])(?:${TAILWIND_PROPS})-(?:white|black)(?:\\/\\d{1,3})?(?![\\w-])`, 'g')

// Inline style color literals: `color: '#fff'`, `background: 'oklch(...)'`, etc.
// Matches a known color-bearing property name followed by a quoted hex / oklch / hsl / rgb.
const INLINE_STYLE_RE = new RegExp(
  `(?:${STYLE_COLOR_PROPS})\\s*:\\s*['"\`]\\s*(?:#[0-9a-fA-F]{3,8}|(?:oklch|hsla?|rgba?)\\()`,
  'g'
)

// CSS raw color literals (used only on `.css` files outside the token source).
const CSS_HEX_RE = /(?<![\w&])#[0-9a-fA-F]{3,8}\b/g
const CSS_FUNC_RE = /\b(?:oklch|hsla?|rgba?)\s*\(/g

const CSS_TOKEN_SOURCE_FILES = new Set(['packages/ui/styles/globals.css'])

interface Violation {
  file: string
  line: number
  snippet: string
  reason: string
}

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).toString()
  } catch {
    return ''
  }
}

function resolveBase(): string {
  const explicit = process.env.BASE_SHA?.trim()
  if (explicit) return explicit
  // Local fallback — mirrors verify-docs.
  const merged = sh('git merge-base HEAD origin/main').trim()
  if (merged) return merged
  return 'origin/main'
}

/**
 * Parse `git diff --unified=0` output into per-file added-line records.
 * Each chunk header `@@ -a,b +c,d @@` tells us the starting HEAD line; we walk lines
 * starting with `+` (and not `+++`) and assign sequential line numbers from there.
 */
function parseAddedLines(diff: string): { file: string; line: number; text: string }[] {
  const out: { file: string; line: number; text: string }[] = []
  let currentFile: string | null = null
  let currentLine = 0
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ b/')) {
      currentFile = raw.slice(6)
      continue
    }
    if (raw.startsWith('--- ')) continue
    if (raw.startsWith('diff --git ')) {
      currentFile = null
      continue
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) {
      currentLine = Number.parseInt(hunk[1], 10)
      continue
    }
    if (!currentFile) continue
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      out.push({ file: currentFile, line: currentLine, text: raw.slice(1) })
      currentLine++
      continue
    }
    // Context lines are absent under --unified=0, but be defensive.
    if (raw.startsWith(' ')) currentLine++
  }
  return out
}

function isUiFile(p: string): boolean {
  return /\.(tsx|jsx|ts|js|mts|cts|mjs|cjs|css)$/.test(p)
}

// `packages/ui/libraries/<name>/installed/**` is verbatim upstream CLI paste (D-065 +
// Biome ignore). Color choices in there are upstream's, not ours — exempt from this gate.
// Matches nested helper trees too (e.g. `installed/animate-ui/primitives/...`).
const INSTALLED_RE = /(?:^|\/)packages\/ui\/libraries\/[^/]+\/installed\//

function scanLine(file: string, line: number, text: string): Violation[] {
  const violations: Violation[] = []
  const trimmed = text.trim()
  const isCss = file.endsWith('.css')

  if (isCss) {
    // Token source (globals.css) defines the palette — skip entirely.
    if (CSS_TOKEN_SOURCE_FILES.has(file)) return violations
    // CSS custom-property definitions (`--name: value;`) are token declarations.
    if (/^\s*--[a-z][a-z0-9-]*\s*:/i.test(text)) return violations
    // `@theme inline { --color-x: var(--x); }` mapping lines.
    if (/^\s*--color-[a-z0-9-]+\s*:/i.test(text)) return violations
    // Comments.
    if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) {
      return violations
    }
    for (const re of [CSS_HEX_RE, CSS_FUNC_RE]) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      // biome-ignore lint/suspicious/noAssignInExpressions: standard exec-loop idiom.
      while ((m = re.exec(text)) !== null) {
        violations.push({
          file,
          line,
          snippet: m[0],
          reason: 'raw color literal in CSS (use a semantic token)'
        })
      }
    }
    return violations
  }

  // .tsx / .jsx / .ts / .js — line-comment lines are skipped to reduce noise.
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) return violations

  const checks: { re: RegExp; reason: string }[] = [
    { re: PALETTE_RE, reason: 'Tailwind palette color (use a semantic token)' },
    { re: ARBITRARY_HEX_RE, reason: 'arbitrary hex color class (use a semantic token)' },
    { re: ARBITRARY_FUNC_RE, reason: 'arbitrary color-function class (use a semantic token)' },
    { re: ABSOLUTE_RE, reason: 'absolute color class — breaks themes (use a semantic token)' },
    { re: INLINE_STYLE_RE, reason: 'inline-style color literal (use a semantic token)' }
  ]

  for (const { re, reason } of checks) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    // biome-ignore lint/suspicious/noAssignInExpressions: standard exec-loop idiom.
    while ((m = re.exec(text)) !== null) {
      violations.push({ file, line, snippet: m[0], reason })
    }
  }
  return violations
}

function main(): void {
  const base = resolveBase()
  const head = process.env.HEAD_SHA?.trim() || 'HEAD'
  const range = `${base}..${head}`

  // Diff-scoped — added lines only, in UI files only.
  const diff = sh(
    `git diff --unified=0 --no-color ${range} -- '*.tsx' '*.jsx' '*.ts' '*.js' '*.mts' '*.cts' '*.mjs' '*.cjs' '*.css'`
  )
  if (!diff.trim()) {
    console.log(`check-forbidden-colors: no UI changes in ${range}; nothing to check.`)
    return
  }

  const added = parseAddedLines(diff).filter((a) => isUiFile(a.file) && !INSTALLED_RE.test(a.file))
  const violations: Violation[] = []
  for (const a of added) {
    violations.push(...scanLine(a.file, a.line, a.text))
  }

  if (violations.length === 0) {
    console.log(`check-forbidden-colors: scanned ${added.length} added line(s) across UI files; clean.`)
    return
  }

  console.error(`check-forbidden-colors: ${violations.length} violation(s) — fix before merge.`)
  console.error('See .claude/skills/ui-theme-tokens/SKILL.md for the allowed semantic tokens.')
  console.error('')
  for (const v of violations) {
    console.error(`${v.file}:${v.line}: ${v.snippet}  — ${v.reason}`)
  }
  process.exit(1)
}

main()
