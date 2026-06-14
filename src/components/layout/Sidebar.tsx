import { NavLink } from 'react-router-dom'
import { Coffee, LayoutDashboard, Sparkles, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Co-pilot', icon: Sparkles, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: LayoutDashboard, end: false },
  { to: '/audiences', label: 'Audiences', icon: Coffee, end: false },
  { to: '/customers', label: 'Customers', icon: Users, end: false },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-300 ease-in-out md:static md:z-auto md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2.5 px-5">
          <div className="flex items-center gap-2.5">
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
          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-accent-soft to-accent-soft/60 text-accent-foreground shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-primary before:transition-all'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-lg bg-surface-muted p-3">
            <p className="text-xs font-medium text-foreground">AI Co-pilot</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Proposes campaigns. You approve every send - nothing goes out on its own.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
