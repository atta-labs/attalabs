export type LifeCycleId = 'milestone' | 'tranche' | 'task'

export const LIFE_CYCLES: readonly { id: LifeCycleId; label: string; number: string }[] = [
  { id: 'milestone', label: 'Milestone', number: '01' },
  { id: 'tranche', label: 'Tranche', number: '02' },
  { id: 'task', label: 'Task', number: '03' }
]
