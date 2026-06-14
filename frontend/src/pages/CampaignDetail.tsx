import { Link, useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft,
  Trash2,
  IndianRupee,
  MousePointerClick,
  Send,
  ShoppingBag,
} from 'lucide-react'
import { StatusPill, RecipientStatePill } from '@/components/common/StatusPill'
import { MetricCard } from '@/components/common/MetricCard'
import { FunnelChart } from '@/components/campaign/FunnelChart'
import { PostmortemPanel } from '@/components/campaign/PostmortemPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DerivedFilter } from '@/components/plan/DerivedFilter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCampaign } from '@/hooks'
import { formatINR, formatNumber, percent } from '@/lib/utils'

export default function CampaignDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useCampaign(id)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      const response = await fetch(`${baseUrl}/campaigns/${id}`, { method: 'DELETE' })
      if (response.ok) {
        navigate('/campaigns')
      } else {
        alert('Failed to delete campaign')
        setDeleting(false)
      }
    } catch (err) {
      alert('Error deleting campaign')
      setDeleting(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-6 py-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const m = data.metrics
  const deliveredPct = percent(m.delivered, m.sent)
  const ctr = percent(m.clicked, m.delivered)
  const convPct = percent(m.ordered, m.delivered)
  const failedTotal = data.failures.reduce((s, f) => s + f.count, 0)

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All campaigns
      </Link>

      <div className="mt-3 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {data.title}
            </h1>
            <StatusPill status={data.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            "{data.goal}" · {formatNumber(data.audienceCount)} recipients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="neutral">{data.channel}</Badge>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Attributed revenue"
          value={formatINR(data.attributedRevenue, { compact: true })}
          sublabel={`${formatNumber(m.ordered)} orders`}
          icon={IndianRupee}
          accent
        />
        <MetricCard
          label="Delivered"
          value={m.sent ? `${deliveredPct.toFixed(0)}%` : '—'}
          sublabel={`${formatNumber(m.delivered)} of ${formatNumber(m.sent)}`}
          icon={Send}
        />
        <MetricCard
          label="Click-through"
          value={m.delivered ? `${ctr.toFixed(1)}%` : '—'}
          sublabel={`${formatNumber(m.clicked)} clicks`}
          icon={MousePointerClick}
        />
        <MetricCard
          label="Conversion"
          value={m.delivered ? `${convPct.toFixed(1)}%` : '—'}
          sublabel="delivered to order"
          icon={ShoppingBag}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Conversion funnel</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {m.sent ? (
                <FunnelChart funnel={data.funnel} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  This campaign hasn't sent yet - no funnel data.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Per-recipient lifecycle</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="max-h-[380px] overflow-y-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="sticky top-0 bg-surface">
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recipients.map((r) => (
                      <TableRow key={r.customerId}>
                        <TableCell className="font-medium text-foreground">
                          {r.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.city}
                        </TableCell>
                        <TableCell>
                          <RecipientStatePill state={r.state} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.orderValue ? formatINR(r.orderValue) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Audience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {data.persona}
              </p>
              <DerivedFilter filter={data.filter} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Failure breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {failedTotal === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No delivery failures recorded.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {data.failures.map((f) => {
                    const pct = percent(f.count, failedTotal)
                    return (
                      <li key={f.reason}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{f.reason}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatNumber(f.count)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="h-full rounded-full bg-danger"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                  <li className="border-t border-border pt-2 text-xs text-muted-foreground">
                    {formatNumber(failedTotal)} of {formatNumber(m.sent)} sends
                    failed
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>

          <PostmortemPanel campaignId={data.id} />
        </div>
      </div>
    </div>
  )
}
