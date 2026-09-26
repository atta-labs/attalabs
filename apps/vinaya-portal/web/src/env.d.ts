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
