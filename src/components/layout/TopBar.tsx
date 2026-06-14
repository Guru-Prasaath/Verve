import { ChevronDown, Menu, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-muted md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* outlet selector — enhanced affordance */}
        <button
          type="button"
          className="group flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-2.5 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:border-accent hover:bg-accent-soft hover:shadow-md active:scale-95 sm:px-3"
        >
          <Store className="h-4 w-4 text-accent transition-colors group-hover:text-accent-foreground" />
          <span className="hidden sm:inline">All Daybreak outlets</span>
          <span className="sm:hidden">Outlets</span>
          <Badge variant="neutral" className="ml-1 font-semibold">
            8
          </Badge>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-180 group-hover:text-accent-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
          Marketing · Daybreak Coffee
        </span>
        {/* user profile — interactive */}
        <button
          type="button"
          className="group flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground transition-all duration-200 hover:shadow-lg active:scale-95"
          title="User profile"
        >
          DC
        </button>
      </div>
    </header>
  )
}
