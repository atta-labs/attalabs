import net from 'node:net'
import { spawn } from 'node:child_process'

// Studio owns 3008/3108, distinct from `apps/vinaya/web`'s 3006/3106 and
// `apps/vinaya-portal/web`'s 3007/3107. Three apps under the same CMS theme
// serving the same product are easy to confuse — keep the pairs distinct
// until `apps/vinaya/web` is deleted (task 4/#886).
const PRIMARY_PORT = 3008
const FALLBACK_PORT = 3108

/** Tries to bind `port` on all interfaces — free if the bind succeeds, taken if it
 * errors (almost always EADDRINUSE). Closes the probe server either way. */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
    tester.once('error', () => resolve(false))
    tester.once('listening', () => tester.close(() => resolve(true)))
    tester.listen(port, '0.0.0.0')
  })
}

const port = (await isPortFree(PRIMARY_PORT)) ? PRIMARY_PORT : FALLBACK_PORT
if (port === FALLBACK_PORT) {
  console.log(`[dev] port ${PRIMARY_PORT} is taken — falling back to ${FALLBACK_PORT}`)
}

const child = spawn('next', ['dev', '--turbopack', '--port', String(port)], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
