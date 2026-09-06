/* UNDER THE FABRIC — the beam, and nothing else.
   One electrified shaft threaded up into main, a sparse cosmos around it, and dark.
   Deliberately minimal: three elements, no rings, no rain, no mirrored world.
   Colours are design-system tokens only — the palette simply inverts below the membrane. */
import * as THREE from 'three'

/* a vertical gradient used as an alphaMap, so the shaft dissolves into the dark
   instead of ending on a cut */
function fadeMap(THREE_, stops) {
  const cv = document.createElement('canvas')
  cv.width = 4
  cv.height = 256
  const g = cv.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 256)
  for (const [at, a] of stops) grad.addColorStop(at, `rgba(255,255,255,${a})`)
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const tex = new THREE_.CanvasTexture(cv)
  tex.wrapS = THREE_.RepeatWrapping
  tex.wrapT = THREE_.RepeatWrapping
  return tex
}

/* a dashed strip that scrolls along a tube — current crawling the shaft */
function dashMap(THREE_) {
  const cv = document.createElement('canvas')
  cv.width = 8
  cv.height = 128
  const g = cv.getContext('2d')
  g.clearRect(0, 0, 8, 128)
  g.fillStyle = 'rgba(255,255,255,1)'
  for (const [y, h] of [[4, 26], [46, 12], [70, 34], [116, 8]]) g.fillRect(0, y, 8, h)
  const tex = new THREE_.CanvasTexture(cv)
  tex.wrapS = THREE_.RepeatWrapping
  tex.wrapT = THREE_.RepeatWrapping
  return tex
}

/* a soft camera-facing glow: bright at the axis, transparent at the edges, fading with
   depth. A cylinder cannot fade radially, which is why the sheath read as a flat slab. */
function glowMap(THREE_) {
  const cv = document.createElement('canvas')
  cv.width = 128
  cv.height = 256
  const g = cv.getContext('2d')
  for (let y = 0; y < 256; y++) {
    const v = 1 - y / 255
    const depthFade = Math.pow(v, 0.9)
    const grad = g.createLinearGradient(0, 0, 128, 0)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(0.5, `rgba(255,255,255,${(0.85 * depthFade).toFixed(3)})`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, y, 128, 1)
  }
  const tex = new THREE_.CanvasTexture(cv)
  return tex
}

export function buildBeam(THREE_ = THREE, opts = {}) {
  const ink = opts.ink
  const sand = opts.sand
  const card = opts.card
  if (ink === undefined || sand === undefined || card === undefined) {
    throw new Error('buildBeam: ink/sand/card tokens are required')
  }
  const topY = opts.topY ?? 0            // inside main
  const depth = opts.depth ?? 34         // how far down it runs
  const r = opts.radius ?? 0.13

  const group = new THREE_.Group()
  group.name = 'underworld-beam'
  const midY = topY - depth / 2

  /* The void must live ENTIRELY under the sheet: its rim sits inside the fabric's radius
     and its top just under the fabric's own level, so from above — and along the horizon —
     the light world is completely unchanged. */
  const rimR = opts.rimRadius ?? 8.0        // must be < the fabric's radius, so the sheet overhangs it
  const cavern = new THREE_.Mesh(
    new THREE_.CylinderGeometry(rimR, rimR, 80, 48, 1, true),
    new THREE_.MeshBasicMaterial({ color: ink, side: THREE_.BackSide })
  )
  cavern.name = 'void'
  cavern.position.y = -0.02 - 40             // top just BELOW the fabric's own level
  group.add(cavern)
  const vfloor = new THREE_.Mesh(new THREE_.CircleGeometry(rimR, 48), new THREE_.MeshBasicMaterial({ color: ink }))
  vfloor.name = 'void-floor'
  vfloor.rotation.x = -Math.PI / 2
  vfloor.position.y = -0.02 - 80
  group.add(vfloor)

  /* the shaft: sheath, body, filament — all fading out with depth */
  const fade = fadeMap(THREE_, [[0, 1], [0.55, 0.85], [1, 0]])
  const shaft = (rr, color, opacity, name) => {
    const m = new THREE_.Mesh(
      new THREE_.CylinderGeometry(rr, rr, depth, 44, 1, true),
      new THREE_.MeshBasicMaterial({
        color, transparent: true, opacity, alphaMap: fade, side: THREE_.DoubleSide, depthWrite: false
      })
    )
    m.name = name
    m.position.y = midY
    group.add(m)
    return m
  }
  shaft(r, sand, 0.9, 'beam-body')
  shaft(r * 0.36, card, 1, 'beam-filament')

  /* the glow, as a camera-facing quad */
  const glow = new THREE_.Mesh(
    new THREE_.PlaneGeometry(r * 9, depth),
    new THREE_.MeshBasicMaterial({
      color: sand, map: glowMap(THREE_), transparent: true, opacity: 0.5,
      blending: THREE_.AdditiveBlending, depthWrite: false, side: THREE_.DoubleSide
    })
  )
  glow.name = 'beam-glow'
  glow.position.y = midY
  group.add(glow)

  /* electricity crawling it — helical tubes with a scrolling dash */
  const dash = dashMap(THREE_)
  const arcs = []
  for (let b = 0; b < 3; b++) {
    const pts = []
    const turns = 2.1 + b * 0.9
    for (let i = 0; i <= 120; i++) {
      const t = i / 120
      const a = t * Math.PI * 2 * turns + b * 2.1
      const rr = r * (1.5 + 0.5 * Math.sin(t * 9 + b))
      pts.push(new THREE_.Vector3(Math.cos(a) * rr, topY - t * depth * 0.72, Math.sin(a) * rr))
    }
    const tex = dash.clone()
    tex.needsUpdate = true
    tex.wrapS = THREE_.RepeatWrapping
    tex.wrapT = THREE_.RepeatWrapping
    tex.repeat.set(9, 1)          // u runs ALONG a tube, so the dash must repeat on u
    const arc = new THREE_.Mesh(
      new THREE_.TubeGeometry(new THREE_.CatmullRomCurve3(pts), 260, 0.011, 5, false),
      new THREE_.MeshBasicMaterial({
        color: b === 0 ? card : sand, transparent: true, opacity: 0.9,
        alphaMap: tex, depthWrite: false
      })
    )
    arc.name = `beam-current-${b}`
    group.add(arc)
    arcs.push({ mesh: arc, tex, speed: 0.22 + b * 0.16 })
  }

  /* the cosmos: sparse points, nothing more */
  const COUNT = 150
  const pos = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) {
    const rr = 1.5 + Math.pow(Math.abs(Math.sin(i * 12.9898)), 0.6) * (rimR * 0.8)
    const a = (i * 2.399) % (Math.PI * 2)
    pos[i * 3] = Math.cos(a) * rr
    pos[i * 3 + 1] = topY - 0.8 - ((i * 37) % 100) / 100 * depth * 0.8
    pos[i * 3 + 2] = Math.sin(a) * rr
    sizes[i] = 0.03 + ((i * 53) % 100) / 100 * 0.07
  }
  const starGeo = new THREE_.BufferGeometry()
  starGeo.setAttribute('position', new THREE_.BufferAttribute(pos, 3))
  starGeo.setAttribute('aSize', new THREE_.BufferAttribute(sizes, 1))
  const starMat = new THREE_.ShaderMaterial({
    name: 'cosmos',
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new THREE_.Color().setHex(sand, THREE_.LinearSRGBColorSpace) }, uTime: { value: 0 }, uScale: { value: 900 } },
    vertexShader: `
      attribute float aSize;
      varying float vTw;
      uniform float uTime;
      uniform float uScale;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vTw = 0.45 + 0.55 * sin(uTime * 1.4 + position.x * 3.0 + position.z * 2.0);
        gl_PointSize = aSize * uScale / max(1.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vTw;
      void main() {
        vec2 d = gl_PointCoord - vec2(0.5);
        float m = smoothstep(0.5, 0.0, length(d));
        gl_FragColor = vec4(uColor, m * vTw);
      }`
  })
  const stars = new THREE_.Points(starGeo, starMat)
  stars.name = 'cosmos'
  group.add(stars)

  function update(t, camera) {
    for (const a of arcs) a.tex.offset.x = (-t * a.speed) % 1
    starMat.uniforms.uTime.value = t
    if (camera) {
      // the glow quad always turns its face to the viewer, but stays vertical
      glow.rotation.y = Math.atan2(camera.position.x - glow.position.x, camera.position.z - glow.position.z)
    }
  }

  /* theme switch: repaint in place — never rebuild (see hero-scene.js). Each basic material
     is tagged once with the token its colour came from; retheme() repaints by tag plus the
     cosmos shader's uniform. */
  {
    const ref = { ink: new THREE_.Color(ink), sand: new THREE_.Color(sand), card: new THREE_.Color(card) }
    group.traverse((o) => {
      const m = o.material
      if (!m || m.isShaderMaterial || !m.color) return
      for (const k in ref) {
        if (m.color.equals(ref[k])) {
          m.userData.tint = k
          break
        }
      }
    })
  }
  function retheme(next) {
    group.traverse((o) => {
      const m = o.material
      if (m?.userData?.tint) m.color.setHex(next[m.userData.tint])
    })
    starMat.uniforms.uColor.value.setHex(next.sand, THREE_.LinearSRGBColorSpace)
  }
  return { group, update, retheme, materials: { starMat } }
}
