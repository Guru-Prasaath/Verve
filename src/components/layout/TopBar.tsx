import { ChevronDown, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur">
      {/* non-functional store / brand switcher */}
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
      >
        <Store className="h-4 w-4 text-muted-foreground" />
        <span>All Daybreak outlets</span>
        <Badge variant="neutral" className="ml-1">
          8
        </Badge>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Marketing · Daybreak Coffee
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          DC
        </div>
      </div>
    </header>
  )
}
