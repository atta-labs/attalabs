import type { PlanNodeRole } from './types.js'
import { TemplateValidationError } from './errors.js'

/**
 * Variables accessible in ALL template contexts, regardless of node role.
 */
const BASE_VARIABLES = new Set([
  'question',
  'agent',
  'isTerminal',
  'isRevision',
  'revisionIndex',
  'allPreviousOutputs',
  'outputsByAgent',
  'lastOutputByAgent',
  'auditOutputs',
  'customVars'
])

/**
 * Variables accessible only for specific node roles. Map of role → allowed vars.
 */
const ROLE_SPECIFIC_VARIABLES: Record<PlanNodeRole, Set<string>> = {
  solo: new Set(),
  round: new Set(['roundIndex', 'totalRounds', 'outputsByRound', 'currentRoundOutputs']),
  terminal: new Set(['roundIndex', 'totalRounds', 'outputsByRound']),
  audit: new Set(['conclusion', 'previousRevisions']),
  'custom-step': new Set()
}

/**
 * Handlebars block helpers that appear as {{#name}} / {{/name}}. These
 * are structural, not variable references, and don't need validation.
 */
const BLOCK_HELPERS = new Set(['each', 'if', 'unless', 'else', 'with'])

/**
 * Handlebars built-ins available inside block contexts. Variable references
 * starting with these don't need validation against the allowed set.
 */
const BLOCK_CONTEXT_IDENTIFIERS = new Set(['this', '@index', '@key', '@first', '@last'])

/**
 * Validates a Handlebars template string for role-appropriate variable
 * references and basic syntactic correctness.
 *
 * Throws TemplateValidationError with specific feedback if the template:
 *   - Has unbalanced braces or blocks
 *   - References variables not allowed for the given node role
 *   - Uses syntax that appears malformed
 *
 * V1 uses regex scanning — catches common misuses but won't validate
 * every edge case a full Handlebars parser would.
 */
export function validateTemplate(template: string, role: PlanNodeRole): void {
  // Step 1: strip comments
  const withoutComments = template.replace(/\{\{!--[\s\S]*?--\}\}/g, '').replace(/\{\{![^}]*?\}\}/g, '')

  // Step 2: basic balance check
  validateBalance(withoutComments, template, role)

  // Step 3: extract and validate variable references
  const allowedVars = new Set([...BASE_VARIABLES, ...ROLE_SPECIFIC_VARIABLES[role]])

  // Match all Handlebars expressions: {{ ... }} (anything between braces)
  // Captures the content between the braces.
  const expressionRegex = /\{\{[~]?\s*([^}]+?)\s*[~]?\}\}/g
  let match = expressionRegex.exec(withoutComments)

  while (match !== null) {
    const expression = match[1]!.trim()

    // Skip block helpers: {{#name}}, {{/name}}, {{^name}}
    if (expression.startsWith('#') || expression.startsWith('/') || expression.startsWith('^')) {
      continue
    }

    // Skip "else" keyword
    if (expression === 'else') {
      continue
    }

    // Extract the root identifier. For an expression like "foo.bar.baz",
    // we only validate "foo" — Handlebars handles nested access naturally.
    // For "foo bar" (helper call), we validate "foo" as the helper name —
    // but since we don't define custom helpers, any helper is unknown.
    const rootIdentifier = expression.split(/[\s.[]/)[0]!

    // Skip block context identifiers (this, @index, etc.)
    if (BLOCK_CONTEXT_IDENTIFIERS.has(rootIdentifier)) {
      continue
    }

    // Check if the identifier is a known variable for this role
    if (!allowedVars.has(rootIdentifier)) {
      // Check if it's an unknown helper (not in our block helper list either)
      if (BLOCK_HELPERS.has(rootIdentifier)) {
        // Shouldn't happen since block helpers start with # or / — this catches
        // erroneous usage like {{each outputs}} without #
        throw new TemplateValidationError(
          `Template uses block helper '${rootIdentifier}' without # prefix. Use {{#${rootIdentifier}}}...{{/${rootIdentifier}}}.`,
          {
            template: template.slice(0, 200),
            role,
            reason: `block helper '${rootIdentifier}' used as expression`
          }
        )
      }

      throw new TemplateValidationError(
        `Template references unknown variable '${rootIdentifier}' for role '${role}'. Allowed: ${[...allowedVars].sort().join(', ')}.`,
        {
          template: template.slice(0, 200),
          role,
          reason: `unknown variable: ${rootIdentifier}`
        }
      )
    }
    match = expressionRegex.exec(withoutComments)
  }
}

/**
 * Checks that {{ pairs are balanced and {{#block}} / {{/block}} pairs match.
 */
function validateBalance(withoutComments: string, originalTemplate: string, role: PlanNodeRole): void {
  // Count {{ and }} — should be equal
  const openCount = (withoutComments.match(/\{\{/g) || []).length
  const closeCount = (withoutComments.match(/\}\}/g) || []).length

  if (openCount !== closeCount) {
    throw new TemplateValidationError(`Template has unbalanced braces: ${openCount} '{{' vs ${closeCount} '}}'.`, {
      template: originalTemplate.slice(0, 200),
      role,
      reason: `unbalanced braces: ${openCount} opens vs ${closeCount} closes`
    })
  }

  // Check block helper balance — {{#name}} must match {{/name}}
  const blockOpens = [...withoutComments.matchAll(/\{\{\s*#\s*(\w+)[^}]*\}\}/g)]
  const blockCloses = [...withoutComments.matchAll(/\{\{\s*\/\s*(\w+)\s*\}\}/g)]

  // Use a stack-based approach to detect mismatched nesting
  const stack: string[] = []
  const allBlocks: Array<{ type: 'open' | 'close'; name: string; index: number }> = []

  for (const m of blockOpens) {
    allBlocks.push({ type: 'open', name: m[1]!, index: m.index! })
  }
  for (const m of blockCloses) {
    allBlocks.push({ type: 'close', name: m[1]!, index: m.index! })
  }
  allBlocks.sort((a, b) => a.index - b.index)

  for (const block of allBlocks) {
    if (block.type === 'open') {
      stack.push(block.name)
    } else {
      const expected = stack.pop()
      if (expected !== block.name) {
        throw new TemplateValidationError(
          expected === undefined
            ? `Template has closing tag '{{/${block.name}}}' with no matching opener.`
            : `Template has mismatched block: opened '{{#${expected}}}' but closed '{{/${block.name}}}'.`,
          {
            template: originalTemplate.slice(0, 200),
            role,
            reason:
              expected === undefined
                ? `closing tag without opener: /${block.name}`
                : `mismatched block: expected /${expected}, got /${block.name}`
          }
        )
      }
    }
  }

  if (stack.length > 0) {
    throw new TemplateValidationError(
      `Template has ${stack.length} unclosed block(s): ${stack.map((n) => `{{#${n}}}`).join(', ')}.`,
      {
        template: originalTemplate.slice(0, 200),
        role,
        reason: `unclosed blocks: ${stack.join(', ')}`
      }
    )
  }
}
