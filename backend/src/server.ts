import express from 'express'
import cors from 'cors'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { planWithLLM, LLM_ENABLED, LLM_MODEL } from './agentPlanner'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// The stubbed Channel Service runs as a SEPARATE process/deployment. The CRM
// reaches it only over HTTP; it calls back into our receipt webhook.
const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://127.0.0.1:4100'

// Root endpoint for status check
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Verve CRM API Backend</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); max-width: 400px; text-align: center; border: 1px solid #334155; }
          h1 { margin: 0 0 0.5rem 0; color: #38bdf8; font-size: 1.75rem; }
          p { color: #94a3b8; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem; }
          .badge { display: inline-block; background: #10b981; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Verve CRM API Backend</h1>
          <p>The backend server is running successfully! It exposes the CRM endpoints and mounts the stubbed Channel Service loop.</p>
          <div class="badge">Status: Online & Seeding Ready</div>
        </div>
      </body>
    </html>
  `)
})

// --- Helper to execute filters against the database ---
async function fetchFilteredCustomers(conditions: any[]) {
  let query: any = supabase.from('customers').select('*')

  for (const cond of conditions) {
    let col = cond.field
    if (col === 'last_order_days') col = 'days_since_last_order'
    if (col === 'visit_frequency') col = 'frequency'
    if (col === 'time_habit') col = 'time_habit'
    if (col === 'lifetime_value') col = 'lifetime_value'
    if (col === 'city') col = 'city'
    if (col === 'favorite_drink') col = 'favorite_drink'

    if (cond.op === '>') {
      query = query.gt(col, cond.value)
    } else if (cond.op === '<') {
      query = query.lt(col, cond.value)
    } else if (cond.op === '=') {
      query = query.eq(col, cond.value)
    }
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching filtered customers:', error)
    return []
  }

  // Map database snake_case back to frontend camelCase
  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    homeStore: c.home_store,
    favoriteDrink: c.favorite_drink,
    frequency: c.frequency,
    timeHabit: c.time_habit,
    lifetimeValue: c.lifetime_value,
    daysSinceLastOrder: c.days_since_last_order,
    totalOrders: c.total_orders,
  }))
}

// Helper: Calculate top cities in an audience
function getTopCities(customers: any[]): string[] {
  const counts = new Map<string, number>()
  for (const c of customers) counts.set(c.city, (counts.get(c.city) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city)
}

// Helper: Fill templates
function fillTemplate(body: string, c: any): string {
  return body
    .replace(/{{name}}/g, c.name.split(' ')[0])
    .replace(/{{drink}}/g, c.favoriteDrink.toLowerCase())
    .replace(/{{store}}/g, c.homeStore)
}

// --- Endpoints ---

// 1. GET /customers — list & search shoppers
app.get('/customers', async (req, res) => {
  const q = (req.query.q as string || '').trim().toLowerCase()
  
  let query = supabase.from('customers').select('*')
  if (q) {
    // Basic search on name or city or store or drink
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,home_store.ilike.%${q}%,favorite_drink.ilike.%${q}%`)
  }

  const { data, error } = await query.limit(200)
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Map to frontend camelCase camelCase
  const customers = (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    homeStore: c.home_store,
    favoriteDrink: c.favorite_drink,
    frequency: c.frequency,
    timeHabit: c.time_habit,
    lifetimeValue: c.lifetime_value,
    daysSinceLastOrder: c.days_since_last_order,
    totalOrders: c.total_orders,
  }))

  res.json(customers)
})

// 2. POST /customers/ingest — ingestion route to store new customers and orders
app.post('/customers/ingest', async (req, res) => {
  const dataset = req.body // Expecting Customer[] JSON array
  if (!Array.isArray(dataset)) {
    return res.status(400).json({ error: 'Body must be a JSON array of customers' })
  }

  console.log(`[CRM Backend] Ingesting ${dataset.length} customers/orders into Supabase...`)

  // Convert properties to database snake_case
  const dbRows = dataset.map((c: any) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    home_store: c.homeStore,
    favorite_drink: c.favoriteDrink,
    frequency: c.frequency,
    time_habit: c.timeHabit,
    lifetime_value: Number(c.lifetimeValue) || 0,
    days_since_last_order: Number(c.daysSinceLastOrder) || 0,
    total_orders: Number(c.totalOrders) || 0,
  }))

  const { error } = await supabase.from('customers').upsert(dbRows)
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ success: true, count: dbRows.length })
})

// Recompute a customer's aggregate columns from their order rows, so
// lifetime_value / total_orders / days_since_last_order always reflect reality.
async function recomputeCustomerAggregates(customerIds: string[]) {
  const DAY = 86_400_000
  for (const customerId of [...new Set(customerIds)]) {
    const { data: rows, error } = await supabase
      .from('orders')
      .select('amount, ordered_at')
      .eq('customer_id', customerId)
    if (error || !rows) continue

    const totalOrders = rows.length
    const lifetimeValue = rows.reduce((s: number, r: any) => s + (r.amount || 0), 0)
    const lastOrderMs = rows.reduce(
      (max: number, r: any) => Math.max(max, new Date(r.ordered_at).getTime()),
      0
    )
    const daysSinceLastOrder =
      lastOrderMs > 0 ? Math.floor((Date.now() - lastOrderMs) / DAY) : 0

    await supabase
      .from('customers')
      .update({
        total_orders: totalOrders,
        lifetime_value: lifetimeValue,
        days_since_last_order: daysSinceLastOrder,
      })
      .eq('id', customerId)
  }
}

// 2b. POST /orders/ingest — ingest individual orders (customers + their orders).
// Upserts the order rows, then re-derives the affected customers' aggregates so
// LTV / order count / recency stay consistent with the orders on record.
app.post('/orders/ingest', async (req, res) => {
  const dataset = req.body // Expecting Order[] JSON array
  if (!Array.isArray(dataset)) {
    return res.status(400).json({ error: 'Body must be a JSON array of orders' })
  }

  console.log(`[CRM Backend] Ingesting ${dataset.length} orders into Supabase...`)

  const dbRows = dataset.map((o: any) => ({
    id: o.id || `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    customer_id: o.customerId,
    amount: Number(o.amount) || 0,
    drink: o.drink,
    store: o.store,
    ordered_at: o.orderedAt || new Date().toISOString(),
    campaign_id: o.campaignId ?? null,
  }))

  const { error } = await supabase.from('orders').upsert(dbRows)
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Keep the customer aggregates honest after ingest.
  await recomputeCustomerAggregates(dbRows.map((r) => r.customer_id).filter(Boolean))

  res.json({ success: true, count: dbRows.length })
})

// 3. POST /audiences/preview — preview filter execution count
app.post('/audiences/preview', async (req, res) => {
  const filter = req.body
  const conditions = filter?.conditions || []

  const members = await fetchFilteredCustomers(conditions)

  res.json({
    count: members.length,
    persona: `${members.length.toLocaleString('en-IN')} customers match this segment.`,
    sampleCustomers: members.slice(0, 5),
  })
})

// 4. GET /audiences — fetch all pre-built or saved audiences
app.get('/audiences', async (req, res) => {
  const { data, error } = await supabase.from('audiences').select('*')
  if (error) {
    return res.status(500).json({ error: error.message })
  }
  
  const formatted = (data || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    persona: a.persona,
    count: a.count,
    filter: a.filter,
    topCities: a.top_cities,
  }))

  res.json(formatted)
})

// Archetypes matches frontend mockData.ts
const ARCHETYPES = [
  {
    id: 'lapsed',
    match: (g: string) => /laps|win.?back|stopped|regular|return|churn|miss|away/.test(g),
    title: 'Win back lapsed regulars',
    conditions: [
      { field: 'last_order_days', op: '>', value: 60, label: 'Last ordered over 60 days ago' },
      { field: 'visit_frequency', op: '=', value: 'weekly', label: 'Was a weekly regular' },
      { field: 'lifetime_value', op: '>', value: 4000, label: 'Lifetime value above ₹4,000' },
    ],
    channel: 'WhatsApp',
    reasoning: 'These are loyal, time-sensitive customers — WhatsApp gets read receipts and a personal tone that pulls regulars back faster than email.',
    persona: (count: number, cities: string[], gap: number) =>
      `~${count.toLocaleString('en-IN')} lapsed regulars, mostly weekday-morning office crowd in ${cities.slice(0, 2).join(' & ')}, averaging an ${gap}-week gap since their last cup.`,
    templates: {
      WhatsApp: { body: 'Hey {{name}}, your usual {{drink}} is waiting at {{store}} ☕ It’s been a while — here’s 20% off your next one this week. See you soon?' },
      SMS: { body: 'Daybreak: Hey {{name}}, miss your {{drink}}? 20% off at {{store}} this week. Reply STOP to opt out.' },
      Email: {
        subject: 'Your {{drink}} misses you, {{name}}',
        body: 'Hi {{name}},\n\nIt’s been a while since your last visit to {{store}}. Your favourite {{drink}} is just the way you like it — and this week it’s 20% off.\n\nWe saved your table. See you soon,\nThe Daybreak team',
      },
      RCS: { body: '{{name}}, your {{drink}} is waiting at {{store}} ☕ Tap below for 20% off this week.' },
    },
  },
  {
    id: 'top-spenders',
    match: (g: string) => /top.?spend|vip|loyal|reward|best|high.?value|premium/.test(g),
    title: 'Reward top spenders',
    conditions: [
      { field: 'lifetime_value', op: '>', value: 9000, label: 'Lifetime value above ₹9,000' },
      { field: 'visit_frequency', op: '=', value: 'daily', label: 'Daily visitor' },
    ],
    channel: 'WhatsApp',
    reasoning: 'Your highest-value daily regulars deserve a concierge feel — WhatsApp lets you offer a personal perk that lands like a thank-you, not a blast.',
    persona: (count: number, cities: string[]) =>
      `~${count.toLocaleString('en-IN')} top spenders — daily visitors with ₹9k+ lifetime value, concentrated in ${cities.slice(0, 2).join(' & ')}. Your most reliable morning faces.`,
    templates: {
      WhatsApp: { body: 'Hi {{name}} 👋 You’re one of our favourite faces at {{store}}. Your next {{drink}} is on us — just show this message at the counter. Thank you for being a regular ☕' },
      SMS: { body: 'Daybreak: {{name}}, your next {{drink}} at {{store}} is on us — our thanks for being a regular. Show this at the counter.' },
      Email: {
        subject: 'A coffee on us, {{name}}',
        body: 'Hi {{name}},\n\nYou’re one of the regulars who make {{store}} feel like home. As a small thank-you, your next {{drink}} is on the house.\n\nWith gratitude,\nThe Daybreak team',
      },
      RCS: { body: '{{name}}, your next {{drink}} at {{store}} is on us ☕ Tap to claim — our thanks for being a regular.' },
    },
  },
  {
    id: 'morning',
    match: (g: string) => /morning|weekday|office|commute|am |breakfast|early/.test(g),
    title: 'Re-engage the weekday morning crowd',
    conditions: [
      { field: 'time_habit', op: '=', value: 'morning-office', label: 'Weekday-morning office habit' },
      { field: 'last_order_days', op: '>', value: 21, label: 'Quieter for 3+ weeks' },
    ],
    channel: 'SMS',
    reasoning: 'Morning-commute customers decide fast and act on impulse — a short SMS that lands at 8am beats a richer channel they’ll open at lunch.',
    persona: (count: number, cities: string[]) =>
      `~${count.toLocaleString('en-IN')} weekday-morning office regulars who’ve gone a little quiet, mostly around ${cities.slice(0, 2).join(' & ')} business districts.`,
    templates: {
      WhatsApp: { body: 'Morning {{name}} ☀️ Beat the queue at {{store}} — pre-order your {{drink}} and it’s ready when you arrive. 15% off before 10am.' },
      SMS: { body: 'Daybreak: Morning {{name}}! Your {{drink}} at {{store}}, 15% off before 10am. Pre-order & skip the queue.' },
      Email: {
        subject: 'Skip the morning queue, {{name}}',
        body: 'Hi {{name}},\n\nMornings are better with less waiting. Pre-order your {{drink}} at {{store}} and we’ll have it ready — 15% off before 10am.\n\nSee you bright and early,\nDaybreak',
      },
      RCS: { body: 'Morning {{name}} ☀️ Pre-order your {{drink}} at {{store}}, 15% off before 10am. Tap to order.' },
    },
  },
  {
    id: 'weekend',
    match: (g: string) => /weekend|saturday|sunday|leisure|brunch|family/.test(g),
    title: 'Drive weekend visits',
    conditions: [
      { field: 'time_habit', op: '=', value: 'weekend', label: 'Weekend visitor' },
      { field: 'lifetime_value', op: '>', value: 3000, label: 'Lifetime value above ₹3,000' },
    ],
    channel: 'Email',
    reasoning: 'Weekend customers browse at leisure — email gives room for imagery and a seasonal story they’ll actually read over a slow Saturday.',
    persona: (count: number, cities: string[]) =>
      `~${count.toLocaleString('en-IN')} weekend regulars who treat Daybreak as a ritual, spread across ${cities.slice(0, 3).join(', ')}.`,
    templates: {
      WhatsApp: { body: 'Hi {{name}} 🌿 This weekend at {{store}}: our new seasonal special, and your {{drink}} done right. Bring someone along — second cup half price.' },
      SMS: { body: 'Daybreak: {{name}}, this weekend at {{store}} — seasonal special + your {{drink}}. Second cup half price.' },
      Email: {
        subject: 'Your weekend table at {{store}}, {{name}}',
        body: 'Hi {{name}},\n\nSlow down this weekend. We’ve a new seasonal special on the bar, and your {{drink}} is always ready at {{store}}. Bring a friend — second cup’s half price.\n\nSee you Saturday,\nDaybreak',
      },
      RCS: { body: '{{name}}, this weekend at {{store}}: seasonal special + your {{drink}}. Second cup half price. Tap for more.' },
    },
  },
]

const DEFAULT_ARCHETYPE = {
  id: 'engaged',
  match: () => true,
  title: 'Re-engage active customers',
  conditions: [
    { field: 'last_order_days', op: '>', value: 30, label: 'Quieter for 30+ days' },
    { field: 'lifetime_value', op: '>', value: 3000, label: 'Lifetime value above ₹3,000' },
  ],
  channel: 'WhatsApp',
  reasoning: 'A broad, warm nudge works best on WhatsApp where open rates stay high and the tone feels personal.',
  persona: (count: number, cities: string[]) =>
    `~${count.toLocaleString('en-IN')} customers worth re-engaging, mostly in ${cities.slice(0, 2).join(' & ')}.`,
  templates: {
    WhatsApp: { body: 'Hey {{name}}, we’ve missed you at {{store}} ☕ Your {{drink}} and a little something extra are waiting — pop in this week?' },
    SMS: { body: 'Daybreak: {{name}}, we’ve missed you at {{store}}! Your {{drink}} + a treat await. Pop in this week.' },
    Email: {
      subject: 'We saved your spot, {{name}}',
      body: 'Hi {{name}},\n\nWe’ve missed you at {{store}}. Your {{drink}} is ready whenever you are — and there’s a little something extra waiting this week.\n\nSee you soon,\nDaybreak',
    },
    RCS: { body: 'Hey {{name}}, your {{drink}} is waiting at {{store}} ☕ Tap to see what’s new this week.' },
  },
}

const CITY_LOOKUP: Record<string, string> = {
  bengaluru: 'Bengaluru',
  bangalore: 'Bengaluru',
  mumbai: 'Mumbai',
  delhi: 'Delhi',
  chennai: 'Chennai',
  pune: 'Pune',
  hyderabad: 'Hyderabad',
}

type Channel = 'WhatsApp' | 'SMS' | 'Email' | 'RCS'
interface MessageTemplate { channel: Channel; subject?: string; template: string }

// 5. POST /agent/plan — AI agent campaign plan compiler.
// Prefers Claude (genuine NL → structured plan); falls back to the deterministic
// keyword compiler when no API key is set or the model output doesn't validate.
// Either way, the compiled filter is applied to the real DB so the count is derived.
app.post('/agent/plan', async (req, res) => {
  const { goal, refinements = [] } = req.body
  if (!goal) {
    return res.status(400).json({ error: 'Missing goal prompt' })
  }

  // --- Resolve the "creative" parts of the plan ---
  let title: string
  let conditions: any[]
  let channel: Channel
  let channelReasoning: string
  let templates: MessageTemplate[]
  let guardrails: any[] | null = null
  let personaFn: (count: number, cities: string[], gap: number) => string
  let shorten = false
  let source: 'ai' | 'keyword' = 'keyword'

  const llm = await planWithLLM(goal, refinements)

  if (llm) {
    source = 'ai'
    title = llm.title
    conditions = llm.conditions.map((c) => ({ ...c }))
    channel = llm.recommendedChannel
    channelReasoning = llm.channelReasoning
    templates = llm.messages
    guardrails = llm.guardrails
    personaFn = (count, cities) => {
      void cities
      return `~${count.toLocaleString('en-IN')} ${llm.audienceDescriptor}`
    }
  } else {
    // Deterministic keyword compiler
    const allText = [goal, ...refinements].join(' ').toLowerCase()
    const arch = ARCHETYPES.find((a) => a.match(allText)) ?? DEFAULT_ARCHETYPE
    conditions = arch.conditions.map((c: any) => ({ ...c }))
    channel = arch.channel as Channel

    for (const r of refinements) {
      const t = r.toLowerCase()
      for (const [key, city] of Object.entries(CITY_LOOKUP)) {
        if (t.includes(key)) {
          conditions = conditions.filter((c) => c.field !== 'city')
          conditions.push({ field: 'city', op: '=', value: city, label: `Only ${city} stores` })
        }
      }
      if (/short|brief|tighter|cut|trim/.test(t)) shorten = true
      if (/whatsapp/.test(t)) channel = 'WhatsApp'
      else if (/\bsms\b|text/.test(t)) channel = 'SMS'
      else if (/email|mail/.test(t)) channel = 'Email'
      else if (/\brcs\b/.test(t)) channel = 'RCS'
    }

    title = arch.title
    channelReasoning =
      channel === arch.channel
        ? arch.reasoning
        : `${channel} chosen per your refinement — copy adapted to fit the channel.`
    templates = (Object.keys(arch.templates) as Channel[]).map((ch) => {
      const tpl = (arch.templates as any)[ch]
      return { channel: ch, subject: tpl.subject, template: tpl.body }
    })
    personaFn = arch.persona as any
  }

  // --- Shared: apply the compiled filter to the real customer base ---
  const audience = await fetchFilteredCustomers(conditions)
  const cities = getTopCities(audience)
  const avgGap =
    audience.length > 0
      ? Math.round(
          audience.reduce((s: number, c: any) => s + c.daysSinceLastOrder, 0) /
            audience.length /
            7
        )
      : 0
  const sample = audience.slice(0, 6)

  // Build per-channel previews from real sample customers
  const messages = templates.map((t) => {
    const previews = sample.slice(0, 3).map((c: any) => {
      let body = fillTemplate(t.template, c)
      if (shorten && t.channel !== 'Email') body = body.split(/(?<=[.!?])\s/)[0]
      return { customerName: c.name, drink: c.favoriteDrink, store: c.homeStore, body }
    })
    return { channel: t.channel, subject: t.subject, template: t.template, previews }
  })

  // Keyword path computes guardrails from the derived count; AI path returns its own
  if (!guardrails) {
    guardrails = [
      {
        id: 'over-messaging',
        label: 'Over-messaging',
        status: audience.length > 1500 ? 'warn' : 'pass',
        note:
          audience.length > 1500
            ? `${audience.length.toLocaleString('en-IN')} recipients — consider splitting the send to protect deliverability.`
            : 'No recipient has been contacted in the last 7 days. Safe to send.',
      },
      {
        id: 'personalization',
        label: 'Personalization tokens',
        status: 'pass',
        note: 'Name, favourite drink and home store resolve for every recipient.',
      },
      {
        id: 'tone',
        label: 'Brand tone',
        status: 'pass',
        note: shorten
          ? 'Trimmed copy stays warm and on-brand.'
          : 'Warm, concise, on-brand. No spam-trigger phrasing detected.',
      },
      {
        id: 'opt-out',
        label: 'Opt-out compliance',
        status: 'pass',
        note: channel === 'SMS' ? 'STOP opt-out present in SMS copy.' : 'Channel supports native unsubscribe.',
      },
    ]
  }

  res.json({
    id: `plan_${Date.now()}`,
    goal,
    title,
    source, // 'ai' | 'keyword' — surfaced for transparency
    audience: {
      count: audience.length,
      persona: personaFn(audience.length, cities, avgGap),
      filter: { conditions },
      topCities: cities.slice(0, 3),
      avgGapWeeks: avgGap,
    },
    messages,
    recommendedChannel: channel,
    channelReasoning,
    guardrails,
  })
})

// 6. GET /campaigns — list all campaigns
app.get('/campaigns', async (req, res) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Format to camelCase
  const campaigns = (data || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    goal: c.goal,
    status: c.status,
    channel: c.channel,
    audienceCount: c.audience_count,
    createdAt: c.created_at,
    metrics: c.metrics,
  }))

  res.json(campaigns)
})

// 7. GET /campaigns/:id — detailed stats of a campaign
app.get('/campaigns/:id', async (req, res) => {
  const { id } = req.params

  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (cErr || !campaign) {
    return res.status(404).json({ error: 'Campaign not found' })
  }

  const { data: recs, error: rErr } = await supabase
    .from('recipients')
    .select('*')
    .eq('campaign_id', id)
    .limit(100)

  const recipients = (recs || []).map((r: any) => ({
    customerId: r.customer_id,
    name: r.name,
    city: r.city,
    state: r.state,
    orderValue: r.order_value,
  }))

  res.json({
    id: campaign.id,
    title: campaign.title,
    goal: campaign.goal,
    status: campaign.status,
    channel: campaign.channel,
    audienceCount: campaign.audience_count,
    createdAt: campaign.created_at,
    metrics: campaign.metrics,
    persona: campaign.persona,
    filter: campaign.filter,
    funnel: campaign.funnel,
    failures: campaign.failures,
    attributedRevenue: campaign.attributed_revenue,
    recipients,
  })
})

// 8. POST /campaigns — launch a campaign (exposes CRM Send API)
app.post('/campaigns', async (req, res) => {
  const plan = req.body
  const campaignId = `camp_live_${Date.now() % 100000}`

  console.log(`[CRM Backend] Launching Campaign: ${plan.title} (${campaignId})`)

  // Initial stats
  const campaignRow = {
    id: campaignId,
    title: plan.title,
    goal: plan.goal,
    status: 'Live',
    channel: plan.recommendedChannel,
    audience_count: plan.audience.count,
    metrics: { sent: plan.audience.count, delivered: 0, opened: 0, clicked: 0, ordered: 0, revenue: 0 },
    persona: plan.audience.persona,
    filter: plan.audience.filter,
    funnel: [
      { stage: 'Sent', count: plan.audience.count },
      { stage: 'Delivered', count: 0 },
      { stage: 'Opened', count: 0 },
      { stage: 'Clicked', count: 0 },
      { stage: 'Order', count: 0 },
    ],
    failures: [],
    attributed_revenue: 0,
  }

  const { error: cErr } = await supabase.from('campaigns').insert(campaignRow)
  if (cErr) {
    console.error('Error inserting campaign:', cErr)
    return res.status(500).json({ error: cErr.message })
  }

  // 1. Fetch audience customers matching conditions
  const conditions = plan.audience.filter.conditions
  const customers = await fetchFilteredCustomers(conditions)
  
  // 2. Select up to 100 customers to record as individual recipients
  const sampleSize = Math.min(customers.length, 100)
  const sampleCustomers = customers.slice(0, sampleSize)

  const recipientRows = sampleCustomers.map((cust: any) => ({
    campaign_id: campaignId,
    customer_id: cust.id,
    name: cust.name,
    city: cust.city,
    state: 'Sent',
  }))

  const { error: rErr, data: insertedRecipients } = await supabase
    .from('recipients')
    .insert(recipientRows)
    .select()

  if (rErr) {
    console.error('Error inserting recipients:', rErr)
  }

  // 3. Asynchronously trigger the stubbed Channel Service `/send` endpoint
  const sendBody = {
    campaignId,
    channel: plan.recommendedChannel,
    message: plan.messages.find((m: any) => m.channel === plan.recommendedChannel)?.template || '',
    recipients: (insertedRecipients || []).map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      name: r.name,
    })),
  }

  // Call the separate Channel Service's send API (fire-and-forget — it ACKs
  // immediately and streams delivery receipts back to our webhook).
  fetch(`${CHANNEL_SERVICE_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sendBody),
  }).catch((err) => {
    console.error('[CRM Backend] Failed to reach Channel Service dispatch API:', err)
  })

  // Finalizer: receipts stop arriving once engagement settles, so the last
  // recompute can't flip the status. Close the attribution window server-side.
  setTimeout(() => {
    supabase
      .from('campaigns')
      .update({ status: 'Done' })
      .eq('id', campaignId)
      .eq('status', 'Live')
      .then(({ error }) => {
        if (error) console.error('[CRM Backend] finalize failed:', error.message)
      })
  }, COMPLETION_GRACE_MS + 4000)

  // Return campaign object immediately to UI
  res.json({
    id: campaignId,
    title: campaignRow.title,
    goal: campaignRow.goal,
    status: campaignRow.status,
    channel: campaignRow.channel,
    audienceCount: campaignRow.audience_count,
    createdAt: new Date().toISOString(),
    metrics: campaignRow.metrics,
  })
})

// Lifecycle ordering. Used to reject out-of-order / duplicate callbacks so an
// older event (e.g. a late 'Delivered') can never overwrite a newer one ('Opened').
const STATE_RANK: Record<string, number> = {
  Sent: 0,
  Delivered: 1,
  Opened: 2,
  Clicked: 3,
  Ordered: 4,
}
// Window after launch during which we keep polling for trickling engagement
// events before declaring a campaign Done. (Production analog: an attribution
// window of hours/days; compressed here for the demo.)
const COMPLETION_GRACE_MS = 12_000

// 9. POST /api/campaigns/:id/receipt — CRM Receipt Callback Webhook.
// The Channel Service streams per-recipient delivery events here. We apply a
// strict state machine, then recompute campaign aggregates.
app.post('/api/campaigns/:id/receipt', async (req, res) => {
  const campaignId = req.params.id
  const { recipientId, state, failureReason = null, orderValue = null } = req.body

  if (!recipientId || !state) {
    return res.status(400).json({ error: 'Missing recipientId or state' })
  }

  // Load current recipient state to enforce ordering + idempotency. The
  // lifecycle rank is derived from the state string (1:1), so no extra column.
  const { data: current, error: curErr } = await supabase
    .from('recipients')
    .select('state, customer_id, name')
    .eq('id', recipientId)
    .single()

  if (curErr || !current) {
    return res.status(404).json({ error: 'Recipient not found' })
  }

  const isFailed = current.state === 'Failed'
  const currentRank = STATE_RANK[current.state] ?? 0

  // Decide whether this event advances the recipient's lifecycle.
  let applied = false
  if (state === 'Failed') {
    // A failure is only valid before delivery; ignore late/duplicate failures.
    if (!isFailed && currentRank === 0) {
      const { error: failUpdErr } = await supabase
        .from('recipients')
        .update({ state: 'Failed', failure_reason: failureReason })
        .eq('id', recipientId)
      // Tolerate DBs missing the failure_reason column — still record the state.
      if (failUpdErr) {
        await supabase.from('recipients').update({ state: 'Failed' }).eq('id', recipientId)
      }
      applied = true
    }
  } else {
    const incomingRank = STATE_RANK[state] ?? 0
    // Only move forward. Out-of-order and duplicate events are no-ops.
    if (!isFailed && incomingRank > currentRank) {
      const update: Record<string, unknown> = { state }
      if (state === 'Ordered') update.order_value = orderValue
      await supabase.from('recipients').update(update).eq('id', recipientId)
      applied = true

      // Attribution: a conversion writes a REAL order row linked to this
      // campaign — the genuine "this order came because of this communication".
      // Best-effort so the loop still works if the orders table isn't migrated.
      if (state === 'Ordered' && current.customer_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('favorite_drink, home_store')
          .eq('id', current.customer_id)
          .single()
        await supabase.from('orders').insert({
          id: `ord_${campaignId}_${recipientId}`,
          customer_id: current.customer_id,
          amount: Number(orderValue) || 0,
          drink: cust?.favorite_drink || 'Latte',
          store: cust?.home_store || 'Daybreak',
          ordered_at: new Date().toISOString(),
          campaign_id: campaignId,
        })
      }
    }
  }

  // Duplicate / out-of-order event — acknowledge but skip the recompute.
  if (!applied) {
    return res.json({ success: true, applied: false })
  }

  // Recompute campaign aggregates from the (now monotonic) recipient states.
  // Select only state + order_value so this works regardless of optional columns.
  const { data: recs, error: fErr } = await supabase
    .from('recipients')
    .select('state, order_value')
    .eq('campaign_id', campaignId)

  if (!fErr && recs) {
    const totalCount = recs.length
    const delivered = recs.filter((r) => ['Delivered', 'Opened', 'Clicked', 'Ordered'].includes(r.state)).length
    const opened = recs.filter((r) => ['Opened', 'Clicked', 'Ordered'].includes(r.state)).length
    const clicked = recs.filter((r) => ['Clicked', 'Ordered'].includes(r.state)).length
    const ordered = recs.filter((r) => r.state === 'Ordered').length
    const failed = recs.filter((r) => r.state === 'Failed').length
    const pendingSent = recs.filter((r) => r.state === 'Sent').length

    // Attributed revenue from the real orders table (source of truth: orders
    // written with this campaign_id). Falls back to the recipient order_value
    // sum if the orders table isn't available — same value, keeps the demo live.
    let revenue = recs.reduce((sum, r) => sum + (r.order_value || 0), 0)
    const { data: orderRows, error: ordErr } = await supabase
      .from('orders')
      .select('amount')
      .eq('campaign_id', campaignId)
    if (!ordErr && orderRows) {
      revenue = orderRows.reduce((s: number, o: any) => s + (o.amount || 0), 0)
    }

    // We only log a 100-recipient sample; extrapolate to the full audience.
    const { data: campaignInfo } = await supabase
      .from('campaigns')
      .select('audience_count, created_at, status')
      .eq('id', campaignId)
      .single()

    const audienceSize = campaignInfo?.audience_count || totalCount
    const scale = totalCount > 0 ? audienceSize / totalCount : 1

    const finalMetrics = {
      sent: audienceSize,
      delivered: Math.round(delivered * scale),
      opened: Math.round(opened * scale),
      clicked: Math.round(clicked * scale),
      ordered: Math.round(ordered * scale),
      revenue: Math.round(revenue * scale),
    }

    // Failure breakdown — best-effort per-reason (needs failure_reason column),
    // otherwise a single bucket so the breakdown still renders.
    let failures: { reason: string; count: number }[] = []
    if (failed > 0) {
      const { data: failRows, error: failErr } = await supabase
        .from('recipients')
        .select('failure_reason')
        .eq('campaign_id', campaignId)
        .eq('state', 'Failed')
      if (!failErr && failRows && failRows.some((r: any) => r.failure_reason)) {
        const failMap: Record<string, number> = {}
        failRows.forEach((r: any) => {
          const reason = r.failure_reason || 'Delivery failed'
          failMap[reason] = (failMap[reason] || 0) + 1
        })
        failures = Object.entries(failMap).map(([reason, count]) => ({
          reason,
          count: Math.round(count * scale),
        }))
      } else {
        failures = [{ reason: 'Delivery failed', count: Math.round(failed * scale) }]
      }
    }

    // Done once delivery has fully resolved AND the engagement window elapsed.
    // Never regress a campaign that is already Done.
    const elapsedMs = campaignInfo?.created_at
      ? Date.now() - new Date(campaignInfo.created_at).getTime()
      : 0
    const settled = pendingSent === 0 && elapsedMs > COMPLETION_GRACE_MS
    const status = campaignInfo?.status === 'Done' || settled ? 'Done' : 'Live'

    await supabase
      .from('campaigns')
      .update({
        status,
        metrics: finalMetrics,
        attributed_revenue: finalMetrics.revenue,
        funnel: [
          { stage: 'Sent', count: finalMetrics.sent },
          { stage: 'Delivered', count: finalMetrics.delivered },
          { stage: 'Opened', count: finalMetrics.opened },
          { stage: 'Clicked', count: finalMetrics.clicked },
          { stage: 'Order', count: finalMetrics.ordered },
        ],
        failures,
      })
      .eq('id', campaignId)
  }

  res.json({ success: true, applied: true })
})

// 10. GET /campaigns/:id/postmortem — AI analysis postmortem
app.get('/campaigns/:id/postmortem', async (req, res) => {
  const { id } = req.params

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' })
  }

  const m = campaign.metrics
  const openRate = m.delivered > 0 ? Math.round((m.opened / m.delivered) * 100) : 0
  const clickRate = m.opened > 0 ? Math.round((m.clicked / m.opened) * 100) : 0
  const orderRate = m.clicked > 0 ? Math.round((m.ordered / m.clicked) * 100) : 0

  res.json({
    campaignId: id,
    headline: m.ordered > 0 ? 'Strong conversion from morning regulars' : 'Funnel statistics forming',
    retro: [
      `“${campaign.title}” launched over ${campaign.channel} to ${campaign.audience_count.toLocaleString('en-IN')} recipients.`,
      `We observed a ${openRate}% delivery-to-open rate, with ${clickRate}% of readers tapping previews. Finally, ${orderRate}% of those clicks placed orders, driving ₹${(campaign.attributed_revenue || 0).toLocaleString('en-IN')} in total attributed sales.`,
    ],
    highlights: [
      { label: 'Open Rate', value: `${openRate}%`, tone: openRate > 50 ? 'pass' : 'warn' },
      { label: 'Click Rate', value: `${clickRate}%`, tone: clickRate > 25 ? 'pass' : 'warn' },
      { label: 'Orders Placed', value: `${m.ordered} cups`, tone: 'pass' },
    ],
    recommendedNextGoal: 'Win back lapsed regulars from Chennai and Bengaluru',
    recommendedNextTitle: 'Target lapsed regulars',
    recommendedRationale: 'Capitalize on this campaign momentum by targeting lapsed weekly regulars who visited Chennai or Bengaluru and haven\'t placed orders recently.',
  })
})

// Start server
app.listen(port, () => {
  console.log(`🚀 CRM Backend Server running at http://localhost:${port}`)
  console.log(`   Channel Service URL: ${CHANNEL_SERVICE_URL}`)
  console.log(`   AI planning: ${LLM_ENABLED ? `Groq (${LLM_MODEL})` : 'keyword fallback (set GROQ_API_KEY to enable)'}`)
})
