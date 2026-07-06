import { describe, expect, it } from 'vitest'
import { isCodeFile, isDecisionLog, isDocFile, isSpecFile } from './file-classify'

describe('isDocFile', () => {
  it('matches aeg-root, aeg-project, spec, and skill markdown', () => {
    expect(isDocFile('aeg-root/roles/developer.md')).toBe(true)
    expect(isDocFile('aeg-project/state.md')).toBe(true)
    expect(isDocFile('apps/herald-ai/aeg-project/state.md')).toBe(true)
    expect(isDocFile('packages/governance/projects.md')).toBe(true)
    expect(isDocFile('apps/herald-ai/specs/herald-spec.md')).toBe(true)
    expect(isDocFile('.claude/skills/brief-authoring/SKILL.md')).toBe(true)
    expect(isDocFile('docs-index.md')).toBe(true)
    expect(isDocFile('README.md')).toBe(true)
    expect(isDocFile('CLAUDE.md')).toBe(true)
  })

  it('does not match code or unrelated markdown', () => {
    expect(isDocFile('apps/herald-ai/web/src/lib/foo.ts')).toBe(false)
    expect(isDocFile('some/random/notes.md')).toBe(false)
  })
})

describe('isCodeFile', () => {
  it('matches common source extensions', () => {
    for (const ext of ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'sql', 'css']) {
      expect(isCodeFile(`foo.${ext}`)).toBe(true)
    }
  })

  it('excludes markdown even if it matches an extension elsewhere', () => {
    expect(isCodeFile('foo.md')).toBe(false)
  })

  it('excludes non-code extensions', () => {
    expect(isCodeFile('foo.json')).toBe(false)
    expect(isCodeFile('foo.yml')).toBe(false)
  })
})

describe('isSpecFile', () => {
  it('matches apps/*/specs/*.md', () => {
    expect(isSpecFile('apps/vada-ai/specs/vada-spec.md')).toBe(true)
  })

  it('rejects non-spec paths', () => {
    expect(isSpecFile('apps/vada-ai/web/src/lib/foo.ts')).toBe(false)
    expect(isSpecFile('packages/engine/specs/foo.md')).toBe(false)
  })
})

describe('isDecisionLog', () => {
  it('matches the global log and per-project *-decisions.md', () => {
    expect(isDecisionLog('packages/governance/decisions.md')).toBe(true)
    expect(isDecisionLog('apps/vada-ai/specs/vada-decisions.md')).toBe(true)
  })

  it('rejects other markdown', () => {
    expect(isDecisionLog('aeg-project/state.md')).toBe(false)
  })
})
