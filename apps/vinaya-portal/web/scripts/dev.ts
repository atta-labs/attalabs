import net from 'node:net'
import { spawn } from 'node:child_process'

// Portal owns 3007/3107, distinct from `apps/vinaya/web`'s 3006/3106. The
// split put two apps in one repo that render the same product under the same
// CMS theme, so a shared port pair is not a mild inconvenience: whichever app
// boots second silently lands on the other's fallback, and the two are close
// enough visually that the wrong one reads as the right one. Keep these
// distinct from every other app's pair until `apps/vinaya/web` is deleted.
const PRIMARY_PORT = 3007
const FALLBACK_PORT = 3107

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
