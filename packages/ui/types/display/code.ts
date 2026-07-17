/** @category display */
import type * as React from 'react'

/**
 * Inline code props contract — a `<code>` chip for a command, flag, filename,
 * or identifier sitting inside a sentence.
 */
export type CodeProps = React.ComponentPropsWithoutRef<'code'>

/**
 * Block code props contract — a `<pre>` block for a standalone command or
 * snippet. Holds only the code; explanatory prose belongs outside it.
 */
export type CodeBlockProps = React.ComponentPropsWithoutRef<'pre'>
