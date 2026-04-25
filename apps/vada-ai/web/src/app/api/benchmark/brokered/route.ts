import { NextResponse } from 'next/server'
import { listBenchmarkRuns, getBenchmarkStats } from '@/db/bench-queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(200, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '50', 10)))

  const [stats, runs] = await Promise.all([getBenchmarkStats(), listBenchmarkRuns(limit)])

  return NextResponse.json({ stats, runs })
}
