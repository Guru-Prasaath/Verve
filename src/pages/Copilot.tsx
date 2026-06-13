import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowUp, Coffee, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThinkingShimmer } from '@/components/common/ThinkingShimmer'
import { CampaignPlanCard } from '@/components/plan/CampaignPlanCard'
import { useGeneratePlan, useLaunchCampaign } from '@/hooks'
import type { CampaignPlan } from '@/lib/types'

const EXAMPLES = [
  'Win back lapsed regulars',
  'Reward my top spenders',
  'Re-engage the weekday morning crowd',
  'Drive more weekend visits',
]

const REFINE_HINTS = ['Make it shorter', 'Only Bengaluru stores', 'Use email instead']

interface Turn {
  role: 'user' | 'agent'
  text: string
}

export default function Copilot() {
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)

  const [goal, setGoal] = useState('')
  const [refinements, setRefinements] = useState<string[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [plan, setPlan] = useState<CampaignPlan | null>(null)
  const [input, setInput] = useState('')

  const generate = useGeneratePlan()
  const launch = useLaunchCampaign()

  const started = turns.length > 0 || generate.isPending

  function runGenerate(nextGoal: string, nextRefinements: string[]) {
    generate.mutate(
      { goal: nextGoal, refinements: nextRefinements },
      {
        onSuccess: (p) => {
          setPlan(p)
          setTurns((t) => [
            ...t,
            {
              role: 'agent',
              text: `Here's a plan for "${p.title}" - ${p.audience.count.toLocaleString(
                'en-IN'
              )} customers via ${p.recommendedChannel}.`,
            },
          ])
        },
      }
    )
  }

  function submitGoal(text: string) {
    const g = text.trim()
    if (!g) return
    setGoal(g)
    setRefinements([])
    setPlan(null)
    setTurns([{ role: 'user', text: g }])
    setInput('')
    runGenerate(g, [])
  }

  function submitRefinement(text: string) {
    const r = text.trim()
    if (!r || !goal) return
    const next = [...refinements, r]
    setRefinements(next)
    setTurns((t) => [...t, { role: 'user', text: r }])
    setInput('')
    runGenerate(goal, next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plan && !generate.isPending) submitGoal(input)
    else submitRefinement(input)
  }

  const prefill = (location.state as { goal?: string } | null)?.goal
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefill && !prefilled.current) {
      prefilled.current = true
      submitGoal(prefill)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [prefill, navigate, location.pathname])

  function onLaunch() {
    if (!plan) return
    launch.mutate(plan, {
      onSuccess: (c) => navigate(`/campaigns/${c.id}`),
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      {!started && (
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary text-primary-foreground shadow-lg">
            <Coffee className="h-8 w-8" />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            What should we run next?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Describe a goal in plain English. Your AI co-pilot proposes a complete campaign - audience, message, channel and guardrails - for you to approve.
          </p>
        </div>
      )}

      {/* conversation transcript */}
      {turns.length > 0 && (
        <div className="mb-8 space-y-3">
          {turns.map((t, i) =>
            t.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-xs rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm sm:max-w-sm">
                  {t.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-foreground shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="max-w-xs rounded-2xl rounded-tl-sm bg-surface-muted px-4 py-2.5 text-sm text-foreground shadow-sm sm:max-w-sm">
                  {t.text}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* thinking / plan */}
      {generate.isPending && (
        <div className="mb-8">
          <ThinkingShimmer />
        </div>
      )}
      {plan && !generate.isPending && (
        <div className="mb-8">
          <CampaignPlanCard
            plan={plan}
            launching={launch.isPending}
            onLaunch={onLaunch}
            onRefineClick={() => inputRef.current?.focus()}
          />
        </div>
      )}

      {/* hero input area */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="space-y-3">
          {/* main input */}
          <div className="input-focus-glow rounded-2xl border-2 border-border-strong bg-surface shadow-md transition-all duration-300 focus-within:border-accent focus-within:shadow-lg">
            <div className="flex items-center gap-3 p-4 sm:p-5">
              <Sparkles className="h-5 w-5 shrink-0 text-accent" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  plan
                    ? 'Refine the plan - e.g. shorter, Bengaluru only...'
                    : 'Describe your campaign goal...'
                }
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-lg"
              />
              <Button
                type="submit"
                variant="accent"
                disabled={generate.isPending || !input.trim()}
                className="shrink-0 px-6 py-2.5 font-semibold shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
                aria-label="Generate plan"
              >
                <ArrowUp className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Generate</span>
              </Button>
            </div>
          </div>

          {/* example chips */}
          <div className="flex flex-wrap gap-2">
            {(plan ? REFINE_HINTS : EXAMPLES).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => (plan ? submitRefinement(c) : submitGoal(c))}
                disabled={generate.isPending}
                className="chip-interactive rounded-full border border-border-strong bg-surface px-4 py-2 text-xs font-medium text-foreground disabled:opacity-50 sm:text-sm"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
