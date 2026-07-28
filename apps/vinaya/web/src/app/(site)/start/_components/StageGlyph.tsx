import type { ReactNode, SVGProps } from 'react'
import type { StageId } from '../_lib/stages'

/**
 * One parameterised glyph, not seven bespoke marks — `StageGlyph` draws a
 * single stage's own picture: what it receives (left), what it does
 * (center), what it hands on (right). Each glyph is meaningful read alone,
 * on that stage's own page; the overview (`LoopComposition.tsx`) composes
 * the same seven read-only glyphs into the loop's real shape rather than
 * cropping one master image.
 *
 * Bespoke-SVG precedent: `(site)/roadmap/_components/RoadmapMarks.tsx`.
 * Same two rules apply — these are diagrams, not icons (each draws the
 * SHAPE of the hand-off, not a generic glyph standing in for it), and
 * monoline `currentColor` only, so every glyph inherits the surrounding
 * text token and stays theme-correct in every library and colour scheme.
 *
 * The shapes are hand-authored from `_lib/stages.ts`'s `receives`/`produces`
 * copy, which is itself read from the doctrine's contract files — never
 * derived from a live model at runtime (Issue #696's explicit OUT clause).
 * Where an artifact crosses a seam unchanged, the SAME shape is reused on
 * both sides of it: Brief's output ticket is Develop's input ticket; the
 * open pull request Develop produces is what Review and Security both
 * receive; only Archive's copy of it gains the merged accent.
 */

/**
 * ---------------------------------------------------------------------------
 * The approved design port ("Vinaya loop.dc.html", 2026-07-28).
 *
 * The geometry below is COPIED from the design file's markup — every `d`
 * attribute, `viewBox`, radius and transform is verbatim, per the port
 * brief: the design owns WHAT is drawn; this file only owns how it is
 * wrapped in React. Do not re-draw, simplify or "clean up" a path — a mark
 * that merely looks similar is a failed port, and review diffs the `d`
 * strings against the design source.
 *
 * `MarkDefs` must be mounted exactly ONCE per page (the `#v-*` ids are
 * document-global); every `<use href='#v-…'>` in the diagrams below
 * resolves against it. Stage pages mount it through `StagePage`; the
 * overview mounts it through `LoopComposition`.
 * ---------------------------------------------------------------------------
 */

export type NounId = 'intent' | 'task' | 'tranche' | 'brief' | 'pr' | 'verdict' | 'record' | 'retro'

/** The design's shared defs: two arrowhead markers plus the eight noun
 * marks. Geometry verbatim from the design file's `<defs>` block. */
export function MarkDefs() {
  return (
    <svg width='0' height='0' className='absolute overflow-hidden' aria-hidden>
      <defs>
        <marker
          id='v-ah'
          viewBox='0 0 10 10'
          refX='8.5'
          refY='5'
          markerWidth='7'
          markerHeight='7'
          orient='auto-start-reverse'
        >
          <path d='M0 1 L9 5 L0 9 z' fill='currentColor' stroke='none' />
        </marker>
        <marker
          id='v-ah-thin'
          viewBox='0 0 10 10'
          refX='8.5'
          refY='5'
          markerWidth='5.5'
          markerHeight='5.5'
          orient='auto-start-reverse'
        >
          <path d='M0 1.5 L9 5 L0 8.5 z' fill='currentColor' stroke='none' />
        </marker>

        <g id='v-intent' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M0 8c14-9 24 9 40 0s26-9 44 0' />
          <path d='M0 31c16-9 26 9 44 0s32-9 56 0' />
          <path d='M0 54c12-9 22 9 36 0s22-9 38 0' />
        </g>

        <g id='v-task' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <rect x='0' y='0' width='132' height='88' rx='6' />
          <path d='M16 24h72' />
          <path d='M16 44v28' />
          <path d='M28 48h84' />
          <path d='M28 64h60' />
          <circle cx='0' cy='44' r='4.5' />
          <circle cx='132' cy='44' r='4.5' />
        </g>

        <g
          id='v-tranche'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <rect x='0' y='0' width='236' height='216' rx='10' />
          <path d='M22 24l13 13-13 13-13-13z' />
          <path d='M50 37h124' />
          <path d='M0 62h236' />
          <rect x='34' y='76' width='182' height='36' rx='5' />
          <path d='M50 88h94' />
          <path d='M50 100h58' />
          <rect x='34' y='124' width='182' height='36' rx='5' />
          <path d='M50 136h108' />
          <path d='M50 148h44' />
          <rect x='34' y='172' width='182' height='36' rx='5' />
          <path d='M50 184h80' />
          <path d='M50 196h66' />
          <path d='M18 114v8' markerEnd='url(#v-ah-thin)' />
          <path d='M18 162v8' markerEnd='url(#v-ah-thin)' />
        </g>

        <g id='v-brief' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <rect x='0' y='0' width='156' height='236' rx='6' />
          <path d='M18 26h92' />
          <path d='M0 44h156' />
          <rect x='18' y='58' width='9' height='9' />
          <path d='M36 63h66' />
          <path d='M18 82h122' />
          <path d='M18 94h134' />
          <path d='M18 106h96' />
          <rect x='18' y='120' width='9' height='9' />
          <path d='M36 125h78' />
          <path d='M18 144h130' />
          <path d='M18 156h112' />
          <path d='M18 168h134' />
          <rect x='18' y='182' width='9' height='9' />
          <path d='M36 187h52' />
          <path d='M18 206h118' />
          <path d='M18 218h74' />
        </g>

        <g id='v-pr' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <rect x='0' y='0' width='268' height='216' rx='10' />
          <path d='M26 14v38' />
          <circle cx='26' cy='58' r='7' />
          <circle cx='78' cy='18' r='7' />
          <path d='M78 25v10a16 16 0 0 1-16 16h-27' />
          <path d='M100 34h132' />
          <path d='M0 78h268' />
          <path d='M24 100h108' />
          <path d='M40 118h92' />
          <path d='M40 134h64' />
          <path d='M24 152h100' />
          <use href='#v-brief' transform='translate(160,90) scale(0.44)' />
        </g>

        <g
          id='v-verdict'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <rect x='0' y='0' width='186' height='100' rx='8' />
          <path d='M28 100v20l26-20' />
          <circle cx='22' cy='26' r='5.5' />
          <path d='M40 26h66' />
          <path d='M20 52h146' />
          <path d='M20 72h114' />
        </g>

        <g id='v-record' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <rect x='0' y='0' width='236' height='176' rx='6' />
          <path d='M18 20h104' />
          <path d='M0 34h236' />
          <path d='M0 40h236' />
          <use href='#v-intent' transform='translate(16,54) scale(0.3)' />
          <use href='#v-task' transform='translate(16,84) scale(0.24)' />
          <use href='#v-brief' transform='translate(16,116) scale(0.2)' />
          <use href='#v-verdict' transform='translate(70,116) scale(0.22)' />
          <path d='M60 62h22' markerEnd='url(#v-ah-thin)' />
          <path d='M52 96h30' markerEnd='url(#v-ah-thin)' />
          <path d='M52 140h108' markerEnd='url(#v-ah-thin)' />
          <path d='M118 62h44' />
          <path d='M118 96h44' />
          <path d='M162 56v90' />
          <circle cx='196' cy='132' r='20' />
          <circle cx='196' cy='132' r='12' />
          <path d='M190 132l5 5 8-10' />
        </g>

        <g id='v-retro' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <rect x='0' y='0' width='256' height='172' rx='6' />
          <path d='M18 24h112' />
          <path d='M0 44h256' />
          <path d='M20 68l7 8 13-16' />
          <path d='M20 106h48' />
          <path d='M20 124h34' />
          <path d='M104 60l18 18' />
          <path d='M104 106h48' />
          <path d='M104 124h30' />
          <path d='M188 70h20' markerEnd='url(#v-ah-thin)' />
          <path d='M188 106h48' />
          <path d='M188 124h38' />
          <path d='M92 56v88' />
          <path d='M176 56v88' />
        </g>
      </defs>
    </svg>
  )
}

/** Per-noun display data — labels, one-liners and the exact placement
 * transform each mark carries in the design's vocabulary grid. */
export const NOUNS: Record<NounId, { label: string; description: string; transform: string }> = {
  intent: {
    label: 'Intent',
    description: "A person's idea, in prose — vague, unstructured",
    transform: 'translate(30,36)'
  },
  task: {
    label: 'Task issue',
    description: 'One unit of work, carrying its reasoning and its dependencies',
    transform: 'translate(34,21)'
  },
  tranche: {
    label: 'Tranche',
    description: 'One milestone with its task issues under it',
    transform: 'translate(41,7) scale(0.54)'
  },
  brief: {
    label: 'Brief',
    description: 'The whole work order: exact files, exact tests, when to stop and ask',
    transform: 'translate(58,7) scale(0.5)'
  },
  pr: {
    label: 'Pull request',
    description: 'Code, with the brief that produced it riding inside',
    transform: 'translate(23,11) scale(0.58)'
  },
  verdict: {
    label: 'Verdict',
    description: "A review's findings, posted as a comment",
    transform: 'translate(34,17) scale(0.72)'
  },
  record: {
    label: 'Provenance record',
    description: 'What shipped, from what intent, reviewed by whom — kept on the merged PR',
    transform: 'translate(31,9) scale(0.58)'
  },
  retro: {
    label: 'Retrospective',
    description: 'What completed, what was dropped, what carries forward',
    transform: 'translate(31,22) scale(0.54)'
  }
}

export type NounMarkProps = {
  noun: NounId
  className?: string
}

/** One noun's mark, framed the way the design's vocabulary grid frames it.
 * Requires `MarkDefs` mounted on the same page. */
export function NounMark({ noun, className }: NounMarkProps) {
  return (
    <svg
      viewBox='0 0 200 130'
      className={className}
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <use href={`#v-${noun}`} transform={NOUNS[noun].transform} />
    </svg>
  )
}

/** The design's one-line in/out summary for each stage — shown beside the
 * stage title, stating what goes in and what comes out before the diagram
 * says it in shapes. Copy verbatim from the design's stage headers. */
export const STAGE_IN_OUT: Record<StageId, string> = {
  plan: 'an intent in prose goes in — a tranche of reasoned task issues comes out',
  brief: 'one task issue goes in — the same task, in full depth, comes out',
  develop: 'a brief goes in — a pull request with that brief still attached comes out',
  review: 'the open pull request goes in — a verdict comes out; review does not merge',
  security: 'the same pull request, at the same time — a second, separate verdict comes out',
  archive: 'a merged pull request goes in — a provenance record on it, and a closed issue, come out',
  'wrap-up': 'a finished tranche goes in — a retrospective and a closed milestone come out'
}

/** The seven per-stage diagrams — each an IN column, a labelled
 * transformation, and an OUT column, built from the noun marks above.
 * Every path, transform and label is verbatim from the design's stage
 * articles. Reuse is the story: a stage's output mark IS the next stage's
 * input mark. */
const STAGE_DIAGRAMS: Record<StageId, { viewBox: string; content: ReactNode }> = {
  plan: {
    viewBox: '0 0 800 340',
    content: (
      <>
        <text x='40' y='24' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          IN
        </text>
        <text x='452' y='24' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          OUT
        </text>
        <use href='#v-intent' transform='translate(40,140)' />
        <text x='40' y='252' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Intent
        </text>
        <text x='40' y='276' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          one person, describing
        </text>
        <text x='40' y='296' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          what they want
        </text>
        <path d='M186 168c60 0 60-70 118-70' markerEnd='url(#v-ah)' />
        <path d='M186 172c70 0 60 46 118 46' markerEnd='url(#v-ah)' />
        <path d='M186 176c80 0 60 114 118 114' markerEnd='url(#v-ah)' />
        <text
          x='252'
          y='326'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          FANS OUT
        </text>
        <use href='#v-tranche' transform='translate(452,42)' />
        <text x='452' y='292' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Tranche
        </text>
        <text x='452' y='314' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          one milestone; each task carries why it is
        </text>
        <text x='452' y='332' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          that size, what it touches, what it waits on
        </text>
      </>
    )
  },
  brief: {
    viewBox: '0 0 800 340',
    content: (
      <>
        <text x='40' y='24' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          IN
        </text>
        <text x='470' y='24' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          OUT
        </text>
        <use href='#v-task' transform='translate(40,116)' />
        <text x='40' y='240' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Task issue
        </text>
        <text x='40' y='264' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          one item from the tranche
        </text>
        <path d='M212 160h34' markerEnd='url(#v-ah)' />
        <path d='M266 116v88' />
        <path d='M260 116h12' />
        <path d='M260 204h12' />
        <path d='M282 160h34' markerEnd='url(#v-ah)' />
        <path d='M336 40v236' />
        <path d='M330 40h12' />
        <path d='M330 276h12' />
        <path d='M352 160h100' markerEnd='url(#v-ah)' />
        <text
          x='300'
          y='312'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          SAME TASK,
        </text>
        <text
          x='300'
          y='332'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          MUCH MORE DEPTH
        </text>
        <use href='#v-brief' transform='translate(470,40)' />
        <text x='646' y='120' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          exact files
        </text>
        <text x='646' y='182' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          exact tests
        </text>
        <text x='646' y='244' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          when to stop
        </text>
        <text x='646' y='264' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          and ask
        </text>
        <path d='M632 106h-6' />
        <path d='M632 168h-6' />
        <path d='M632 230h-6' />
        <text x='470' y='308' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Brief
        </text>
        <text x='470' y='330' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          everything a coding agent works from
        </text>
      </>
    )
  },
  develop: {
    viewBox: '0 0 800 360',
    content: (
      <>
        <text x='40' y='70' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          IN
        </text>
        <text x='418' y='70' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          OUT
        </text>
        <use href='#v-brief' transform='translate(40,86)' />
        <text x='40' y='348' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Brief
        </text>
        <path d='M212 204h164' markerEnd='url(#v-ah)' />
        <text
          x='292'
          y='184'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          AGENT WORKS
        </text>
        <path
          d='M118 78C210 18 480 12 600 96'
          stroke='var(--muted-foreground)'
          strokeDasharray='5 6'
          markerEnd='url(#v-ah-thin)'
        />
        <text x='368' y='30' textAnchor='middle' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          the brief rides along — it is not consumed
        </text>
        <use href='#v-pr' transform='translate(418,96)' />
        <text x='418' y='344' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Pull request
        </text>
        <text x='556' y='344' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          judgeable against the brief inside it
        </text>
      </>
    )
  },
  review: {
    viewBox: '0 0 800 340',
    content: (
      <>
        <text x='30' y='34' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          IN
        </text>
        <text x='584' y='34' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          OUT
        </text>
        <use href='#v-pr' transform='translate(30,54)' />
        <text x='30' y='300' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Pull request
        </text>
        <text x='30' y='322' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          open, not merged
        </text>
        <path d='M298 118c22 0 26-16 48-16' markerEnd='url(#v-ah-thin)' />
        <path d='M298 186c22 0 26 34 48 34' markerEnd='url(#v-ah-thin)' />
        <path d='M362 76h96' />
        <path d='M362 96h72' />
        <path d='M362 116h88' />
        <text x='362' y='60' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          what the code does
        </text>
        <path d='M362 216h88' />
        <path d='M362 236h96' />
        <path d='M362 256h64' />
        <text x='362' y='286' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          what the brief asked for
        </text>
        <path d='M348 66v54' />
        <path d='M348 206v54' />
        <text x='484' y='176' fontSize='30' fill='currentColor' stroke='none'>
          =?
        </text>
        <path d='M530 164h44' markerEnd='url(#v-ah)' />
        <text
          x='574'
          y='150'
          textAnchor='end'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          FINDINGS
        </text>
        <use href='#v-verdict' transform='translate(584,110)' />
        <text x='584' y='290' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Verdict
        </text>
        <text x='584' y='312' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          posted as a comment
        </text>
      </>
    )
  },
  security: {
    viewBox: '0 0 800 400',
    content: (
      <>
        <text x='30' y='34' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          IN
        </text>
        <text x='424' y='34' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          OUT
        </text>
        <use href='#v-pr' transform='translate(30,54)' />
        <text x='30' y='300' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Pull request
        </text>
        <text x='30' y='322' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          the same one review is reading, at the same moment
        </text>
        <path d='M418 92h-92' markerEnd='url(#v-ah-thin)' />
        <text x='428' y='97' fontSize='15' fill='currentColor' stroke='none'>
          could this leak a secret?
        </text>
        <path d='M418 162h-92' markerEnd='url(#v-ah-thin)' />
        <text x='428' y='167' fontSize='15' fill='currentColor' stroke='none'>
          does it widen the attack surface?
        </text>
        <path d='M418 232h-92' markerEnd='url(#v-ah-thin)' />
        <text x='428' y='237' fontSize='15' fill='currentColor' stroke='none'>
          are permissions misconfigured?
        </text>
        <path d='M700 258v20c0 8-6 14-14 14h-72' markerEnd='url(#v-ah)' />
        <use href='#v-verdict' transform='translate(424,248)' />
        <text x='424' y='398' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Verdict
        </text>
        <text x='530' y='398' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          a second, separate comment
        </text>
      </>
    )
  },
  archive: {
    viewBox: '0 0 800 360',
    content: (
      <>
        <text x='30' y='34' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          IN
        </text>
        <text x='520' y='34' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          OUT
        </text>
        <use href='#v-pr' transform='translate(30,54)' />
        <circle cx='56' cy='112' r='15' />
        <text x='30' y='300' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Pull request, merged
        </text>
        <text x='30' y='322' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          the merge is the only precondition
        </text>
        <path d='M306 162h56' markerEnd='url(#v-ah)' />
        <path d='M382 138v48' />
        <path d='M406 138v48' />
        <path d='M382 138h24' strokeDasharray='4 5' stroke='var(--muted-foreground)' />
        <path d='M382 118a24 24 0 0 1 24 20' markerEnd='url(#v-ah-thin)' stroke='var(--muted-foreground)' />
        <text
          x='394'
          y='212'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          GATE OPENS
        </text>
        <text
          x='394'
          y='232'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          ONLY ON MERGE
        </text>
        <path d='M426 162h56' markerEnd='url(#v-ah)' />
        <use href='#v-record' transform='translate(520,50)' />
        <text x='520' y='252' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Provenance record
        </text>
        <text x='520' y='274' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          assembled from what already happened
        </text>
        <use href='#v-task' transform='translate(520,296) scale(0.5)' />
        <path d='M556 318l7 8 13-16' />
        <text x='600' y='330' fontSize='15' fill='currentColor' stroke='none'>
          the task&apos;s issue, closed
        </text>
      </>
    )
  },
  'wrap-up': {
    viewBox: '0 0 800 360',
    content: (
      <>
        <text x='30' y='34' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          IN
        </text>
        <text x='500' y='34' fontSize='13' letterSpacing='1.3' fill='var(--muted-foreground)' stroke='none'>
          OUT
        </text>
        <use href='#v-task' transform='translate(30,50) scale(0.62,0.5)' />
        <path d='M124 68l6 7 12-14' />
        <use href='#v-task' transform='translate(30,116) scale(0.62,0.5)' />
        <path d='M124 128l18 18' />
        <use href='#v-task' transform='translate(30,182) scale(0.62,0.5)' />
        <path d='M124 206h18' markerEnd='url(#v-ah-thin)' />
        <use href='#v-task' transform='translate(30,248) scale(0.62,0.5)' />
        <path d='M124 268l6 7 12-14' />
        <text x='30' y='330' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Every task merged, dropped, or moved
        </text>
        <path d='M160 72c60 0 60 92 110 92' markerEnd='url(#v-ah-thin)' />
        <path d='M160 138c50 0 60 26 110 26' markerEnd='url(#v-ah-thin)' />
        <path d='M160 204c50 0 60-26 110-26' markerEnd='url(#v-ah-thin)' />
        <path d='M160 270c60 0 60-92 110-92' markerEnd='url(#v-ah-thin)' />
        <text
          x='216'
          y='300'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          FANS IN
        </text>
        <circle cx='308' cy='171' r='24' />
        <path d='M298 171l7 8 14-17' />
        <text
          x='308'
          y='220'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          A HUMAN SAYS
        </text>
        <text
          x='308'
          y='240'
          textAnchor='middle'
          fontSize='13'
          letterSpacing='1.2'
          fill='var(--muted-foreground)'
          stroke='none'
        >
          IT IS DONE
        </text>
        <path d='M332 171h34' markerEnd='url(#v-ah)' />
        <use href='#v-retro' transform='translate(500,48)' />
        <path d='M378 171h122' markerEnd='url(#v-ah)' />
        <text x='500' y='240' fontSize='17' fontWeight='500' fill='currentColor' stroke='none'>
          Retrospective
        </text>
        <text x='500' y='262' fontSize='14' fill='var(--muted-foreground)' stroke='none'>
          completed, dropped, carried forward
        </text>
        <path d='M512 300l13 13-13 13-13-13z' />
        <path d='M540 313h116' />
        <path d='M672 306l7 8 13-16' />
        <text x='500' y='352' fontSize='15' fill='currentColor' stroke='none'>
          the milestone, closed
        </text>
      </>
    )
  }
}

export type StageDiagramProps = {
  stageId: StageId
  className?: string
}

/** One stage's full IN / transformation / OUT picture, verbatim from the
 * design. Requires `MarkDefs` mounted on the same page. */
export function StageDiagram({ stageId, className }: StageDiagramProps) {
  const diagram = STAGE_DIAGRAMS[stageId]
  return (
    <svg
      viewBox={diagram.viewBox}
      className={className}
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      {diagram.content}
    </svg>
  )
}

export type StageGlyphProps = {
  stageId: StageId
  className?: string
}

const FRAME = {
  viewBox: '0 0 132 40',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
} satisfies SVGProps<SVGSVGElement>

const INPUT_X = 16
const TRANSFORM_X = 66
const OUTPUT_X = 116
const CENTER_Y = 20
const GAP = 11

/** The two connecting arrows sit at the same fixed offsets for every stage —
 * only the input/transform/output shapes change. */
function FlowArrows() {
  return (
    <>
      <path d={`M${INPUT_X + GAP} ${CENTER_Y}H${TRANSFORM_X - GAP}`} />
      <path
        d={`M${TRANSFORM_X - GAP - 3} ${CENTER_Y - 2.5}L${TRANSFORM_X - GAP} ${CENTER_Y}L${TRANSFORM_X - GAP - 3} ${CENTER_Y + 2.5}`}
      />
      <path d={`M${TRANSFORM_X + GAP} ${CENTER_Y}H${OUTPUT_X - GAP}`} />
      <path
        d={`M${OUTPUT_X - GAP - 3} ${CENTER_Y - 2.5}L${OUTPUT_X - GAP} ${CENTER_Y}L${OUTPUT_X - GAP - 3} ${CENTER_Y + 2.5}`}
      />
    </>
  )
}

/** An intent — Plan's input, before there is any tracked artifact yet: a
 * spark, not a document. */
function Intent({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <circle cx='0' cy='0' r='3' />
      <path d='M0 -7V-9.5M0 7V9.5M-7 0H-9.5M7 0H9.5M-4.9 -4.9 -6.7 -6.7M4.9 -4.9 6.7 -6.7M-4.9 4.9 -6.7 6.7M4.9 4.9 6.7 6.7' />
    </g>
  )
}

/** A tracked document — an Issue (`accent='dot'`), a written brief
 * (`accent='diamond'`), or a closed Issue carrying its provenance record
 * (`accent='check'`). Same ticket shape throughout; only the corner accent
 * changes, because the doctrine draws these as the same kind of artifact at
 * different points in its life. */
function Ticket({ x, accent }: { x: number; accent: 'dot' | 'diamond' | 'check' }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <rect x='-9' y='-7' width='18' height='14' rx='2' />
      <path d='M-5.5 -2.5H5.5M-5.5 2H2.5' />
      {accent === 'dot' && <circle cx='6.5' cy='-8.5' r='1.6' fill='currentColor' />}
      {accent === 'diamond' && (
        <rect x='4.9' y='-10.1' width='3.2' height='3.2' fill='currentColor' transform='rotate(45 6.5 -8.5)' />
      )}
      {accent === 'check' && (
        <g transform='translate(7 8.5)'>
          <circle cx='0' cy='0' r='3.4' />
          <path d='M-1.4 0 -0.1 1.4 1.9 -1.3' />
        </g>
      )}
    </g>
  )
}

/** The pull request — the one artifact that crosses three seams unchanged:
 * open when Develop hands it to Review and Security, merged (filled branch
 * node) only in the copy Archive receives. */
function PullRequestMark({ x, merged }: { x: number; merged?: boolean }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-6 -9V9' />
      <circle cx='-6' cy='-9' r='2.2' />
      <circle cx='-6' cy='9' r='2.2' />
      <path d='M-6 0Q1 0 6 -6' />
      <circle cx='6' cy='-6' r='2.2' fill={merged ? 'currentColor' : 'none'} />
      <path d='M9 -9H11.5M9 -6H12.5M9 -3H10.5' strokeWidth='1.1' />
    </g>
  )
}

/** A verdict comment — the same speech-bubble scaffold for Review and
 * Security alike, differing only in the subject inside it: a check for the
 * correctness verdict, a shield for the security one. Two things, one
 * pull request. */
function VerdictBubble({ x, accent }: { x: number; accent: 'check' | 'shield' }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-9 -8H9Q10 -8 10 -7V2Q10 3 9 3H-2L-6 7V3H-9Q-10 3 -10 2V-7Q-10 -8 -9 -8Z' />
      {accent === 'check' ? (
        <path d='M-4 -2.3 -1 0.7 4 -4.3' />
      ) : (
        <path d='M0 -4.3 3 -3 3 -0.4C3 1.8 1.5 3 0 3.7 -1.5 3 -3 1.8 -3 -0.4V-3Z' />
      )}
    </g>
  )
}

/** The tranche itself — a milestone bar over its labeled Issues. Plan
 * produces it freshly open (hollow nodes); Wrap-up receives it finished
 * (filled nodes, every task merged) — the same shape, a different moment. */
function Tranche({ x, done }: { x: number; done?: boolean }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-9 -6H9' />
      <path d='M-6 -6V-1M0 -6V-1M6 -6V-1' />
      <circle cx='-6' cy='2.5' r='2' fill={done ? 'currentColor' : 'none'} />
      <circle cx='0' cy='2.5' r='2' fill={done ? 'currentColor' : 'none'} />
      <circle cx='6' cy='2.5' r='2' fill={done ? 'currentColor' : 'none'} />
      {done && <path d='M-3 8 -1 10 4 5' />}
    </g>
  )
}

/** Retrospective + closed milestone — Wrap-up's own output, deliberately
 * NOT the Tranche shape again: closing the tranche is a distinct act from
 * the finished-but-unclosed state Wrap-up received. */
function Retrospective({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-8 -6H-2L0 -8H8V6H-8Z' />
      <path d='M-5 -1H5M-5 2H2' />
      <path d='M4 5 6 7 9 2.5' />
    </g>
  )
}

/** Distilling an intent into scope — a funnel, narrowing. */
function Funnel({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-8 -8H8L2 2V8H-2V2Z' />
    </g>
  )
}

/** Writing the exact instructions — a pen, mid-stroke. */
function Pen({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-6 8 6 -7' />
      <path d='M6 -7 2.7 -7 2.7 -3.7Z' fill='currentColor' />
    </g>
  )
}

/** Writing the code — angle brackets. */
function AngleBrackets({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-2 -8 -8 0 -2 8' />
      <path d='M2 -8 8 0 2 8' />
    </g>
  )
}

/** Judging it against the brief — a magnifying glass. */
function Magnifier({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <circle cx='-1.5' cy='-2' r='5.5' />
      <path d='M2.6 2.6 8 8' />
    </g>
  )
}

/** Checking what a correctness review does not — a shield. */
function Shield({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M0 -9 7 -6.2V1C7 6 3.5 8.7 0 10 -3.5 8.7 -7 6 -7 1V-6.2Z' />
    </g>
  )
}

/** Making the record permanent — a stamp. */
function Stamp({ x }: { x: number }) {
  const ticks = [0, 60, 120, 180, 240, 300].map((degrees) => {
    const radians = (degrees * Math.PI) / 180
    const x1 = Math.cos(radians) * 6
    const y1 = Math.sin(radians) * 6
    const x2 = Math.cos(radians) * 8.5
    const y2 = Math.sin(radians) * 8.5
    return { degrees, x1, y1, x2, y2 }
  })
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <circle cx='0' cy='0' r='4.5' />
      {ticks.map((tick) => (
        <line key={tick.degrees} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
      ))}
    </g>
  )
}

/** Declaring the tranche done — a flag. */
function Flag({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-5 -9V9' />
      <path d='M-5 -9H5L2 -5 5 -1H-5Z' />
    </g>
  )
}

const GLYPHS: Record<StageId, ReactNode> = {
  plan: (
    <>
      <Intent x={INPUT_X} />
      <Funnel x={TRANSFORM_X} />
      <Tranche x={OUTPUT_X} />
    </>
  ),
  brief: (
    <>
      <Ticket x={INPUT_X} accent='dot' />
      <Pen x={TRANSFORM_X} />
      <Ticket x={OUTPUT_X} accent='diamond' />
    </>
  ),
  develop: (
    <>
      <Ticket x={INPUT_X} accent='diamond' />
      <AngleBrackets x={TRANSFORM_X} />
      <PullRequestMark x={OUTPUT_X} />
    </>
  ),
  review: (
    <>
      <PullRequestMark x={INPUT_X} />
      <Magnifier x={TRANSFORM_X} />
      <VerdictBubble x={OUTPUT_X} accent='check' />
    </>
  ),
  security: (
    <>
      <PullRequestMark x={INPUT_X} />
      <Shield x={TRANSFORM_X} />
      <VerdictBubble x={OUTPUT_X} accent='shield' />
    </>
  ),
  archive: (
    <>
      <PullRequestMark x={INPUT_X} merged />
      <Stamp x={TRANSFORM_X} />
      <Ticket x={OUTPUT_X} accent='check' />
    </>
  ),
  'wrap-up': (
    <>
      <Tranche x={INPUT_X} done />
      <Flag x={TRANSFORM_X} />
      <Retrospective x={OUTPUT_X} />
    </>
  )
}

export function StageGlyph({ stageId, className }: StageGlyphProps) {
  return (
    <svg {...FRAME} className={className}>
      <FlowArrows />
      {GLYPHS[stageId]}
    </svg>
  )
}
