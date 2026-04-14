#!/usr/bin/env node
/**
 * UI Component Contract Validator
 *
 * Checks that every UI library exports all components and types defined in
 * packages/ui/component-contract.mjs. Exits 1 if anything is missing,
 * blocking the build.
 *
 * Usage:
 *   node scripts/validate-ui-contract.mjs
 *   bun scripts/validate-ui-contract.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Path setup ────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const UI_DIR = path.join(ROOT_DIR, 'packages', 'ui')

const contractPath = path.join(UI_DIR, 'component-contract.mjs')
const { REQUIRED_COMPONENTS, REQUIRED_TYPES, TEMPLATES } = await import(contractPath)

// ── Export parser ─────────────────────────────────────────────────────────────
/**
 * Recursively parses all named exports from a TypeScript index file.
 * Follows `export * from` and `export type * from` chains transitively.
 * Returns { components: Set<string>, types: Set<string> }
 */
function parseExports(filePath, visited = new Set()) {
  if (visited.has(filePath)) return { components: new Set(), types: new Set() }
  visited.add(filePath)

  const content = fs.readFileSync(filePath, 'utf-8')
  const components = new Set()
  const types = new Set()

  // export { A, B, type C } from '...'
  const namedExportRegex = /export\s*\{([^}]+)\}\s*from/g
  let match
  while ((match = namedExportRegex.exec(content)) !== null) {
    for (const exp of match[1].split(',').map(s => s.trim()).filter(Boolean)) {
      if (exp.startsWith('type ')) {
        const name = exp.replace('type ', '').split(' as ')[0].trim()
        if (name) types.add(name)
      } else {
        const name = exp.includes(' as ') ? exp.split(' as ')[1].trim() : exp.trim()
        if (name && /^\w+$/.test(name)) components.add(name)
      }
    }
  }

  // export type { A, B } from '...' (multiline safe)
  const typeBlockRegex = /export\s+type\s*\{([^}]+)\}\s*from/gs
  while ((match = typeBlockRegex.exec(content)) !== null) {
    const clean = match[1].replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const exp of clean.split(',').map(s => s.trim()).filter(Boolean)) {
      const name = exp.includes(' as ') ? exp.split(' as ')[1].trim() : exp.trim()
      if (name && /^\w+$/.test(name)) types.add(name)
    }
  }

  // inline: export { X, type Y, Z }
  const inlineTypeRegex = /[{,]\s*type\s+(\w+)/g
  while ((match = inlineTypeRegex.exec(content)) !== null) types.add(match[1])

  const fileDir = path.dirname(filePath)

  // export * from '...' — recurse, collect both components and types
  const valueStarRegex = /^export\s+\*\s+from\s+['"]([^'"]+)['"]/gm
  while ((match = valueStarRegex.exec(content)) !== null) {
    const resolved = resolveImport(match[1], fileDir)
    if (resolved) {
      const sub = parseExports(resolved, visited)
      sub.components.forEach(c => components.add(c))
      sub.types.forEach(t => types.add(t))
    }
  }

  // export type * from '...' — recurse, collect types only
  const typeStarRegex = /^export\s+type\s+\*\s+from\s+['"]([^'"]+)['"]/gm
  while ((match = typeStarRegex.exec(content)) !== null) {
    const resolved = resolveImport(match[1], fileDir)
    if (resolved) {
      const sub = parseExports(resolved, visited)
      sub.components.forEach(c => types.add(c)) // value exports from a type-only file are still types
      sub.types.forEach(t => types.add(t))
    }
  }

  return { components, types }
}

/**
 * Resolves a relative import path to an absolute file path.
 * Tries .ts, .tsx, /index.ts, /index.tsx extensions.
 */
function resolveImport(importPath, fromDir) {
  const resolved = path.resolve(fromDir, importPath)

  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const tryPath = resolved + ext
    if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) return tryPath
  }

  if (fs.existsSync(resolved)) {
    if (fs.statSync(resolved).isFile()) return resolved
    if (fs.statSync(resolved).isDirectory()) {
      const idx = path.join(resolved, 'index.ts')
      if (fs.existsSync(idx)) return idx
    }
  }

  return null
}

// ── Validator ─────────────────────────────────────────────────────────────────
function validateLibrary(name) {
  const indexPath = path.join(UI_DIR, 'libraries', name, 'components', 'index.ts')

  if (!fs.existsSync(indexPath)) {
    console.error(`❌ Library "${name}": index.ts not found at ${indexPath}`)
    return { valid: false, missingComponents: [], missingTypes: [] }
  }

  const { components, types } = parseExports(indexPath)
  const missingComponents = REQUIRED_COMPONENTS.filter(c => !components.has(c))
  const missingTypes = REQUIRED_TYPES.filter(t => !types.has(t))

  return {
    valid: missingComponents.length === 0 && missingTypes.length === 0,
    missingComponents,
    missingTypes,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Validating UI Component Contract\n')
  console.log(`   Contract : ${REQUIRED_COMPONENTS.length} components, ${REQUIRED_TYPES.length} types`)
  console.log(`   Libraries: ${TEMPLATES.join(', ')}\n`)

  let allValid = true

  for (const lib of TEMPLATES) {
    console.log(`📦 Checking ${lib}...`)
    const result = validateLibrary(lib)

    if (result.valid) {
      console.log('   ✅ All exports present\n')
    } else {
      allValid = false
      if (result.missingComponents.length > 0) {
        console.log(`   ❌ Missing components (${result.missingComponents.length}):`)
        result.missingComponents.forEach(c => console.log(`        - ${c}`))
      }
      if (result.missingTypes.length > 0) {
        console.log(`   ❌ Missing types (${result.missingTypes.length}):`)
        result.missingTypes.forEach(t => console.log(`        - ${t}`))
      }
      console.log()
    }
  }

  if (allValid) {
    console.log('✨ All libraries satisfy the component contract!')
    process.exit(0)
  } else {
    console.log('❌ Some libraries are missing required exports. Fix them or update the contract.')
    process.exit(1)
  }
}

main()
