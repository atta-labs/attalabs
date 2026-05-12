import type { ActiveTask } from '@atta/cetana-coordinator'

export type TaskStatus = 'ongoing' | 'blocked' | 'completed' | 'failed' | 'CRASHED'

export interface TaskWithStatus extends ActiveTask {
  derivedStatus: TaskStatus
}
