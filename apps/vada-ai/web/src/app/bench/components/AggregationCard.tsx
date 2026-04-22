import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components/card'

export function AggregationCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex items-center justify-between py-0.5'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      <span className='font-mono text-sm'>{value}</span>
    </div>
  )
}
