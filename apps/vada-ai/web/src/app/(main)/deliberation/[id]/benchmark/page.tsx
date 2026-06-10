import { Text } from '@atta/ui/components'
import { getBenchmarkMetrics, getSessionWithTranscript } from '@/db/queries'
import { extractRenderableConclusion } from '@/engine/conclusion-rescue'
import { BenchmarkReport } from './components/BenchmarkReport'

export default async function BenchmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionWithTranscript(id)
  if (!session) {
    return (
      <div className='flex min-h-dvh items-center justify-center'>
        <Text as='p' muted>
          Session not found.
        </Text>
      </div>
    )
  }
  const metrics = await getBenchmarkMetrics(id)
  if (!metrics) {
    return (
      <div className='mx-auto w-full max-w-[720px] space-y-4 px-5 py-10'>
        <h2 className='font-serif text-xl'>No benchmark for this deliberation</h2>
        <Text as='p' muted>
          Benchmark comparison wasn't enabled when this session was started. Start a new deliberation with the benchmark
          checkbox on to generate a comparison report.
        </Text>
      </div>
    )
  }

  // Extract Vāda recommendation using the shared rescue — handles legacy
  // { raw, error } shape + salvage-artifact recommendations + truncated JSON.
  const conclusionRow = session.conclusion as {
    originalJson?: Record<string, unknown> | null
    revisedJson?: Record<string, unknown> | null
  } | null
  const conclusionJson = extractRenderableConclusion(conclusionRow)
  const vadaRecommendation =
    conclusionJson && typeof conclusionJson.recommendation === 'string'
      ? (conclusionJson.recommendation as string)
      : null

  return (
    <BenchmarkReport
      sessionId={id}
      question={session.question}
      sessionProvider={session.provider ?? null}
      sessionModelId={session.modelId ?? null}
      sessionCreatedAt={session.createdAt.toISOString()}
      sessionUpdatedAt={session.updatedAt.toISOString()}
      terminalState={session.terminalState ?? null}
      vadaRecommendation={vadaRecommendation}
      baseline={{
        answer: metrics.baselineAnswer ?? null,
        provider: metrics.baselineProvider ?? null,
        modelId: metrics.baselineModelId ?? null,
        tokensInput: metrics.baselineTokensInput,
        tokensOutput: metrics.baselineTokensOutput,
        elapsedMs: metrics.baselineElapsedMs,
        createdAt: metrics.baselineCreatedAt ? metrics.baselineCreatedAt.toISOString() : null
      }}
      deliberation={{
        tokensInput: metrics.deliberationTokensInput,
        tokensOutput: metrics.deliberationTokensOutput,
        sumElapsedMs: metrics.deliberationSumElapsedMs,
        callCount: metrics.deliberationCallCount
      }}
      judge={{
        response: metrics.judgeResponse ?? null,
        provider: metrics.judgeProvider ?? null,
        modelId: metrics.judgeModelId ?? null,
        diagnosis: metrics.judgeDiagnosis ?? null,
        tokensInput: metrics.judgeTokensInput,
        tokensOutput: metrics.judgeTokensOutput,
        elapsedMs: metrics.judgeElapsedMs,
        createdAt: metrics.judgeCreatedAt ? metrics.judgeCreatedAt.toISOString() : null
      }}
    />
  )
}
