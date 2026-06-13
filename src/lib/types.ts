import { z } from 'zod'

/*
  Shared domain types for Verve. Every API response is validated against the
  matching Zod schema in the api client, so the mock layer and the future
  Express backend are guaranteed to agree on shape. Types are inferred from
  the schemas — never hand-written separately.
*/

export const CITIES = [
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Pune',
  'Hyderabad',
] as const
export const CitySchema = z.enum(CITIES)
export type City = z.infer<typeof CitySchema>

export const DRINKS = [
  'Latte',
  'Cappuccino',
  'Flat White',
  'Cortado',
  'Cold Brew',
  'Pour-Over',
  'Seasonal Special',
] as const
export const DrinkSchema = z.enum(DRINKS)
export type Drink = z.infer<typeof DrinkSchema>

export const FREQUENCIES = ['daily', 'weekly', 'occasional'] as const
export const FrequencySchema = z.enum(FREQUENCIES)
export type Frequency = z.infer<typeof FrequencySchema>

export const TIME_HABITS = ['morning-office', 'afternoon', 'weekend'] as const
export const TimeHabitSchema = z.enum(TIME_HABITS)
export type TimeHabit = z.infer<typeof TimeHabitSchema>

export const CHANNELS = ['WhatsApp', 'SMS', 'Email', 'RCS'] as const
export const ChannelSchema = z.enum(CHANNELS)
export type Channel = z.infer<typeof ChannelSchema>

export const OutletSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: CitySchema,
})
export type Outlet = z.infer<typeof OutletSchema>

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: CitySchema,
  homeStore: z.string(),
  favoriteDrink: DrinkSchema,
  frequency: FrequencySchema,
  timeHabit: TimeHabitSchema,
  lifetimeValue: z.number(),
  daysSinceLastOrder: z.number(),
  totalOrders: z.number(),
})
export type Customer = z.infer<typeof CustomerSchema>

/* A single readable condition the AI "compiled" the goal into. */
export const FilterConditionSchema = z.object({
  field: z.string(), // e.g. "last_order_days"
  op: z.string(), // e.g. ">"
  value: z.union([z.string(), z.number()]),
  label: z.string(), // human label e.g. "Last ordered over 60 days ago"
})
export type FilterCondition = z.infer<typeof FilterConditionSchema>

export const AudienceFilterSchema = z.object({
  conditions: z.array(FilterConditionSchema),
})
export type AudienceFilter = z.infer<typeof AudienceFilterSchema>

export const AudiencePreviewSchema = z.object({
  count: z.number(),
  persona: z.string(),
  sampleCustomers: z.array(CustomerSchema),
})
export type AudiencePreview = z.infer<typeof AudiencePreviewSchema>

export const AudienceSchema = z.object({
  id: z.string(),
  name: z.string(),
  persona: z.string(),
  count: z.number(),
  filter: AudienceFilterSchema,
  topCities: z.array(CitySchema),
})
export type Audience = z.infer<typeof AudienceSchema>

/* One personalized message preview for a specific (mock) recipient. */
export const MessagePreviewSchema = z.object({
  customerName: z.string(),
  drink: DrinkSchema,
  store: z.string(),
  body: z.string(),
})
export type MessagePreview = z.infer<typeof MessagePreviewSchema>

export const ChannelMessageSchema = z.object({
  channel: ChannelSchema,
  subject: z.string().optional(), // email only
  template: z.string(), // raw template with {{name}} tokens
  previews: z.array(MessagePreviewSchema),
})
export type ChannelMessage = z.infer<typeof ChannelMessageSchema>

export const GuardrailStatusSchema = z.enum(['pass', 'warn', 'fail'])
export type GuardrailStatus = z.infer<typeof GuardrailStatusSchema>

export const GuardrailCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: GuardrailStatusSchema,
  note: z.string(),
})
export type GuardrailCheck = z.infer<typeof GuardrailCheckSchema>

export const CampaignPlanSchema = z.object({
  id: z.string(),
  goal: z.string(),
  title: z.string(),
  audience: z.object({
    count: z.number(),
    persona: z.string(),
    filter: AudienceFilterSchema,
    topCities: z.array(CitySchema),
    avgGapWeeks: z.number().optional(),
  }),
  messages: z.array(ChannelMessageSchema),
  recommendedChannel: ChannelSchema,
  channelReasoning: z.string(),
  guardrails: z.array(GuardrailCheckSchema),
})
export type CampaignPlan = z.infer<typeof CampaignPlanSchema>

export const CAMPAIGN_STATUSES = ['Draft', 'Sending', 'Live', 'Done'] as const
export const CampaignStatusSchema = z.enum(CAMPAIGN_STATUSES)
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>

export const CampaignSchema = z.object({
  id: z.string(),
  title: z.string(),
  goal: z.string(),
  status: CampaignStatusSchema,
  channel: ChannelSchema,
  audienceCount: z.number(),
  createdAt: z.string(),
  metrics: z.object({
    sent: z.number(),
    delivered: z.number(),
    opened: z.number(),
    clicked: z.number(),
    ordered: z.number(),
    revenue: z.number(),
  }),
})
export type Campaign = z.infer<typeof CampaignSchema>

export const FunnelStageSchema = z.object({
  stage: z.enum(['Sent', 'Delivered', 'Read', 'Opened', 'Clicked', 'Order']),
  count: z.number(),
})
export type FunnelStage = z.infer<typeof FunnelStageSchema>

export const FailureBreakdownSchema = z.object({
  reason: z.string(),
  count: z.number(),
})
export type FailureBreakdown = z.infer<typeof FailureBreakdownSchema>

export const RECIPIENT_STATES = [
  'Sent',
  'Delivered',
  'Read',
  'Opened',
  'Clicked',
  'Ordered',
  'Failed',
] as const
export const RecipientStateSchema = z.enum(RECIPIENT_STATES)
export type RecipientState = z.infer<typeof RecipientStateSchema>

export const RecipientSchema = z.object({
  customerId: z.string(),
  name: z.string(),
  city: CitySchema,
  state: RecipientStateSchema,
  orderValue: z.number().nullable(),
})
export type Recipient = z.infer<typeof RecipientSchema>

export const CampaignDetailSchema = CampaignSchema.extend({
  funnel: z.array(FunnelStageSchema),
  failures: z.array(FailureBreakdownSchema),
  attributedRevenue: z.number(),
  recipients: z.array(RecipientSchema),
  filter: AudienceFilterSchema,
  persona: z.string(),
})
export type CampaignDetail = z.infer<typeof CampaignDetailSchema>

export const PostmortemSchema = z.object({
  campaignId: z.string(),
  headline: z.string(),
  retro: z.array(z.string()), // plain-English paragraphs / bullet insights
  highlights: z.array(
    z.object({ label: z.string(), value: z.string(), tone: GuardrailStatusSchema })
  ),
  recommendedNextGoal: z.string(),
  recommendedNextTitle: z.string(),
  recommendedRationale: z.string(),
})
export type Postmortem = z.infer<typeof PostmortemSchema>
