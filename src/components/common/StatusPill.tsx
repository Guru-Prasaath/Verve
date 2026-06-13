import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CampaignStatus, RecipientState } from '@/lib/types'

const CAMPAIGN_MAP: Record<
  CampaignStatus,
  { variant: 'neutral' | 'info' | 'success' | 'warning'; dot: string; pulse?: boolean }
> = {
  Draft: { variant: 'neutral', dot: 'bg-muted-foreground' },
  Sending: { variant: 'warning', dot: 'bg-warning', pulse: true },
  Live: { variant: 'info', dot: 'bg-info', pulse: true },
  Done: { variant: 'success', dot: 'bg-success' },
}

export function StatusPill({ status }: { status: CampaignStatus }) {
  const cfg = CAMPAIGN_MAP[status]
  return (
    <Badge variant={cfg.variant} className="gap-1.5">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          cfg.dot,
          cfg.pulse && 'thinking-dot'
        )}
      />
      {status}
    </Badge>
  )
}

const RECIPIENT_MAP: Record<
  RecipientState,
  'neutral' | 'info' | 'success' | 'warning' | 'danger'
> = {
  Sent: 'neutral',
  Delivered: 'info',
  Read: 'info',
  Opened: 'info',
  Clicked: 'warning',
  Ordered: 'success',
  Failed: 'danger',
}

export function RecipientStatePill({ state }: { state: RecipientState }) {
  return <Badge variant={RECIPIENT_MAP[state]}>{state}</Badge>
}
