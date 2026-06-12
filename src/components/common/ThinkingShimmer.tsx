import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'

const STEPS = [
  'Reading your goal…',
  'Compiling an audience filter…',
  'Scoring channels…',
  'Drafting personalized messages…',
  'Running guardrail checks…',
]

export function ThinkingShimmer() {
  return (
    <Card className="animate-in-up overflow-hidden border-accent/40">
      <div className="flex items-center gap-3 border-b border-border bg-accent-soft/50 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          Co-pilot is thinking
          <span className="flex gap-1">
            <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent" />
            <span
              className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent"
              style={{ animationDelay: '0.2s' }}
            />
            <span
              className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent"
              style={{ animationDelay: '0.4s' }}
            />
          </span>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <ul className="space-y-2.5">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className="flex items-center gap-2.5 text-sm text-muted-foreground"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
              {s}
            </li>
          ))}
        </ul>
        <div className="space-y-2.5 pt-1">
          <div className="shimmer h-3 w-2/3 rounded bg-surface-muted" />
          <div className="shimmer h-3 w-1/2 rounded bg-surface-muted" />
          <div className="shimmer h-24 w-full rounded-lg bg-surface-muted" />
        </div>
      </div>
    </Card>
  )
}
