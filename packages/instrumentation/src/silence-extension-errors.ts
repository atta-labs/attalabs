// silence-extension-errors.ts
//
// Side-effect import. Loaded from each app's `src/instrumentation-client.ts`
// (Next.js 15.3+) so it runs in the browser before app code executes.
//
// Purpose: stop errors thrown by browser-extension–injected scripts
// (Coinbase Wallet's requestProvider.js, MetaMask, Phantom, etc.) from
// surfacing in the Next.js dev error overlay and masking real app errors.
//
// This is a dev-ergonomics filter, NOT a correctness fix. It only suppresses
// errors whose origin is a chrome-extension:// (or moz-extension://) URL.
// Errors from your own code are untouched.

const EXTENSION_PROTOCOLS = ['chrome-extension://', 'moz-extension://', 'safari-web-extension://']

function isFromExtension(source?: string | null): boolean {
  if (!source) return false
  return EXTENSION_PROTOCOLS.some((proto) => source.includes(proto))
}

if (typeof window !== 'undefined') {
  // Wrap window.onerror — this is the channel Turbopack's HMR client uses to
  // forward browser errors to the terminal as "[browser] Uncaught TypeError".
  // It fires synchronously before any addEventListener handler runs, so wrapping
  // it is the only reliable interception point regardless of registration order.
  const previousOnerror = window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    if (isFromExtension(source) || isFromExtension(error?.stack)) {
      return true // returning true suppresses browser default + Turbopack forwarding
    }
    return previousOnerror ? previousOnerror(message, source, lineno, colno, error) : false
  }

  // addEventListener capture-phase listeners as belt-and-suspenders for the
  // dev overlay (which uses addEventListener rather than window.onerror).
  window.addEventListener(
    'error',
    (event) => {
      if (isFromExtension(event.filename) || isFromExtension((event.error as Error | undefined)?.stack)) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    },
    { capture: true }
  )

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason as { stack?: string } | undefined
      if (isFromExtension(reason?.stack)) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    },
    { capture: true }
  )

  // Patch console.error / console.warn. Turbopack's dev runtime forwards
  // console output to the terminal as "[browser] ..." even when no error
  // event fires (some extensions report failures via console.error directly).
  // Inspect each argument: if any string or Error stack points at an
  // extension URL, swallow the call.
  const containsExtensionRef = (arg: unknown): boolean => {
    if (typeof arg === 'string') return isFromExtension(arg)
    if (arg instanceof Error) return isFromExtension(arg.stack) || isFromExtension(arg.message)
    if (arg && typeof arg === 'object') {
      const obj = arg as { stack?: unknown; message?: unknown }
      if (typeof obj.stack === 'string' && isFromExtension(obj.stack)) return true
      if (typeof obj.message === 'string' && isFromExtension(obj.message)) return true
    }
    return false
  }

  const filterArgs = (original: (...args: unknown[]) => void) => {
    return (...args: unknown[]) => {
      if (args.some(containsExtensionRef)) return
      original(...args)
    }
  }
  console.error = filterArgs(console.error.bind(console))
  console.warn = filterArgs(console.warn.bind(console))
}

export {}
