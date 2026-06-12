import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sublabel?: string
  icon?: LucideIcon
  accent?: boolean
}) {
  return (
    <Card className={cn('p-4', accent && 'border-accent/40 bg-accent-soft/40')}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <Icon
            className={cn(
              'h-4 w-4',
              accent ? 'text-accent-foreground' : 'text-muted-foreground'
            )}
          />
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {sublabel && (
        <div className="mt-0.5 text-xs text-muted-foreground">{sublabel}</div>
      )}
    </Card>
  )
}
