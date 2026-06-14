import { useState } from 'react'
import { ChevronDown, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AudienceFilter } from '@/lib/types'

/** Renders the AI's compiled audience filter as readable, code-like logic. */
export function DerivedFilter({ filter }: { filter: AudienceFilter }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-surface-muted/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          Derived filter
          <span className="text-xs font-normal text-muted-foreground">
            · {filter.conditions.length} conditions
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="animate-in-up space-y-3 border-t border-border px-3.5 py-3">
          <p className="text-xs text-muted-foreground">
            The agent compiled your goal into real query logic over the customer base:
          </p>
          <code className="block rounded-md bg-foreground/[0.04] p-3 font-mono text-[12.5px] leading-relaxed text-foreground">
            {filter.conditions.map((c, i) => (
              <span key={`${c.field}-${i}`} className="block">
                {i > 0 && <span className="text-accent-foreground">AND </span>}
                <span className="text-info">{c.field}</span>{' '}
                <span className="text-muted-foreground">{c.op}</span>{' '}
                <span className="text-success">
                  {typeof c.value === 'string' ? `'${c.value}'` : c.value.toLocaleString('en-IN')}
                </span>
              </span>
            ))}
          </code>
          <ul className="space-y-1">
            {filter.conditions.map((c, i) => (
              <li
                key={`label-${i}`}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span className="h-1 w-1 rounded-full bg-accent" />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
