import { ReportView } from '@/components/envoy/ReportView'
import { daniReport } from '@/lib/sample-report'

export default function EnvoyPage() {
  return <ReportView report={daniReport} />
}
