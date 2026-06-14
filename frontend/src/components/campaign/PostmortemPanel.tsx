import { ArrowRight, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { usePostmortem } from '@/hooks'
import type { GuardrailStatus } from '@/lib/types'

const TONE: Record<GuardrailStatus, string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-danger',
}

export function PostmortemPanel({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = usePostmortem(campaignId)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-gradient-to-br from-accent-soft/60 to-surface px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          AI postmortem
        </span>
      </div>

      <div className="space-y-4 p-5">
        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {data.headline}
            </h3>

            <div className="flex flex-wrap gap-2">
              {data.highlights.map((h) => (
                <div
                  key={h.label}
                  className="rounded-lg border border-border bg-surface-muted/50 px-3 py-2"
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {h.label}
                  </div>
                  <div className={cn('text-sm font-semibold', TONE[h.tone])}>
                    {h.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              {data.retro.map((p, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {p}
                </p>
              ))}
            </div>

            {data.cohortCharacteristics && data.cohortCharacteristics.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-muted/50 p-4">
                <div className="mb-3 text-sm font-medium text-foreground">Converter profile</div>
                <ul className="space-y-2">
                  {data.cohortCharacteristics.map((char) => (
                    <li key={char.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{char.label}</span>
                      <span className="font-semibold text-foreground">{char.percentage}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Recommended next campaign
              </div>
              <p className="mt-2 font-medium text-foreground">
                {data.recommendedNextTitle}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {data.recommendedRationale}
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() =>
                  navigate('/', { state: { goal: data.recommendedNextGoal } })
                }
              >
                Create this campaign
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
