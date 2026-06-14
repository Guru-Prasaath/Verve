import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GuardrailCheck, GuardrailStatus } from '@/lib/types'

const ICON = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
}
const TONE: Record<GuardrailStatus, string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-danger',
}

export function GuardrailChecklist({ checks }: { checks: GuardrailCheck[] }) {
  const warnings = checks.filter((c) => c.status !== 'pass').length

  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Pre-send guardrails
        </span>
        <span className="text-xs text-muted-foreground">
          {warnings === 0
            ? 'all clear'
            : `${warnings} to review`}
        </span>
      </div>
      <ul className="space-y-2.5">
        {checks.map((c) => {
          const Icon = ICON[c.status]
          return (
            <li key={c.id} className="flex items-start gap-2.5">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONE[c.status])} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs leading-snug text-muted-foreground">
                  {c.note}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
