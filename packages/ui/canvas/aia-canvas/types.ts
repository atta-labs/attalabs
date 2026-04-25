export interface Particle {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  baseOpacity: number
  angle: number
  cluster: number // index into current spheres array
}

export interface DirectMessage {
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number
  toSphereId: string
  speed?: number
}

export interface MatrixDrop {
  x: number
  y: number
  speed: number
  char: string
  life: number
  color: string
}

export interface RingChar {
  x: number
  y: number
  char: string
  life: number
  speed: number
  color: string
}
