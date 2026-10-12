/* Vāda's deliberation as real 3D, in the same scene as the fabric, laid out as a council: the
   reviewers sit on an arc at the back like a bench, and the Synthesizer — the hub every message
   goes through — sits large at the front over the dish, its status painted on its surface. Reviewers never talk to each other, so the only links are lines from
   the hub. Every reviewer is on the far side of the hub, so tipping the camera only spreads the
   arc out — nothing hides behind the hub.

   Every sphere is built like Vinaya's "main" core (`hero-canvas/harness-model.js`): the same
   cel-shaded ShaderMaterial over --card → --hero-core-shade → --hero-core-deep, the same
   back-side contour (no wire net — the spheres stay clean). Every core wears a spherical patch turned to the camera
   (main's label idiom): a reviewer's face, or the hub's status drawn by the scene.

   The story is scrubbed by scroll (`setScroll`), never looped:
     question  — a dot leaves the hub for every reviewer
     answers   — one at a time, a dot in each reviewer's colour comes back
     conclude  — the hub keeps its size (the caller leans the camera in); each spoke has already
                 closed into the hub behind its reviewer's answer
   Positions are fixed and the faces look straight at the camera. */

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const easeOut = (t) => 1 - (1 - t) ** 3
const smooth = (t) => t * t * (3 - 2 * t)
const seg = (p, a, b) => clamp01((p - a) / (b - a))

/* Scroll beats, in the scene's 0–1 track progress. */
export const Q_FROM = 0.08
export const Q_TO = 0.22
export const A_FROM = 0.24
export const A_TO = 0.5

/** Answers come back one at a time: agent i's dot travels in its own slice of the answer beat. */
export const ANSWER_SPAN = 0.3
export function answerProgress(back, i, count) {
  return seg(back, (i / count) * (1 - ANSWER_SPAN), (i / count) * (1 - ANSWER_SPAN) + ANSWER_SPAN)
}
/** Progress at which the deliberation concludes — the caller fires the shock wave here. */
export const CONCLUDE_AT = 0.66

/** How far a link leaves its reviewer turned toward the arc's middle, at most, and how far its
    curve holds that heading (a share of the link's length). */
const LINK_TURN = (40 * Math.PI) / 180
const LINK_REACH = 0.35

/** A message dot's radius, as a share of a reviewer sphere's. */
const DOT_RATIO = 0.11

const ARC = (150 * Math.PI) / 180 // the bench's spread, centred on the back (-z)

/** Angle of reviewer i on the arc (0 is straight back, -z). */
export const arcAngle = (i, count) => (count > 1 ? -ARC / 2 + (i / (count - 1)) * ARC : 0)

/**
 * @param THREE three.js namespace
 * @param {{ count: number, ringRadius: number, sphereRadius: number, driverRadius: number,
 *   y: number, card: string, shade: string, deep: string, ink: string, agentColors: string[] }} opts
 *   — `count` reviewers on the arc, left to right; colours as hex strings
 */
export function buildAgentRing(THREE, opts) {
  const { count, ringRadius: R, sphereRadius: r, driverRadius: dr, y } = opts
  const group = new THREE.Group()
  group.name = 'agent-ring'

  // THREE.Color already converts an sRGB hex into the linear working space — converting again
  // darkened every token, which is what made the spheres read as black
  const lin = (hex) => new THREE.Color(hex)
  const VDIR = new THREE.Vector3(0, 0.42, 1).normalize()
  const LD = new THREE.Vector3(-0.66, 0.56, 0.26).normalize()

  const sphereMat = new THREE.ShaderMaterial({
    name: 'agent-core-cel',
    uniforms: {
      uCard: { value: lin(opts.card) },
      uShade: { value: lin(opts.shade) },
      uDeep: { value: lin(opts.deep) },
      uL: { value: LD },
      uV: { value: VDIR }
    },
    vertexShader: `varying vec3 vN;
      void main(){ vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vN;
      uniform vec3 uCard, uShade, uDeep, uL, uV;
      void main(){
        vec3 n = normalize(vN); float d = dot(n, uL);
        float t = d > 0.55 ? 0.0 : d > 0.34 ? 0.10 : d > 0.14 ? 0.22 : 0.36;
        float facing = dot(n, uV);
        if (d < 0.0 && facing > 0.0 && facing < 0.17) t = 0.16;
        vec3 col = mix(mix(uCard, uShade, min(1.0, t * 1.1)), uDeep, t * 0.22);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`
  })
  // the rim: the hub keeps a gold one (it is where the verdict forms); each reviewer gets a faint
  // rim in its own colour, so it reads as a sphere rather than a cut-out disc. The hub's is kept
  // just as quiet — its text carries the hierarchy, not its border
  const rimMat = (color, opacity) =>
    new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: true, opacity, depthWrite: false })
  const contourMat = rimMat(opts.ink, 0.18)
  const sphereGeo = new THREE.SphereGeometry(1, 96, 64)
  const contourGeo = new THREE.SphereGeometry(1.009, 64, 48)
  // the face patch, centred on +z (the side main's spinner tips toward the camera)
  const PATCH = 2.2
  const patchGeo = new THREE.SphereGeometry(
    1.003,
    64,
    48,
    Math.PI / 2 - PATCH / 2,
    PATCH,
    Math.PI / 2 - PATCH / 2,
    PATCH
  )
  /* Map the texture straight on, as seen from the front, rather than by latitude and longitude:
     the patch's meridians converge, so a lat/long mapping leaned text and faces like italics
     toward the patch's sides. A planar mapping keeps the drawing upright and undistorted. */
  {
    const pos = patchGeo.attributes.position
    const uv = patchGeo.attributes.uv
    const half = Math.sin(PATCH / 2) * 1.003
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * half), 0.5 + pos.getY(i) / (2 * half))
    uv.needsUpdate = true
  }

  const makeCore = (radius, rim) => {
    const holder = new THREE.Group()
    holder.scale.setScalar(0.0001)
    holder.visible = false
    const body = new THREE.Group()
    body.scale.setScalar(radius)
    holder.add(body)
    body.add(new THREE.Mesh(sphereGeo, sphereMat))
    body.add(new THREE.Mesh(contourGeo, rim))
    const spinner = new THREE.Group()
    spinner.rotation.order = 'YXZ'
    body.add(spinner)
    group.add(holder)
    return { holder, spinner }
  }

  /* the driver */
  const driver = { ...makeCore(dr, contourMat), open: 0 }
  driver.holder.position.set(0, y, 0)
  // the hub's status, painted on the same kind of spherical patch the reviewers' faces use
  const hubFaceMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
  driver.spinner.add(new THREE.Mesh(patchGeo, hubFaceMat))

  /* the reviewers on the back arc, left to right (back is -z, the top of the screen top-down) */
  const agents = []
  for (let i = 0; i < count; i++) {
    const agentRim = rimMat(opts.agentColors[i] ?? opts.ink, 0.3)
    const core = makeCore(r, agentRim)
    const faceMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
    core.spinner.add(new THREE.Mesh(patchGeo, faceMat))

    agents.push({
      ...core,
      faceMat,
      agentRim,
      // the messages on this reviewer's link, drawn by the link itself (`links-2d.js`)
      question: 0,
      answer: 0,
      link: { S: new THREE.Vector3(), C: new THREE.Vector3(), H: new THREE.Vector3() },
      open: 0,
      angle: arcAngle(i, count)
    })
  }

  let revealed = 0
  let scroll = 0

  function setFaces(canvases) {
    canvases.forEach((cv, i) => {
      const ag = agents[i]
      if (!ag || !cv) return
      const tex = new THREE.CanvasTexture(cv)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      ag.faceMat.map?.dispose()
      ag.faceMat.map = tex
      ag.faceMat.opacity = 1
      ag.faceMat.needsUpdate = true
    })
  }

  /** The hub's status canvas; call again after redrawing it. */
  function setHubFace(cv) {
    if (!hubFaceMat.map) {
      const tex = new THREE.CanvasTexture(cv)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      hubFaceMat.map = tex
      hubFaceMat.opacity = 1
      hubFaceMat.needsUpdate = true
    } else hubFaceMat.map.needsUpdate = true
  }

  /** How many cores are up: 1 is the hub alone, 1 + count is everyone. */
  function setProgress(nextRevealed) {
    revealed = nextRevealed
  }

  /** Scroll progress of the hero track, 0–1. */
  function setScroll(p) {
    scroll = p
  }

  const camLocal = new THREE.Vector3()
  const faceCamera = (spinner) => {
    camLocal.copy(cameraPos)
    spinner.parent.worldToLocal(camLocal)
    spinner.lookAt(camLocal)
  }
  const cameraPos = new THREE.Vector3()
  const grow = (core, target, dt, reduced) => {
    core.open = reduced ? target : core.open + (target - core.open) * Math.min(1, dt * 6)
    const s = easeOut(clamp01(core.open))
    core.holder.visible = s > 0.01
    return s
  }

  /* Each link is a curve in the ring's own plane, in world space, so it turns with the scene
     like the spheres do and the camera never bends it. It runs from the reviewer's rim to the
     hub's rim, where the straight line between their centres meets it (so the links stay apart
     at the hub). A reviewer near the back of the arc leaves its sphere turned toward the arc's
     middle, by LINK_TURN at most, which keeps the line off the name pinned under the sphere, and
     the curve settles into the straight path to the hub. The turn fades out toward the arc's
     ends, where the straight line already clears the name. Mirror-image reviewers get
     mirror-image links. */
  const toHub = new THREE.Vector3()
  const leave = new THREE.Vector3()
  function placeLink(ag, a, agentR, hubR) {
    const { S, C, H } = ag.link
    toHub.set(-Math.sin(a), 0, Math.cos(a))
    const turn = LINK_TURN * smooth(clamp01((Math.cos(a) - 0.5) / 0.5))
    leave.copy(toHub)
    leave.x += Math.sign(-Math.sin(a)) * Math.tan(turn) * Math.abs(toHub.z)
    leave.normalize()
    S.copy(ag.holder.position).addScaledVector(leave, agentR)
    H.copy(driver.holder.position).addScaledVector(toHub, -hubR)
    C.copy(S).addScaledVector(leave, S.distanceTo(H) * LINK_REACH)
  }

  /** dt seconds, t seconds, camera (faces turn to it), reduced: snap everything open */
  function update(dt, _t, camera, reduced) {
    cameraPos.copy(camera.position)
    const p = scroll
    const out = seg(p, Q_FROM, Q_TO)
    const back = seg(p, A_FROM, A_TO)

    const ds = grow(driver, revealed >= 1 ? 1 : 0, dt, reduced)
    driver.holder.scale.setScalar(Math.max(0.0001, ds))
    faceCamera(driver.spinner)

    const rad = R

    agents.forEach((ag, i) => {
      const s = grow(ag, i + 1 < revealed ? 1 : 0, dt, reduced)
      const a = ag.angle
      ag.holder.position.set(Math.sin(a) * rad, y, -Math.cos(a) * rad)
      ag.holder.scale.setScalar(Math.max(0.0001, s))
      faceCamera(ag.spinner)

      placeLink(ag, a, r * s, dr * ds)

      // the question reaches each reviewer directly (the hub does not hand it out): its dot pops
      // up at the reviewer's end of the link while the question is out
      const up = s > 0.5 && out > 0 && out < 1
      ag.question = up ? smooth(clamp01(out / 0.25)) * (1 - smooth(clamp01((out - 0.8) / 0.2))) : 0
      // the answer travels the link back to the hub, 0 at the reviewer to 1 at the hub
      ag.answer = s > 0.5 ? smooth(answerProgress(back, i, count)) : 0
    })
  }

  function retheme({ card, shade, deep, ink, agentColors }) {
    sphereMat.uniforms.uCard.value = lin(card)
    sphereMat.uniforms.uShade.value = lin(shade)
    sphereMat.uniforms.uDeep.value = lin(deep)
    contourMat.color.set(ink)
    agents.forEach((ag, i) => {
      ag.agentRim.color.set(agentColors?.[i] ?? ink)
    })
  }

  /** World anchors for the HTML overlay: each core's centre and current radius, each reviewer's
      link as a world-space quadratic curve `{ S, C, H }` (reviewer end, bend, hub end), and its
      messages (`question` size and `answer` progress, both 0–1). `dotRatio` is a
      message dot's radius as a share of a reviewer's. */
  function anchors() {
    return {
      driver: { pos: driver.holder.position, radius: dr * driver.holder.scale.x },
      agents: agents.map((ag) => ({
        pos: ag.holder.position,
        radius: r * ag.holder.scale.x,
        question: ag.question,
        answer: ag.answer,
        link: ag.link
      })),
      dotRatio: DOT_RATIO
    }
  }

  return { group, update, setFaces, setHubFace, setProgress, setScroll, retheme, anchors }
}
