// One-shot cleanup: delete A1 baseline runs + all baseline-vs-baseline judge results
// so baseline-ceiling.ts and compare-a0-a1.ts can rerun clean.
import { config } from 'dotenv'
config({ path: '.env.local' })

import { deleteV2BaselineRunsForVariant, deleteAllV2BaselineJudgeResults } from './db'

const [a1Deleted, judgeDeleted] = await Promise.all([
  deleteV2BaselineRunsForVariant('A1').then(() => 'ok'),
  deleteAllV2BaselineJudgeResults().then(() => 'ok')
])
console.log(`A1 baseline runs deleted: ${a1Deleted}`)
console.log(`Baseline judge results deleted: ${judgeDeleted}`)
