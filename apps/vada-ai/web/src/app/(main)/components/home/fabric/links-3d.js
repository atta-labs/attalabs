import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

/* The hub's links, in the scene itself: one link per reviewer, and each link owns everything
   that travels on it — its line, the question dot that travels out to the reviewer, and the
   answer dot that travels back to the hub. The shape is each reviewer's world-space curve from
   `agent-ring-3d.js` (`placeLink`); the line and both dots are placed on that one curve, so a
   message can never leave its line. Being real geometry, a link turns with the scene, and the
   hub hides the stretch that runs behind it by depth, like any solid object — no overlay, no
   mask, and nothing redrawn outside WebGL.

   The links live in their own scene, drawn after the main one with the depth buffer cleared, so
   the fabric (which writes depth, and bulges up between the spheres as the camera tips) never
   hides them. In that scene each sphere has a depth-only stand-in, so the spheres still do. */

const SAMPLES = 32 // points along each line
const LINE_PX = 2
const DOT_RADIUS = 0.06 // world units
const LIVE_OPACITY = 0.7
const LANDED_OPACITY = 0.45
const FADE_S = 0.6 // colour and opacity ease when an answer lands

/**
 * @param THREE three.js namespace
 * @param {THREE.Group} group the scene group the links live in
 * @param {{ agentColors: number[], hubColor: number, muted: number }} colors hex colours
 * @param {number} dotOpacity messages are translucent touches, not solid balls
 */
export function buildLinks(THREE, count, colors, dotOpacity) {
  const scene = new THREE.Scene()
  const group = new THREE.Group()
  scene.add(group)
  // depth-only stand-ins for the hub and every reviewer
  const occluderGeo = new THREE.SphereGeometry(1, 48, 32)
  const occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false })
  const occluder = () => {
    const mesh = new THREE.Mesh(occluderGeo, occluderMat)
    mesh.renderOrder = -1
    scene.add(mesh)
    return mesh
  }
  const hubOccluder = occluder()
  const occluders = Array.from({ length: count }, occluder)

  const dotGeo = new THREE.SphereGeometry(DOT_RADIUS, 16, 12)
  const dotMat = (color) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: dotOpacity, depthWrite: false })
  const questionMat = dotMat(colors.hubColor)
  const live = new THREE.Color()
  const muted = new THREE.Color()

  const links = Array.from({ length: count }, (_, i) => {
    const material = new LineMaterial({
      color: colors.agentColors[i],
      linewidth: LINE_PX,
      worldUnits: false,
      transparent: true,
      opacity: LIVE_OPACITY,
      depthWrite: false
    })
    const geometry = new LineGeometry()
    geometry.setPositions(new Float32Array((SAMPLES + 1) * 3))
    const line = new Line2(geometry, material)
    line.visible = false
    const question = new THREE.Mesh(dotGeo, questionMat)
    const answerMat = dotMat(colors.agentColors[i])
    const answer = new THREE.Mesh(dotGeo, answerMat)
    question.visible = answer.visible = false
    // the dots draw over their line, never under it
    line.renderOrder = 1
    question.renderOrder = answer.renderOrder = 2
    group.add(line, question, answer)
    return { line, geometry, material, question, answer, answerMat, color: colors.agentColors[i], landed: 0, key: '' }
  })

  const at = new THREE.Vector3()
  const pointOn = ({ S, C, H }, t, out) => {
    const u = 1 - t
    return out
      .copy(S)
      .multiplyScalar(u * u)
      .addScaledVector(C, 2 * u * t)
      .addScaledVector(H, t * t)
  }
  const points = new Float32Array((SAMPLES + 1) * 3)

  /**
   * Once per frame, before `scene` is drawn. `driver` and `agents` are the ring's anchors (each with its `link` curve, `radius`,
   * `question` and `answer` progress); `landed[i]` says reviewer i's answer has reached the
   * hub; `hubUp` that the hub is showing; `size` is the canvas in CSS px.
   */
  function update(driver, agents, landed, dt, reduced, size) {
    const hubUp = driver.radius > 0.01
    hubOccluder.visible = hubUp
    hubOccluder.position.copy(driver.pos)
    hubOccluder.scale.setScalar(Math.max(0.0001, driver.radius))
    agents.forEach((ag, i) => {
      occluders[i].visible = ag.radius > 0.01
      occluders[i].position.copy(ag.pos)
      occluders[i].scale.setScalar(Math.max(0.0001, ag.radius))
      const link = links[i]
      const up = hubUp && ag.radius > 0.01
      link.line.visible = up
      if (!up) {
        link.question.visible = link.answer.visible = false
        return
      }
      // the curve only changes while a sphere is growing in — rebuild the line only then
      const { S, H } = ag.link
      const key = `${S.x.toFixed(4)},${S.z.toFixed(4)},${H.x.toFixed(4)},${H.z.toFixed(4)}`
      if (key !== link.key) {
        link.key = key
        for (let k = 0; k <= SAMPLES; k++) {
          pointOn(ag.link, k / SAMPLES, at)
          points[k * 3] = at.x
          points[k * 3 + 1] = at.y
          points[k * 3 + 2] = at.z
        }
        link.geometry.setPositions(points)
      }
      link.material.resolution.set(size.width, size.height)

      // in the reviewer's colour until its answer lands, then muted for good
      const target = landed[i] ? 1 : 0
      link.landed = reduced
        ? target
        : link.landed + Math.sign(target - link.landed) * Math.min(Math.abs(target - link.landed), dt / FADE_S)
      live.set(link.color)
      link.material.color.copy(live.lerp(muted, link.landed))
      link.material.opacity = LIVE_OPACITY + (LANDED_OPACITY - LIVE_OPACITY) * link.landed

      // the question travels hub → reviewer, the answer reviewer → hub, on the same curve
      link.question.visible = ag.question > 0 && ag.question < 1
      if (link.question.visible) pointOn(ag.link, 1 - ag.question, link.question.position)
      link.answer.visible = ag.answer > 0 && ag.answer < 1
      if (link.answer.visible) pointOn(ag.link, ag.answer, link.answer.position)
    })
  }

  function retheme({ agentColors, hubColor, muted: mutedColor }) {
    muted.set(mutedColor)
    questionMat.color.set(hubColor)
    links.forEach((link, i) => {
      link.color = agentColors[i]
      link.answerMat.color.set(agentColors[i])
    })
  }
  retheme(colors)

  function dispose() {
    dotGeo.dispose()
    occluderGeo.dispose()
    occluderMat.dispose()
    questionMat.dispose()
    for (const link of links) {
      link.geometry.dispose()
      link.material.dispose()
      link.answerMat.dispose()
    }
  }

  return { scene, update, retheme, dispose }
}
