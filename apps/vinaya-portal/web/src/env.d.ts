declare module 'culori' {
  interface Color {
    mode: string
    l?: number
    c?: number
    h?: number
    alpha?: number
  }

  function parse(color: string): Color | undefined
  function converter(mode: string): (color: Color) => Color | undefined
}

// SVGR (`@svgr/webpack`, wired in next.config.ts) compiles a `*.svg` import
// into a React component instead of Next's default static-asset object.
declare module '*.svg' {
  import type { FC, SVGProps } from 'react'
  const Component: FC<SVGProps<SVGSVGElement>>
  export default Component
}
