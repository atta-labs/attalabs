/**
 * Prepare raw markdown for MDX compilation:
 *  - Strip HTML comments, since MDX only accepts the JSX comment form
 *  - Escape literal curly braces in prose (outside fenced blocks and inline code)
 *    so MDX does not try to parse them as JSX expressions.
 */

const BACKTICK = String.fromCharCode(96)
const FENCE = BACKTICK + BACKTICK + BACKTICK

const FENCED_BLOCK = new RegExp('(^' + FENCE + '[\\s\\S]*?^' + FENCE + '$)', 'gm')
const INLINE_CODE = new RegExp('(' + BACKTICK + '+[^' + BACKTICK + '\\n]*' + BACKTICK + '+)', 'g')
const BRACE = /([{}])/g
const HTML_COMMENT = /<!--[\s\S]*?-->/g

export function preprocessMdx(source: string): string {
  const withoutComments = source.replace(HTML_COMMENT, '')
  const parts = withoutComments.split(FENCED_BLOCK)

  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part
      const segments = part.split(INLINE_CODE)
      return segments
        .map((segment, j) => {
          if (j % 2 === 1) return segment
          return segment.replace(BRACE, '\\$1')
        })
        .join('')
    })
    .join('')
}
