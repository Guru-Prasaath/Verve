import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusPill } from '@/components/common/StatusPill'
import { MetricCard } from '@/components/common/MetricCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaigns } from '@/hooks'
import { formatINR, formatNumber, percent } from '@/lib/utils'

export default function Campaigns() {
  const navigate = useNavigate()
  const { data, isLoading } = useCampaigns()

  const totalRevenue = data?.reduce((s, c) => s + c.metrics.revenue, 0) ?? 0
  const totalOrders = data?.reduce((s, c) => s + c.metrics.ordered, 0) ?? 0
  const live =
    data?.filter((c) => c.status === 'Live' || c.status === 'Sending').length ?? 0

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader
        title="Campaigns"
        subtitle="Every campaign your co-pilot has proposed, with live performance."
        action={
          <Button variant="accent" onClick={() => navigate('/')}>
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Attributed revenue"
          value={formatINR(totalRevenue, { compact: true })}
          sublabel="across all campaigns"
          icon={TrendingUp}
          accent
        />
        <MetricCard label="Orders driven" value={formatNumber(totalOrders)} />
        <MetricCard
          label="Active now"
          value={String(live)}
          sublabel="live or sending"
        />
        <MetricCard label="Total campaigns" value={String(data?.length ?? 0)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Audience</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {data?.map((c) => {
              const deliveredPct = percent(c.metrics.delivered, c.metrics.sent)
              return (
                <TableRow
                  key={c.id}
                  data-clickable="true"
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                >
                  <TableCell>
                    <div className="font-medium text-foreground">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      “{c.goal}”
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={c.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{c.channel}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(c.audienceCount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.metrics.sent ? `${deliveredPct.toFixed(0)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.metrics.ordered ? formatNumber(c.metrics.ordered) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {c.metrics.revenue ? formatINR(c.metrics.revenue) : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
