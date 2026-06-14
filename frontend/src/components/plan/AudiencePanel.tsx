import { MapPin, Users } from 'lucide-react'
import { CountUp } from '@/components/common/CountUp'
import { DerivedFilter } from '@/components/plan/DerivedFilter'
import { Badge } from '@/components/ui/badge'
import type { CampaignPlan } from '@/lib/types'

export function AudiencePanel({
  audience,
}: {
  audience: CampaignPlan['audience']
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Audience
          </div>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-foreground">
            {audience.persona}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {audience.topCities.map((c) => (
              <Badge key={c} variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {c}
              </Badge>
            ))}
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-accent/40 bg-accent-soft/50 px-5 py-4 text-center sm:min-w-[170px]">
          <CountUp
            value={audience.count}
            className="font-display text-4xl font-bold tracking-tight text-primary"
          />
          <div className="mt-1 text-xs font-medium text-accent-foreground">
            customers in segment
          </div>
          {audience.avgGapWeeks ? (
            <div className="mt-1 text-[11px] text-muted-foreground">
              avg {audience.avgGapWeeks}-week gap
            </div>
          ) : null}
        </div>
      </div>

      <DerivedFilter filter={audience.filter} />
    </div>
  )
}
