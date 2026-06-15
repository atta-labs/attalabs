export type JdInputKind = 'text' | 'url'
export type CvInputKind = 'text' | 'markdown' | 'pdf' | 'profile'

export type JdInput = { kind: 'text'; value: string } | { kind: 'url'; value: string }

export type CvInput =
  | { kind: 'text'; value: string }
  | { kind: 'markdown'; value: string }
  | { kind: 'pdf'; value: string }
  | { kind: 'profile'; value: string }

export interface ResolvedJd {
  kind: JdInputKind
  text: string
  sourceLabel: string
}

export interface ResolvedCv {
  kind: CvInputKind
  text: string
  username: string | null
  candidateLabel: string
}
