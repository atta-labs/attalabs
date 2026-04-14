/**
 * Triple-harmonic wave value for a normalized position along a segment.
 *
 * Three layered sines at the fundamental frequency plus two harmonics,
 * weighted 0.6 / 0.3 / 0.1. The result is unitless — multiply by amplitude
 * and an envelope in the caller.
 *
 * Used by: ring-styles/wave.ts (canvas ring), assistant-wave.tsx (standalone SVG)
 *
 * @param normX  Position along the wave segment, 0–1.
 * @param freq   Base frequency in cycles per segment.
 * @param t      Time accumulator (advances each frame via wave.speed).
 * @param phase  Per-wave phase offset so layers don't start in sync.
 */
export function harmonicWave(normX: number, freq: number, t: number, phase: number): number {
  const base = normX * Math.PI * 2
  return (
    Math.sin(base * freq + t + phase) * 0.6 +
    Math.sin(base * freq * 1.7 + t * 1.3 + phase * 0.7) * 0.3 +
    Math.sin(base * freq * 0.5 + t * 0.7 + phase * 1.4) * 0.1
  )
}
