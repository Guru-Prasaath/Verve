import { useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin, Users } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CountUp } from '@/components/common/CountUp'
import { useAudiences } from '@/hooks'

export default function Audiences() {
  const navigate = useNavigate()
  const { data, isLoading } = useAudiences()

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader
        title="Audiences"
        subtitle="Saved segments your co-pilot reaches for when planning a campaign."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}

        {data?.map((a) => (
          <Card key={a.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Segment
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                  {a.name}
                </h3>
              </div>
              <div className="shrink-0 text-right">
                <CountUp
                  value={a.count}
                  className="font-display text-2xl font-bold text-primary"
                />
                <div className="text-[11px] text-muted-foreground">customers</div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-0">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {a.persona}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.topCities.map((c) => (
                  <Badge key={c} variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {c}
                  </Badge>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.filter.conditions.map((cond, i) => (
                  <Badge key={i} variant="neutral" className="font-normal">
                    {cond.label}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 flex justify-end border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate('/', {
                      state: { goal: `Run a campaign for ${a.name.toLowerCase()}` },
                    })
                  }
                >
                  Plan a campaign
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
