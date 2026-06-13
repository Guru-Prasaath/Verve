import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-muted/50 px-6 py-16 text-center sm:py-24">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
        <Icon className="h-8 w-8 text-accent-foreground" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <Button
          variant="accent"
          onClick={action.onClick}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
