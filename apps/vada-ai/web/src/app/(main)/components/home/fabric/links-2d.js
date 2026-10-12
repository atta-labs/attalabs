/* The hub's links, drawn in 2D over the scene: one link per reviewer, and each link owns
   everything that travels on it — its line, the question dot that lands at the reviewer, and the
   answer dot that travels back to the hub. The link's shape is a curve in the scene's own 3D
   space (`agent-ring-3d.js`, `placeLink`); this file only projects it. The line and its dots are
   placed from that one projection, so a message can never leave its line, and the camera
   moving never reshapes it.

   The overlay sits above the WebGL canvas, so it cannot depth-test against the spheres. Every
   reviewer sits behind the hub, and each link ends on the hub's equator, so once the camera tips
   the stretch next to the hub runs behind the hub's upper half. A mask cuts the lines and the
   answer dots wherever the hub's disc covers them on screen, so the hub hides its links the way
   a solid sphere would. Nothing on a link is ever in front of the hub, so the disc is exact. */

const SVG_NS = 'http://www.w3.org/2000/svg'
const SAMPLES = 24 // points per projected line
const FAR = 1e5 // the mask's extent, px — larger than any screen

let maskCount = 0
const f = (n) => n.toFixed(1)

const svgEl = (tag, attrs, parent) => {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  parent.appendChild(node)
  return node
}

/**
 * Builds the links into `svg`. `reviewerTokens` are the reviewers' colour variables, in order;
 * `hubToken` colours the question. Returns `setHub(hub)` (the hub's screen disc `{ x, y, r }`,
 * or null while it is down), `place(i, along, state)` for each frame, where `along(t)` is the
 * link's screen point at t (0 at the reviewer, 1 at the hub), and `hide(i)` while either sphere
 * is down.
 */
export function buildLinks(svg, reviewerTokens, hubToken, dotOpacity) {
  // the mask: everything shows, except inside the hub's disc
  const maskId = `hero-links-mask-${maskCount++}`
  const defs = svgEl('defs', {}, svg)
  const area = { x: String(-FAR), y: String(-FAR), width: String(2 * FAR), height: String(2 * FAR) }
  const mask = svgEl('mask', { id: maskId, maskUnits: 'userSpaceOnUse', ...area }, defs)
  svgEl('rect', { ...area, fill: 'white' }, mask)
  const hubDisc = svgEl('circle', { fill: 'black', r: '0' }, mask)
  const behindHub = svgEl('g', { mask: `url(#${maskId})` }, svg)

  const links = reviewerTokens.map((token) => {
    const line = svgEl(
      'path',
      { fill: 'none', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      behindHub
    )
    line.style.stroke = `var(${token})`
    line.style.transition = 'stroke 600ms ease-out, opacity 600ms ease-out'
    const answer = svgEl('circle', { 'fill-opacity': String(dotOpacity) }, behindHub)
    answer.style.fill = `var(${token})`
    const question = svgEl('circle', { 'fill-opacity': String(dotOpacity) }, svg)
    question.style.fill = `var(${hubToken})`
    return { line, question, answer, token }
  })

  const showDot = (dot, at, r) => {
    dot.style.display = r > 0.1 ? '' : 'none'
    if (r <= 0.1) return
    dot.setAttribute('cx', f(at.x))
    dot.setAttribute('cy', f(at.y))
    dot.setAttribute('r', f(r))
  }

  function setHub(hub) {
    hubDisc.setAttribute('cx', f(hub?.x ?? 0))
    hubDisc.setAttribute('cy', f(hub?.y ?? 0))
    hubDisc.setAttribute('r', f(hub?.r ?? 0))
  }

  /**
   * state: { question: 0–1 (its dot's size at the reviewer), answer: 0–1 (how far back to the hub
   * its dot has come; 0 or 1 hides it), landed: the answer has reached the hub, dot: px radius }
   */
  function place(i, along, state) {
    const link = links[i]
    let d = ''
    for (let k = 0; k <= SAMPLES; k++) {
      const p = along(k / SAMPLES)
      d += `${k === 0 ? 'M' : 'L'} ${f(p.x)} ${f(p.y)} `
    }
    link.line.setAttribute('d', d)
    link.line.style.stroke = state.landed ? 'var(--muted-foreground)' : `var(${link.token})`
    link.line.style.opacity = state.landed ? '0.45' : '0.7'
    showDot(link.question, along(0), state.dot * state.question)
    const travelling = state.answer > 0 && state.answer < 1
    showDot(link.answer, along(state.answer), travelling ? state.dot : 0)
  }

  function hide(i) {
    const link = links[i]
    link.line.style.opacity = '0'
    link.question.style.display = 'none'
    link.answer.style.display = 'none'
  }

  return { setHub, place, hide }
}
