import { MessageCircle, Radio, Rocket, Sparkles, Wand2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AudiencePanel } from '@/components/plan/AudiencePanel'
import { ChannelTabs } from '@/components/plan/ChannelTabs'
import { GuardrailChecklist } from '@/components/plan/GuardrailChecklist'
import type { CampaignPlan } from '@/lib/types'

function Section({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  const animationClass = `animate-section-${step}`
  return (
    <section className={`px-5 py-5 ${animationClass}`}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-[11px] font-semibold text-primary-foreground shadow-sm">
          {step}
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </section>
  )
}

export function CampaignPlanCard({
  plan,
  onLaunch,
  onRefineClick,
  launching,
}: {
  plan: CampaignPlan
  onLaunch: () => void
  onRefineClick: () => void
  launching: boolean
}) {
  return (
    <Card className="animate-in-up overflow-hidden">
      {/* header — enhanced with gradient */}
      <div className=”flex items-start justify-between gap-3 border-b border-border bg-gradient-to-br from-accent-soft/80 to-accent-soft/40 px-5 py-5 shadow-sm”>
        <div>
          <div className=”flex items-center gap-2”>
            <Sparkles className=”h-4 w-4 text-accent-foreground” />
            <span className=”text-xs font-medium uppercase tracking-wide text-accent-foreground”>
              ✨ AI Proposed Plan
            </span>
          </div>
          <h2 className=”mt-2 font-display text-2xl font-bold text-foreground”>
            {plan.title}
          </h2>
          <p className=”mt-1 text-sm text-muted-foreground”>”{plan.goal}”</p>
        </div>
        <Badge variant=”primary” className=”shrink-0 font-semibold”>
          Ready
        </Badge>
      </div>

      <div className="divide-y divide-border">
        <Section step={1} title="Audience">
          <AudiencePanel audience={plan.audience} />
        </Section>

        <Section step={2} title="Message">
          <ChannelTabs
            messages={plan.messages}
            recommendedChannel={plan.recommendedChannel}
          />
        </Section>

        <Section step={3} title="Recommended channel">
          <div className="flex items-start gap-3 rounded-lg border border-accent/40 bg-accent-soft/40 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {plan.recommendedChannel === 'RCS' ? (
                <Radio className="h-4.5 w-4.5" />
              ) : (
                <MessageCircle className="h-4.5 w-4.5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {plan.recommendedChannel}
                </span>
                <Badge variant="primary">AI pick</Badge>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {plan.channelReasoning}
              </p>
            </div>
          </div>
        </Section>

        <Section step={4} title="Guardrails">
          <GuardrailChecklist checks={plan.guardrails} />
        </Section>
      </div>

      {/* actions — prominent CTA + reassurance */}
      <div className="flex flex-col items-stretch gap-4 border-t border-border bg-gradient-to-r from-surface to-accent-soft/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          ✓ Human-in-the-loop. Nothing sends without your approval.
        </p>
        <div className="flex gap-3 sm:gap-2">
          <Button
            variant="outline"
            onClick={onRefineClick}
            disabled={launching}
            className="transition-all duration-200 hover:shadow-md"
          >
            <Wand2 className="h-4 w-4" />
            Refine
          </Button>
          <Button
            variant="accent"
            onClick={onLaunch}
            disabled={launching}
            className="flex-1 px-6 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-60 sm:flex-none"
          >
            <Rocket className="h-4 w-4" />
            {launching ? 'Launching…' : 'Launch campaign'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
