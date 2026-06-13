import { z } from 'zod'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env here too: this module's top-level code runs during server.ts's
// import phase, BEFORE server.ts calls dotenv.config(), so we can't rely on it
// having loaded the key yet. dotenv.config() is idempotent — safe to call twice.
dotenv.config({ path: path.join(__dirname, '../.env') })

/*
 * AI planning layer. Turns a marketer's natural-language goal into a STRUCTURED
 * campaign plan using an LLM (Groq, via its OpenAI-compatible API). The model
 * decides the audience filter, the recommended channel + reasoning, the
 * per-channel copy, and the guardrails — the CRM then applies that filter to the
 * real customer database so the audience count is genuinely derived, not invented.
 *
 * If GROQ_API_KEY is unset, or the call fails, or the output doesn't validate,
 * the caller falls back to the deterministic keyword compiler — the demo always
 * works. Only the transport here is provider-specific; the schema, validation,
 * prompt and fallback are provider-agnostic.
 */

const apiKey = process.env.GROQ_API_KEY
// Overridable so you can swap models (e.g. openai/gpt-oss-120b,
// moonshotai/kimi-k2-instruct) without touching code.
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export const LLM_ENABLED = !!apiKey
export const LLM_MODEL = GROQ_MODEL

// The shape we ask the model to return. Validated before we trust it.
const LLMPlanSchema = z.object({
  title: z.string(),
  audienceDescriptor: z.string(),
  conditions: z
    .array(
      z.object({
        field: z.enum([
          'last_order_days',
          'lifetime_value',
          'visit_frequency',
          'time_habit',
          'city',
          'favorite_drink',
        ]),
        op: z.enum(['>', '<', '=']),
        value: z.union([z.string(), z.number()]),
        label: z.string(),
      })
    )
    .min(1),
  recommendedChannel: z.enum(['WhatsApp', 'SMS', 'Email', 'RCS']),
  channelReasoning: z.string(),
  messages: z
    .array(
      z.object({
        channel: z.enum(['WhatsApp', 'SMS', 'Email', 'RCS']),
        subject: z.string().optional(),
        template: z.string(),
      })
    )
    .min(1),
  guardrails: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        status: z.enum(['pass', 'warn', 'fail']),
        note: z.string(),
      })
    )
    .min(1),
})

export type LLMPlan = z.infer<typeof LLMPlanSchema>

const SYSTEM = `You are the campaign-planning engine for "Verve", an AI-native marketing CRM for "Daybreak Coffee" — a specialty coffee chain across 6 Indian metros (Bengaluru, Mumbai, Delhi, Chennai, Pune, Hyderabad) with 8 outlets.

Customer fields you can segment on:
- last_order_days (number): days since last order. Lapsed regulars are > 60.
- lifetime_value (number, INR): casual ~1800, weekly ~4500, daily ~9000+.
- visit_frequency: 'daily' | 'weekly' | 'occasional'
- time_habit: 'morning-office' | 'afternoon' | 'weekend'
- city: one of the 6 metros
- favorite_drink: 'Latte' | 'Cappuccino' | 'Flat White' | 'Cortado' | 'Cold Brew' | 'Pour-Over' | 'Seasonal Special'

Channels: WhatsApp (loyal, time-sensitive, read receipts), SMS (fast/impulse, morning commute), Email (leisurely/weekend, richer story), RCS (rich + tappable).

Given the marketer's goal (and any refinement messages), produce a complete campaign plan. Compile the goal into a precise audience filter (2-4 conditions), pick the single best channel with a one-line reason, and write warm, on-brand, personalized copy for ALL FOUR channels using the tokens {{name}}, {{drink}} and {{store}} (these are filled per-recipient later). SMS must include "Reply STOP to opt out". Email needs a subject. Provide 3-4 guardrail checks (over-messaging, personalization tokens, brand tone, opt-out) with status pass|warn|fail.

Respond with ONLY a JSON object (no prose, no markdown fences) matching exactly:
{
  "title": string,
  "audienceDescriptor": string  // short phrase describing the segment, e.g. "lapsed weekly regulars in Bengaluru & Mumbai" — do NOT include a number,
  "conditions": [{ "field": string, "op": ">"|"<"|"=", "value": string|number, "label": string }],
  "recommendedChannel": "WhatsApp"|"SMS"|"Email"|"RCS",
  "channelReasoning": string,
  "messages": [{ "channel": "WhatsApp"|"SMS"|"Email"|"RCS", "subject"?: string, "template": string }],
  "guardrails": [{ "id": string, "label": string, "status": "pass"|"warn"|"fail", "note": string }]
}`

/** Strip ```json fences if the model added them, then parse. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('no JSON object in model output')
  return JSON.parse(raw.slice(start, end + 1))
}

/** Returns a validated LLM plan, or null to signal "use the keyword fallback". */
export async function planWithLLM(
  goal: string,
  refinements: string[] = []
): Promise<LLMPlan | null> {
  if (!apiKey) return null

  const userText =
    `Goal: ${goal}` +
    (refinements.length ? `\nRefinements: ${refinements.join('; ')}` : '')

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 1500,
        // Force valid JSON back (Groq supports OpenAI-style JSON mode).
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userText },
        ],
      }),
    })

    if (!res.ok) {
      console.error('[agentPlanner] Groq HTTP error', res.status, await res.text())
      return null
    }

    const data: any = await res.json()
    const content: string | undefined = data?.choices?.[0]?.message?.content
    if (!content) return null

    return LLMPlanSchema.parse(extractJson(content))
  } catch (err) {
    console.error('[agentPlanner] LLM plan failed, falling back to keyword compiler:', err)
    return null
  }
}
