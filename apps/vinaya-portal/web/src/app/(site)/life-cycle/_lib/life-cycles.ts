export type LifeCycleId = 'milestone' | 'tranche' | 'task'

// Shared DOM anchor: any control that changes the active altitude (the
// switcher's own tabs, a panel's handoff button) scrolls this element into
// view first, so the reader always lands at the top of the new panel rather
// than wherever they'd scrolled to on the old one.
export const LIFE_CYCLE_SWITCHER_ANCHOR_ID = 'life-cycle-switcher'

export const LIFE_CYCLES: readonly { id: LifeCycleId; label: string; number: string }[] = [
  { id: 'milestone', label: 'Milestone', number: '01' },
  { id: 'tranche', label: 'Tranche', number: '02' },
  { id: 'task', label: 'Task', number: '03' }
]
