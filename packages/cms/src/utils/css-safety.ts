/**
 * CSS injection guards for theme values.
 *
 * Theme documents are authored by humans through several paths — the central
 * Attalabs studio, the admin's theme editor, the admin's browse-page font
 * selectors — and every one of them ends at the same place: a custom-property
 * declaration that `generateThemeCSS`/`generateThemeCSSForScheme` build by string
 * interpolation and `NextWebShell` renders through `dangerouslySetInnerHTML`.
 * React does not escape that sink.
 *
 * Validating at each write path cannot close this: the studio hand-edit is a
 * documented authoring route with no application code in front of it. So the
 * guarantee belongs at the sink, where every feeder converges — including any
 * future one.
 *
 * One feeder is not merely untrusted-in-principle but genuinely user-supplied:
 * Herald's public profile page (`apps/herald-ai/web/src/app/[username]/(profile)/page.tsx`)
 * splices a visitor-settable `user.fontSans` into theme typography and renders the
 * result on an unauthenticated page. Setting fonts per user is a product
 * requirement, so that feeder is staying; before this guard existed it was a
 * stored-XSS path, which is the sharpest reason the check lives here rather than
 * in any one writer.
 *
 * Both halves of the declaration are guarded. The value is the obvious half; the
 * property NAME matters too, because `transformColorGroup` falls back to the raw
 * Sanity field name for any field absent from `FIELD_TO_CSS_VAR`, and Sanity's
 * HTTP API accepts fields the Studio schema never declared.
 */

/**
 * A CSS custom-property name: what the theme schema's own fields map to.
 * Deliberately narrow — every real token is words joined by hyphens
 * (`background`, `sidebar-primary-foreground`, `font-mono`, `shadow-2xl`).
 */
const SAFE_CSS_VAR_NAME = /^[a-zA-Z0-9-]+$/

/**
 * Printable sequences that let a value escape its declaration:
 *
 * - `;` starts a sibling declaration
 * - `{` and `}` open or close a rule
 * - `<` and `>` reach the enclosing `<style>` element — `</style>` is the full breakout
 * - `@` starts an at-rule once a `}` has closed the block
 * - `\` begins a CSS escape sequence, which can re-encode any of the above
 * - the comment delimiters, which let a payload hide the remainder of the rule
 *
 * A lone `/` is deliberately allowed: `oklch(0.13 0.02 283 / 0.04)` uses it for the
 * alpha channel and is present in shipped themes. Spaces, commas, parentheses,
 * `%`, `#` and `.` are allowed for the same reason — real colours, font stacks,
 * gradients and shadow ramps are built from them.
 */
const UNSAFE_CSS_VALUE = /[;{}<>@\\]|\/\*|\*\//

/**
 * Functions that make the browser fetch a remote resource. A custom property is
 * inert until referenced, but `globals.css` sets `html { background: var(--background) }`
 * — the shorthand, which accepts an image — so a theme `background` of
 * `url(https://attacker.test/x)` becomes an outbound request on the SSR page of every
 * product bound to that theme. That leaks visitor IP, user-agent and referer without
 * any script running.
 *
 * `cssColorToOklch` passes such a value through untouched (culori cannot parse it, so
 * it is returned raw), which is why this cannot be left to the colour conversion.
 * No value in any of the 19 shipped themes uses any of them.
 *
 * `src()` is here for a different reason than the rest: no browser implements it today,
 * so it is not a current exposure. It is the one named CSS addition that would reopen
 * this exact hole the moment it ships, and it costs nothing to deny now.
 */
const REMOTE_FETCH_FUNCTION = /\b(?:url|src|image-set|image|-webkit-image-set)\s*\(/i

/**
 * An unterminated string runs to the end of the stylesheet the same way an unclosed
 * block does, so `oklch(0.1 0 0) "` voids every declaration after it. Real font stacks
 * quote family names (`'DM Sans', sans-serif`), so quotes cannot simply be rejected —
 * they have to be paired. Counting per quote character is enough here because a value
 * that mixes them unevenly is already malformed, and none of the 890 shipped values
 * contains an unpaired quote of either kind.
 */
function hasBalancedQuotes(value: string): boolean {
  let doubles = 0
  let singles = 0
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '"') doubles++
    else if (value[i] === "'") singles++
  }
  return doubles % 2 === 0 && singles % 2 === 0
}

/**
 * CSS parsing consumes an unclosed block to the end of the stylesheet, so a value
 * with an unbalanced `(` swallows every declaration after it and voids the theme.
 * That is availability rather than injection, but it is free to reject: no shipped
 * theme value has unbalanced parentheses.
 */
function hasBalancedParens(value: string): boolean {
  let depth = 0
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '(') depth++
    else if (char === ')') {
      depth--
      if (depth < 0) return false
    }
  }
  return depth === 0
}

/**
 * Control characters — newlines included — appear in no legitimate token, and a
 * newline is what makes an injected payload readable as multiple declarations.
 * Checked by code point rather than a regex range so the intent survives review:
 * everything below U+0020, plus DEL.
 */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/** True when `name` is safe to interpolate as `--${name}`. */
export function isSafeCssVarName(name: string): boolean {
  return name.length > 0 && SAFE_CSS_VAR_NAME.test(name)
}

/** True when `value` is safe to interpolate as the right-hand side of a declaration. */
export function isSafeCssValue(value: string): boolean {
  return (
    value.length > 0 &&
    !UNSAFE_CSS_VALUE.test(value) &&
    !REMOTE_FETCH_FUNCTION.test(value) &&
    !hasControlCharacter(value) &&
    hasBalancedParens(value) &&
    hasBalancedQuotes(value)
  )
}

/**
 * Render a variable map as declaration lines, dropping any entry whose name or
 * value would escape.
 *
 * Dropping rather than sanitising is deliberate: a mangled value ("what did the
 * theme mean by this?") is harder to diagnose than an absent one, and an absent
 * custom property falls back to the compiled default in `globals.css`, which is
 * always a legible theme.
 *
 * Two kinds of value trip this guard, and they want different responses. A breakout
 * sequence — `</style>`, `;`, `}`, a fetch function — is not something a theme author
 * types by accident. An unbalanced paren or quote usually is: those two checks exist
 * to catch a typo before it voids the rest of the stylesheet. Either way the variable
 * is dropped; only the diagnosis differs.
 */
export function toCssDeclarations(vars: Map<string, string>): string {
  const lines: string[] = []
  for (const [key, value] of vars) {
    if (!isSafeCssVarName(key) || !isSafeCssValue(value)) continue
    lines.push(`  --${key}: ${value};`)
  }
  return lines.join('\n')
}
