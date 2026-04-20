import { and, desc, eq, gte } from 'drizzle-orm'
import { db, schema } from '@/db'

async function run() {
  console.log('Querying for BASELINE_WON judge reasonings from April 20...\n')

  const april20Start = new Date('2026-04-20T00:00:00Z')
  const april20End = new Date('2026-04-21T00:00:00Z')

  const results = await db
    .select({
      question: schema.sessions.question,
      judge_diagnosis: schema.benchmarkMetrics.judgeDiagnosis,
      judge_response: schema.benchmarkMetrics.judgeResponse,
      created_at: schema.benchmarkMetrics.createdAt
    })
    .from(schema.benchmarkMetrics)
    .innerJoin(schema.sessions, eq(schema.benchmarkMetrics.sessionId, schema.sessions.id))
    .where(
      and(
        eq(schema.benchmarkMetrics.judgeDiagnosis, 'BASELINE_WON'),
        gte(schema.benchmarkMetrics.createdAt, april20Start)
      )
    )
    .orderBy(desc(schema.benchmarkMetrics.createdAt))
    .limit(3)

  const filtered = results.filter((r) => r.created_at! < april20End)

  console.log(`Found ${filtered.length} BASELINE_WON results on April 20.\n`)

  for (let i = 0; i < filtered.length; i++) {
    const row = filtered[i]
    console.log(`${'='.repeat(80)}`)
    console.log(`Result ${i + 1}`)
    console.log(`${'='.repeat(80)}`)
    console.log(`\nQuestion:\n${row.question}\n`)
    console.log(`Judge diagnosis:\n${row.judge_diagnosis}\n`)
    console.log(`Judge response:\n${row.judge_response}\n`)
    console.log(`Created at: ${row.created_at}`)
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('Query failed:', err)
  process.exit(1)
})
