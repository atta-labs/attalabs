import net from 'node:net'
import { spawn } from 'node:child_process'

const PRIMARY_PORT = 3006
const FALLBACK_PORT = 3106

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
