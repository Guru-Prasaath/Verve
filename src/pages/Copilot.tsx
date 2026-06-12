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
              text: `Here’s a plan for “${p.title}” — ${p.audience.count.toLocaleString(
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

  // Pre-fill from a postmortem / audience "Create this campaign" hand-off.
  const prefill = (location.state as { goal?: string } | null)?.goal
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefill && !prefilled.current) {
      prefilled.current = true
      submitGoal(prefill)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  function onLaunch() {
    if (!plan) return
    launch.mutate(plan, {
      onSuccess: (c) => navigate(`/campaigns/${c.id}`),
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {!started && (
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Coffee className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            What should we run next?
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Describe a goal in plain English. Your co-pilot proposes a complete campaign —
            audience, message, channel and guardrails — for you to approve.
          </p>
        </div>
      )}

      {/* conversation transcript */}
      {turns.length > 0 && (
        <div className="mb-5 space-y-2.5">
          {turns.map((t, i) =>
            t.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                  {t.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-surface-muted px-4 py-2 text-sm text-foreground">
                  {t.text}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* thinking / plan */}
      {generate.isPending && (
        <div className="mb-6">
          <ThinkingShimmer />
        </div>
      )}
      {plan && !generate.isPending && (
        <div className="mb-6">
          <CampaignPlanCard
            plan={plan}
            launching={launch.isPending}
            onLaunch={onLaunch}
            onRefineClick={() => inputRef.current?.focus()}
          />
        </div>
      )}

      {/* input */}
      <form onSubmit={handleSubmit} className="sticky bottom-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border-strong bg-surface p-2 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/30">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              plan
                ? 'Refine the plan — e.g. “make it shorter”, “only Bengaluru”…'
                : 'Describe your goal…'
            }
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            variant="accent"
            disabled={generate.isPending || !input.trim()}
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(plan ? REFINE_HINTS : EXAMPLES).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => (plan ? submitRefinement(c) : submitGoal(c))}
            disabled={generate.isPending}
            className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
