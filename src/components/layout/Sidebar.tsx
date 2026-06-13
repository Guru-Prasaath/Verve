import { NavLink } from 'react-router-dom'
import { Coffee, LayoutDashboard, Sparkles, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Co-pilot', icon: Sparkles, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: LayoutDashboard, end: false },
  { to: '/audiences', label: 'Audiences', icon: Coffee, end: false },
  { to: '/customers', label: 'Customers', icon: Users, end: false },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Coffee className="h-4.5 w-4.5" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold text-foreground">
            Verve
          </div>
          <div className="-mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Daybreak Coffee
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent-foreground'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-surface-muted p-3">
          <p className="text-xs font-medium text-foreground">AI Co-pilot</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Proposes campaigns. You approve every send — nothing goes out on its own.
          </p>
        </div>
      </div>
    </aside>
  )
}
