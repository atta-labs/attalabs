import { ReportView } from '@/components/envoy/ReportView'
import { daniReport } from '@/lib/sample-report'
import type { RawSignal } from '@/lib/signals'
import type { MatchReport } from '@/lib/types'

const SIGNAL_TYPE_TITLES: Record<RawSignal['type'], string> = {
  architecture: 'Architecture',
  data: 'Data Layer',
  infra: 'Infrastructure',
  ai: 'AI Integration',
  unknown: 'Contribution'
}

function mapRawSignalsToReport(raw: RawSignal[], base: MatchReport): MatchReport {
  if (raw.length === 0) return base

  // Group by type, pick strongest signal per type
  const byType = new Map<string, RawSignal[]>()
  for (const s of raw) {
    const key = s.type
    if (!byType.has(key)) byType.set(key, [])
    byType.get(key)!.push(s)
  }

  const mapped: MatchReport['signal'] = []
  for (const [type, signals] of byType) {
    // Pick the highest-confidence signal as the lead
    const sorted = signals.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.confidence] - order[b.confidence]
    })
    const lead = sorted[0]!
    const repos = [...new Set(signals.map((s) => s.source.repo))]

    mapped.push({
      title: SIGNAL_TYPE_TITLES[type as RawSignal['type']] ?? type,
      observation: lead.evidence,
      interpretation: `${signals.length} signal${signals.length > 1 ? 's' : ''} detected across ${repos.join(', ')}`,
      confidence:
        lead.confidence === 'high'
          ? 'High Confidence'
          : lead.confidence === 'medium'
            ? 'Moderate Confidence'
            : 'Low Confidence'
    })
  }

  return { ...base, signal: mapped }
}

async function fetchSignals(username: string): Promise<RawSignal[]> {
  const token = process.env.GITHUB_PAT
  if (!token) return []

  try {
    const { extractSignals } = await import('@/lib/signals')
    return extractSignals(username, token)
  } catch {
    return []
  }
}

export default async function EnvoyPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const rawSignals = await fetchSignals(username)
  const report = mapRawSignalsToReport(rawSignals, daniReport)

  return <ReportView report={report} />
}
