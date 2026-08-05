import type { SphereRegistration } from '../aia-context'
import type { Particle } from './types'

export function createParticles(spheres: SphereRegistration[]): { particles: Particle[]; ids: string[] } {
  const particles: Particle[] = []
  spheres.forEach((sphere, idx) => {
    for (let i = 0; i < sphere.particleCount; i++) {
      const a = Math.random() * Math.PI * 2
      const r = sphere.radius * (0.9 + Math.random() * 0.3)
      particles.push({
        x: sphere.x + Math.cos(a) * r,
        y: sphere.y + Math.sin(a) * r,
        radius: Math.random() * 2 + 0.5,
        color: sphere.color,
        opacity: 0,
        baseOpacity: Math.random() * 0.25 + 0.2,
        angle: a,
        cluster: idx
      })
    }
  })
  return { particles, ids: spheres.map((s) => s.id) }
}

/** Direct positioning — particles orbit their sphere every frame. */
export function updateClusterOrbit(p: Particle, target: { x: number; y: number }, clusterRadius: number): void {
  p.angle += (Math.random() - 0.5) * 0.003
  p.x = target.x + Math.cos(p.angle) * clusterRadius + (Math.random() - 0.5) * 0.3
  p.y = target.y + Math.sin(p.angle) * clusterRadius + (Math.random() - 0.5) * 0.3
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  spheres: SphereRegistration[]
): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]!

    const sphere = spheres[p.cluster]
    if (!sphere) continue

    updateClusterOrbit(p, sphere, sphere.radius)

    // Hidden spheres: keep orbiting silently, reset opacity so they fade in on reveal
    if (sphere.visible === false) {
      p.opacity = 0
      continue
    }

    if (p.opacity < p.baseOpacity) p.opacity += 0.003
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    // Read the sphere's CURRENT colour, not the `p.color` captured at creation. Particles are
    // only rebuilt when the sphere id list changes, so a sphere whose colour comes from a
    // `var(--*)` token kept painting its particles in the colour that token had when the page
    // first rendered — after a colour-scheme flip that is the *previous* scheme's ink, which
    // on a dark background is invisible. The matrix rain never showed this because it
    // re-samples `sphere.color` on every spawn.
    ctx.fillStyle = sphere.color
    ctx.globalAlpha = p.opacity
    ctx.fill()
  }
}
