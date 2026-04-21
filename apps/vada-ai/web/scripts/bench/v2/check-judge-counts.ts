import { config } from 'dotenv'
config({ path: '.env.local' })

import { db, schema } from '@/db'
import { eq, sql } from 'drizzle-orm'

const rows = await db
  .select({
    question: sql<string>`substring(${schema.v2JudgeResults.question}, 1, 40)`,
    systemA: sql<string>`substring(${schema.v2JudgeResults.systemADescription}, 1, 5)`,
    n: sql<number>`count(*)`
  })
  .from(schema.v2JudgeResults)
  .where(eq(schema.v2JudgeResults.comparisonType, 'baseline-vs-baseline'))
  .groupBy(schema.v2JudgeResults.question, schema.v2JudgeResults.systemADescription)
  .orderBy(schema.v2JudgeResults.question)

const totalRows = rows.reduce((s, r) => s + Number(r.n), 0)
console.log(`Total judge rows: ${totalRows}`)
console.log()
for (const r of rows) {
  console.log(`  ${r.systemA} | n=${r.n} | "${r.question}..."`)
}
