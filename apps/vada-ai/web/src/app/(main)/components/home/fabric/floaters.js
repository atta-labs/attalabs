/* The drifting squares: a sparse cloud of tiny square points that floats through a scene, the
   same "forge" dots the /life-cycle hero lives in, but filling the frame so they are there from
   the first shot instead of only once a camera swings round to them. Plain three.js points
   (square by default), drifting on slow sines. Every position is a pure function of time, so a
   scroll back replays the same frames, and under reduced motion the caller passes t = 0 and
   they hold still. No colour is written here: the caller hands in the theme's own token. */

/**
 * `maxSize` caps a square's on-screen size in CSS px (default 11). Points scale with 1/distance, so
 * without a cap a square drifting close to a tipped camera balloons into a block; the cap is a clamp
 * on `gl_PointSize` in the points vertex shader. `sideBand` thins the cloud out of a central column
 * of that half-width (world units): a sample landing there is kept only with probability
 * `centerChance` (default 0), so the squares gather at the sides of the frame with at most a few
 * in the middle. `keepOut` is a clear disc around `at` (default: the cloud's own x/z centre).
 *
 * @param {typeof import('three')} THREE_
 * @param {{
 *   count?: number, color: number | string, opacity?: number, size?: number, maxSize?: number,
 *   center: [number, number, number], extent: [number, number, number],
 *   keepOut?: { radius: number, at?: [number, number] },
 *   sideBand?: { halfWidth: number, centerChance?: number }, seed?: number,
 *   place?: (rnd: () => number) => [number, number, number]
 *   depthTest?: boolean (false: never hidden by the opaque fabric, for camera-attached squares)
 * }} opts
 */
// `place(rnd)` replaces the uniform box: it returns one candidate [x, y, z], so a caller can shape the
// cloud to a view (the hero fills the frustum at every depth). The keep-out disc and the side band
// still apply to its x/z.
export function buildFloaters(THREE_, opts) {
  const {
    count = 100,
    color,
    opacity = 0.3,
    size = 0.07,
    maxSize = 11,
    center,
    extent,
    keepOut,
    sideBand,
    seed = 7,
    place,
    depthTest = true
  } = opts

  let s = seed
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }

  const base = new Float32Array(count * 3)
  const phase = new Float32Array(count * 3)
  const amp = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    let x = 0
    let y = 0
    let z = 0
    // rejection-sample outside the keep-out disc (the hero's harness) and the central side band, a few tries then accept
    for (let tries = 0; tries < 24; tries++) {
      if (place) {
        ;[x, y, z] = place(rnd)
      } else {
        x = center[0] + (rnd() - 0.5) * extent[0]
        y = center[1] + (rnd() - 0.5) * extent[1]
        z = center[2] + (rnd() - 0.5) * extent[2]
      }
      const at = keepOut?.at ?? [center[0], center[2]]
      const clearOfDisc = !keepOut || Math.hypot(x - at[0], z - at[1]) > keepOut.radius
      const clearOfBand =
        !sideBand || Math.abs(x - center[0]) > sideBand.halfWidth || rnd() < (sideBand.centerChance ?? 0)
      if (clearOfDisc && clearOfBand) break
    }
    base[i * 3] = x
    base[i * 3 + 1] = y
    base[i * 3 + 2] = z
    phase[i * 3] = rnd() * Math.PI * 2
    phase[i * 3 + 1] = rnd() * Math.PI * 2
    phase[i * 3 + 2] = rnd() * Math.PI * 2
    amp[i] = 0.18 + rnd() * 0.42
  }

  const positions = new Float32Array(base)
  const geometry = new THREE_.BufferGeometry()
  const attr = new THREE_.BufferAttribute(positions, 3)
  geometry.setAttribute('position', attr)
  const material = new THREE_.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest,
    fog: false
  })
  // Clamp the attenuated size (device px) just before the depth chunk, once the shader has computed it.
  const maxPx = maxSize * Math.min(window.devicePixelRatio || 1, 2)
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMaxPx = { value: maxPx }
    shader.vertexShader = `uniform float uMaxPx;\n${shader.vertexShader.replace(
      '#include <logdepthbuf_vertex>',
      'gl_PointSize = min(gl_PointSize, uMaxPx);\n#include <logdepthbuf_vertex>'
    )}`
  }
  const points = new THREE_.Points(geometry, material)
  points.name = 'floaters'
  points.frustumCulled = false

  function update(t) {
    for (let i = 0; i < count; i++) {
      const a = amp[i]
      positions[i * 3] = base[i * 3] + Math.cos(t * 0.27 + phase[i * 3 + 1]) * a * 0.7
      positions[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.35 + phase[i * 3]) * a
      positions[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 0.21 + phase[i * 3 + 2]) * a * 0.5
    }
    attr.needsUpdate = true
  }
  update(0)

  return {
    points,
    update,
    retheme(next, nextOpacity) {
      material.color.set(next)
      if (nextOpacity !== undefined) material.opacity = nextOpacity
    }
  }
}
