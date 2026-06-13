import {
  CITIES,
  DRINKS,
  type Campaign,
  type CampaignDetail,
  type CampaignPlan,
  type Channel,
  type ChannelMessage,
  type City,
  type Customer,
  type Drink,
  type FilterCondition,
  type Frequency,
  type GuardrailCheck,
  type Outlet,
  type Postmortem,
  type Recipient,
  type TimeHabit,
} from '@/lib/types'

/* ------------------------------------------------------------------ *
 *  Deterministic seed data — a stable mock "database" of Daybreak
 *  Coffee customers, outlets and campaigns. A seeded PRNG keeps counts
 *  identical across reloads so the demo never shifts under you.
 * ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(rng: () => number, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length)]

// ---- Outlets (8 across the 6 metros) ----
export const OUTLETS: Outlet[] = [
  { id: 'o1', name: 'Daybreak Indiranagar', city: 'Bengaluru' },
  { id: 'o2', name: 'Daybreak Koramangala', city: 'Bengaluru' },
  { id: 'o3', name: 'Daybreak Bandra', city: 'Mumbai' },
  { id: 'o4', name: 'Daybreak Lower Parel', city: 'Mumbai' },
  { id: 'o5', name: 'Daybreak Khan Market', city: 'Delhi' },
  { id: 'o6', name: 'Daybreak Nungambakkam', city: 'Chennai' },
  { id: 'o7', name: 'Daybreak Koregaon Park', city: 'Pune' },
  { id: 'o8', name: 'Daybreak Jubilee Hills', city: 'Hyderabad' },
]

const OUTLETS_BY_CITY = CITIES.reduce(
  (acc, c) => {
    acc[c] = OUTLETS.filter((o) => o.city === c)
    return acc
  },
  {} as Record<City, Outlet[]>
)

const FIRST_NAMES = [
  'Priya', 'Arjun', 'Ananya', 'Rohan', 'Sneha', 'Karan', 'Divya', 'Aditya',
  'Meera', 'Vikram', 'Isha', 'Raghav', 'Nisha', 'Aman', 'Kavya', 'Siddharth',
  'Pooja', 'Rahul', 'Tara', 'Nikhil', 'Riya', 'Varun', 'Shreya', 'Akash',
  'Lakshmi', 'Dev', 'Aisha', 'Manish', 'Neha', 'Gaurav', 'Ritika', 'Sanjay',
  'Anjali', 'Harsh', 'Deepa', 'Yash', 'Sara', 'Aryan', 'Madhuri', 'Kunal',
]
const LAST_NAMES = [
  'Sharma', 'Reddy', 'Iyer', 'Patel', 'Nair', 'Mehta', 'Rao', 'Gupta',
  'Kapoor', 'Menon', 'Desai', 'Bhat', 'Joshi', 'Verma', 'Pillai', 'Shetty',
  'Chopra', 'Banerjee', 'Kulkarni', 'Krishnan', 'Malhotra', 'Agarwal',
]

// City weights — bias the audience toward Bengaluru & Mumbai like the brand.
const CITY_WEIGHTS: { city: City; w: number }[] = [
  { city: 'Bengaluru', w: 0.3 },
  { city: 'Mumbai', w: 0.25 },
  { city: 'Delhi', w: 0.15 },
  { city: 'Chennai', w: 0.12 },
  { city: 'Pune', w: 0.1 },
  { city: 'Hyderabad', w: 0.08 },
]

function weightedCity(rng: () => number): City {
  const r = rng()
  let acc = 0
  for (const { city, w } of CITY_WEIGHTS) {
    acc += w
    if (r <= acc) return city
  }
  return 'Bengaluru'
}

function generateCustomers(): Customer[] {
  const rng = mulberry32(42)
  const out: Customer[] = []
  for (let i = 0; i < 2000; i++) {
    const city = weightedCity(rng)
    const store = pick(rng, OUTLETS_BY_CITY[city])
    const frequency = pick<Frequency>(rng, [
      'daily', 'weekly', 'weekly', 'occasional', 'occasional', 'occasional',
    ])
    const timeHabit = pick<TimeHabit>(rng, [
      'morning-office', 'morning-office', 'afternoon', 'weekend', 'weekend',
    ])
    // LTV correlates loosely with frequency
    const base =
      frequency === 'daily' ? 9000 : frequency === 'weekly' ? 4500 : 1800
    const lifetimeValue = Math.round(base + rng() * base * 1.4)
    // recency: a chunk of customers have lapsed
    const lapsed = rng() < 0.32
    const daysSinceLastOrder = lapsed
      ? 60 + Math.floor(rng() * 130)
      : Math.floor(rng() * 45)
    const totalOrders = Math.max(
      1,
      Math.round(lifetimeValue / (220 + rng() * 120))
    )
    out.push({
      id: `c${i + 1}`,
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      city,
      homeStore: store.name,
      favoriteDrink: pick<Drink>(rng, DRINKS),
      frequency,
      timeHabit,
      lifetimeValue,
      daysSinceLastOrder,
      totalOrders,
    })
  }
  return out
}

export const CUSTOMERS = generateCustomers()

/* ------------------------------------------------------------------ *
 *  Filter engine — turns the AI's readable conditions into a real
 *  predicate over the customer set, so audience counts are derived,
 *  not invented.
 * ------------------------------------------------------------------ */

function evalCondition(c: Customer, cond: FilterCondition): boolean {
  const num = (v: FilterCondition['value']) => Number(v)
  switch (cond.field) {
    case 'last_order_days':
      return cond.op === '>'
        ? c.daysSinceLastOrder > num(cond.value)
        : c.daysSinceLastOrder < num(cond.value)
    case 'lifetime_value':
      return cond.op === '>'
        ? c.lifetimeValue > num(cond.value)
        : c.lifetimeValue < num(cond.value)
    case 'visit_frequency':
      return c.frequency === cond.value
    case 'time_habit':
      return c.timeHabit === cond.value
    case 'city':
      return c.city === cond.value
    case 'favorite_drink':
      return c.favoriteDrink === cond.value
    default:
      return true
  }
}

export function applyFilter(
  conditions: FilterCondition[],
  source: Customer[] = CUSTOMERS
): Customer[] {
  return source.filter((c) => conditions.every((cond) => evalCondition(c, cond)))
}

/* ------------------------------------------------------------------ *
 *  Plan generation — keyed off goal keywords so the demo always
 *  produces a believable, fully-derived plan without an LLM.
 * ------------------------------------------------------------------ */

interface Archetype {
  id: string
  match: (g: string) => boolean
  title: string
  conditions: FilterCondition[]
  channel: Channel
  reasoning: string
  persona: (count: number, cities: City[], gap: number) => string
  templates: Record<Channel, { subject?: string; body: string }>
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'lapsed',
    match: (g) =>
      /laps|win.?back|stopped|regular|return|churn|miss|away/.test(g),
    title: 'Win back lapsed regulars',
    conditions: [
      { field: 'last_order_days', op: '>', value: 60, label: 'Last ordered over 60 days ago' },
      { field: 'visit_frequency', op: '=', value: 'weekly', label: 'Was a weekly regular' },
      { field: 'lifetime_value', op: '>', value: 4000, label: 'Lifetime value above ₹4,000' },
    ],
    channel: 'WhatsApp',
    reasoning:
      'These are loyal, time-sensitive customers — WhatsApp gets read receipts and a personal tone that pulls regulars back faster than email.',
    persona: (count, cities, gap) =>
      `~${count.toLocaleString('en-IN')} lapsed regulars, mostly weekday-morning office crowd in ${cities
        .slice(0, 2)
        .join(' & ')}, averaging an ${gap}-week gap since their last cup.`,
    templates: {
      WhatsApp: {
        body: 'Hey {{name}}, your usual {{drink}} is waiting at {{store}} ☕ It’s been a while — here’s 20% off your next one this week. See you soon?',
      },
      SMS: {
        body: 'Daybreak: Hey {{name}}, miss your {{drink}}? 20% off at {{store}} this week. Reply STOP to opt out.',
      },
      Email: {
        subject: 'Your {{drink}} misses you, {{name}}',
        body: 'Hi {{name}},\n\nIt’s been a while since your last visit to {{store}}. Your favourite {{drink}} is just the way you like it — and this week it’s 20% off.\n\nWe saved your table. See you soon,\nThe Daybreak team',
      },
      RCS: {
        body: '{{name}}, your {{drink}} is waiting at {{store}} ☕ Tap below for 20% off this week.',
      },
    },
  },
  {
    id: 'top-spenders',
    match: (g) => /top.?spend|vip|loyal|reward|best|high.?value|premium/.test(g),
    title: 'Reward top spenders',
    conditions: [
      { field: 'lifetime_value', op: '>', value: 9000, label: 'Lifetime value above ₹9,000' },
      { field: 'visit_frequency', op: '=', value: 'daily', label: 'Daily visitor' },
    ],
    channel: 'WhatsApp',
    reasoning:
      'Your highest-value daily regulars deserve a concierge feel — WhatsApp lets you offer a personal perk that lands like a thank-you, not a blast.',
    persona: (count, cities) =>
      `~${count.toLocaleString('en-IN')} top spenders — daily visitors with ₹9k+ lifetime value, concentrated in ${cities
        .slice(0, 2)
        .join(' & ')}. Your most reliable morning faces.`,
    templates: {
      WhatsApp: {
        body: 'Hi {{name}} 👋 You’re one of our favourite faces at {{store}}. Your next {{drink}} is on us — just show this message at the counter. Thank you for being a regular ☕',
      },
      SMS: {
        body: 'Daybreak: {{name}}, your next {{drink}} at {{store}} is on us — our thanks for being a regular. Show this at the counter.',
      },
      Email: {
        subject: 'A coffee on us, {{name}}',
        body: 'Hi {{name}},\n\nYou’re one of the regulars who make {{store}} feel like home. As a small thank-you, your next {{drink}} is on the house.\n\nWith gratitude,\nThe Daybreak team',
      },
      RCS: {
        body: '{{name}}, your next {{drink}} at {{store}} is on us ☕ Tap to claim — our thanks for being a regular.',
      },
    },
  },
  {
    id: 'morning',
    match: (g) => /morning|weekday|office|commute|am |breakfast|early/.test(g),
    title: 'Re-engage the weekday morning crowd',
    conditions: [
      { field: 'time_habit', op: '=', value: 'morning-office', label: 'Weekday-morning office habit' },
      { field: 'last_order_days', op: '>', value: 21, label: 'Quieter for 3+ weeks' },
    ],
    channel: 'SMS',
    reasoning:
      'Morning-commute customers decide fast and act on impulse — a short SMS that lands at 8am beats a richer channel they’ll open at lunch.',
    persona: (count, cities) =>
      `~${count.toLocaleString('en-IN')} weekday-morning office regulars who’ve gone a little quiet, mostly around ${cities
        .slice(0, 2)
        .join(' & ')} business districts.`,
    templates: {
      WhatsApp: {
        body: 'Morning {{name}} ☀️ Beat the queue at {{store}} — pre-order your {{drink}} and it’s ready when you arrive. 15% off before 10am.',
      },
      SMS: {
        body: 'Daybreak: Morning {{name}}! Your {{drink}} at {{store}}, 15% off before 10am. Pre-order & skip the queue.',
      },
      Email: {
        subject: 'Skip the morning queue, {{name}}',
        body: 'Hi {{name}},\n\nMornings are better with less waiting. Pre-order your {{drink}} at {{store}} and we’ll have it ready — 15% off before 10am.\n\nSee you bright and early,\nDaybreak',
      },
      RCS: {
        body: 'Morning {{name}} ☀️ Pre-order your {{drink}} at {{store}}, 15% off before 10am. Tap to order.',
      },
    },
  },
  {
    id: 'weekend',
    match: (g) => /weekend|saturday|sunday|leisure|brunch|family/.test(g),
    title: 'Drive weekend visits',
    conditions: [
      { field: 'time_habit', op: '=', value: 'weekend', label: 'Weekend visitor' },
      { field: 'lifetime_value', op: '>', value: 3000, label: 'Lifetime value above ₹3,000' },
    ],
    channel: 'Email',
    reasoning:
      'Weekend customers browse at leisure — email gives room for imagery and a seasonal story they’ll actually read over a slow Saturday.',
    persona: (count, cities) =>
      `~${count.toLocaleString('en-IN')} weekend regulars who treat Daybreak as a ritual, spread across ${cities
        .slice(0, 3)
        .join(', ')}.`,
    templates: {
      WhatsApp: {
        body: 'Hi {{name}} 🌿 This weekend at {{store}}: our new seasonal special, and your {{drink}} done right. Bring someone along — second cup half price.',
      },
      SMS: {
        body: 'Daybreak: {{name}}, this weekend at {{store}} — seasonal special + your {{drink}}. Second cup half price.',
      },
      Email: {
        subject: 'Your weekend table at {{store}}, {{name}}',
        body: 'Hi {{name}},\n\nSlow down this weekend. We’ve a new seasonal special on the bar, and your {{drink}} is always ready at {{store}}. Bring a friend — second cup’s half price.\n\nSee you Saturday,\nDaybreak',
      },
      RCS: {
        body: '{{name}}, this weekend at {{store}}: seasonal special + your {{drink}}. Second cup half price. Tap for more.',
      },
    },
  },
]

const DEFAULT_ARCHETYPE: Archetype = {
  id: 'engaged',
  match: () => true,
  title: 'Re-engage active customers',
  conditions: [
    { field: 'last_order_days', op: '>', value: 30, label: 'Quieter for 30+ days' },
    { field: 'lifetime_value', op: '>', value: 3000, label: 'Lifetime value above ₹3,000' },
  ],
  channel: 'WhatsApp',
  reasoning:
    'A broad, warm nudge works best on WhatsApp where open rates stay high and the tone feels personal.',
  persona: (count, cities) =>
    `~${count.toLocaleString('en-IN')} customers worth re-engaging, mostly in ${cities
      .slice(0, 2)
      .join(' & ')}.`,
  templates: {
    WhatsApp: {
      body: 'Hey {{name}}, we’ve missed you at {{store}} ☕ Your {{drink}} and a little something extra are waiting — pop in this week?',
    },
    SMS: {
      body: 'Daybreak: {{name}}, we’ve missed you at {{store}}! Your {{drink}} + a treat await. Pop in this week.',
    },
    Email: {
      subject: 'We saved your spot, {{name}}',
      body: 'Hi {{name}},\n\nWe’ve missed you at {{store}}. Your {{drink}} is ready whenever you are — and there’s a little something extra waiting this week.\n\nSee you soon,\nDaybreak',
    },
    RCS: {
      body: 'Hey {{name}}, your {{drink}} is waiting at {{store}} ☕ Tap to see what’s new this week.',
    },
  },
}

function topCities(customers: Customer[]): City[] {
  const counts = new Map<City, number>()
  for (const c of customers) counts.set(c.city, (counts.get(c.city) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city)
}

function fillTemplate(body: string, c: Customer): string {
  return body
    .replace(/{{name}}/g, c.name.split(' ')[0])
    .replace(/{{drink}}/g, c.favoriteDrink.toLowerCase())
    .replace(/{{store}}/g, c.homeStore)
}

function buildMessages(
  arch: Archetype,
  sample: Customer[],
  shorten: boolean
): ChannelMessage[] {
  return (Object.keys(arch.templates) as Channel[]).map((channel) => {
    const tpl = arch.templates[channel]
    const previews = sample.slice(0, 3).map((c) => {
      let body = fillTemplate(tpl.body, c)
      if (shorten && channel !== 'Email') {
        body = body.split(/(?<=[.!?])\s/)[0] // keep just the first sentence
      }
      return {
        customerName: c.name,
        drink: c.favoriteDrink,
        store: c.homeStore,
        body,
      }
    })
    return {
      channel,
      subject: tpl.subject,
      template: tpl.body,
      previews,
    }
  })
}

function buildGuardrails(
  count: number,
  channel: Channel,
  shorten: boolean
): GuardrailCheck[] {
  return [
    {
      id: 'over-messaging',
      label: 'Over-messaging',
      status: count > 1500 ? 'warn' : 'pass',
      note:
        count > 1500
          ? `${count.toLocaleString('en-IN')} recipients — consider splitting the send to protect deliverability.`
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
      status: channel === 'SMS' ? 'pass' : 'pass',
      note:
        channel === 'SMS'
          ? 'STOP opt-out present in SMS copy.'
          : 'Channel supports native unsubscribe.',
    },
  ]
}

const CITY_LOOKUP: Record<string, City> = {
  bengaluru: 'Bengaluru',
  bangalore: 'Bengaluru',
  mumbai: 'Mumbai',
  delhi: 'Delhi',
  chennai: 'Chennai',
  pune: 'Pune',
  hyderabad: 'Hyderabad',
}

/** Build a full, derived plan from a goal + optional refinement messages. */
export function buildPlan(goal: string, refinements: string[] = []): CampaignPlan {
  const allText = [goal, ...refinements].join(' ').toLowerCase()
  const arch = ARCHETYPES.find((a) => a.match(allText)) ?? DEFAULT_ARCHETYPE

  // start from the archetype's conditions, then apply refinements
  let conditions = arch.conditions.map((c) => ({ ...c }))
  let channel = arch.channel
  let shorten = false

  for (const r of refinements) {
    const t = r.toLowerCase()
    // city narrowing
    for (const [key, city] of Object.entries(CITY_LOOKUP)) {
      if (t.includes(key)) {
        conditions = conditions.filter((c) => c.field !== 'city')
        conditions.push({
          field: 'city',
          op: '=',
          value: city,
          label: `Only ${city} stores`,
        })
      }
    }
    if (/short|brief|tighter|cut|trim/.test(t)) shorten = true
    if (/whatsapp/.test(t)) channel = 'WhatsApp'
    else if (/\bsms\b|text/.test(t)) channel = 'SMS'
    else if (/email|mail/.test(t)) channel = 'Email'
    else if (/\brcs\b/.test(t)) channel = 'RCS'
  }

  const audience = applyFilter(conditions)
  const cities = topCities(audience)
  const avgGap =
    audience.length > 0
      ? Math.round(
          audience.reduce((s, c) => s + c.daysSinceLastOrder, 0) /
            audience.length /
            7
        )
      : 0
  const sample = audience.slice(0, 6)

  const reasoning =
    channel === arch.channel
      ? arch.reasoning
      : `${channel} chosen per your refinement — copy adapted to fit the channel.`

  return {
    id: `plan_${Date.now()}`,
    goal,
    title: arch.title,
    audience: {
      count: audience.length,
      persona: arch.persona(audience.length, cities, avgGap),
      filter: { conditions },
      topCities: cities.slice(0, 3),
      avgGapWeeks: avgGap,
    },
    messages: buildMessages(arch, sample, shorten),
    recommendedChannel: channel,
    channelReasoning: reasoning,
    guardrails: buildGuardrails(audience.length, channel, shorten),
  }
}

/* ------------------------------------------------------------------ *
 *  Seed campaigns with full funnel stats.
 * ------------------------------------------------------------------ */

function makeFunnel(sent: number, rng: () => number) {
  const delivered = Math.round(sent * (0.9 + rng() * 0.07))
  const opened = Math.round(delivered * (0.45 + rng() * 0.2))
  const clicked = Math.round(opened * (0.3 + rng() * 0.2))
  const ordered = Math.round(clicked * (0.25 + rng() * 0.2))
  return { sent, delivered, opened, clicked, ordered }
}

function makeFailures(sent: number, delivered: number) {
  const failed = sent - delivered
  if (failed <= 0) return []
  return [
    { reason: 'Invalid number', count: Math.round(failed * 0.45) },
    { reason: 'Opted out', count: Math.round(failed * 0.3) },
    { reason: 'Carrier rejected', count: Math.round(failed * 0.15) },
    { reason: 'Expired token', count: failed - Math.round(failed * 0.9) },
  ].filter((f) => f.count > 0)
}

interface SeedDef {
  id: string
  title: string
  goal: string
  status: Campaign['status']
  channel: Channel
  audienceCount: number
  daysAgo: number
  persona: string
  filter: FilterCondition[]
  avgOrderValue: number
}

const SEED_DEFS: SeedDef[] = [
  {
    id: 'camp_1',
    title: 'Win back lapsed regulars',
    goal: 'Win back regulars who stopped coming',
    status: 'Done',
    channel: 'WhatsApp',
    audienceCount: 1240,
    daysAgo: 14,
    persona:
      '~1,240 lapsed regulars, mostly weekday-morning office crowd in Bengaluru & Mumbai, averaging an 11-week gap.',
    filter: [
      { field: 'last_order_days', op: '>', value: 60, label: 'Last ordered over 60 days ago' },
      { field: 'visit_frequency', op: '=', value: 'weekly', label: 'Was a weekly regular' },
      { field: 'lifetime_value', op: '>', value: 4000, label: 'Lifetime value above ₹4,000' },
    ],
    avgOrderValue: 340,
  },
  {
    id: 'camp_2',
    title: 'Reward top spenders',
    goal: 'Reward my top spenders',
    status: 'Live',
    channel: 'WhatsApp',
    audienceCount: 410,
    daysAgo: 3,
    persona:
      '~410 top spenders — daily visitors with ₹9k+ lifetime value, concentrated in Bengaluru & Mumbai.',
    filter: [
      { field: 'lifetime_value', op: '>', value: 9000, label: 'Lifetime value above ₹9,000' },
      { field: 'visit_frequency', op: '=', value: 'daily', label: 'Daily visitor' },
    ],
    avgOrderValue: 520,
  },
  {
    id: 'camp_3',
    title: 'Re-engage the weekday morning crowd',
    goal: 'Re-engage the weekday morning crowd',
    status: 'Sending',
    channel: 'SMS',
    audienceCount: 880,
    daysAgo: 0,
    persona:
      '~880 weekday-morning office regulars who’ve gone a little quiet around Bengaluru & Mumbai business districts.',
    filter: [
      { field: 'time_habit', op: '=', value: 'morning-office', label: 'Weekday-morning office habit' },
      { field: 'last_order_days', op: '>', value: 21, label: 'Quieter for 3+ weeks' },
    ],
    avgOrderValue: 280,
  },
  {
    id: 'camp_4',
    title: 'Drive weekend visits',
    goal: 'Get more weekend footfall',
    status: 'Draft',
    channel: 'Email',
    audienceCount: 1530,
    daysAgo: 1,
    persona:
      '~1,530 weekend regulars who treat Daybreak as a ritual, spread across Bengaluru, Mumbai and Pune.',
    filter: [
      { field: 'time_habit', op: '=', value: 'weekend', label: 'Weekend visitor' },
      { field: 'lifetime_value', op: '>', value: 3000, label: 'Lifetime value above ₹3,000' },
    ],
    avgOrderValue: 410,
  },
]

function buildCampaign(def: SeedDef): Campaign {
  const rng = mulberry32(def.id.length * 7 + def.audienceCount)
  // Draft = nothing sent yet; Sending = partial; Live/Done = full
  let sent = def.audienceCount
  if (def.status === 'Draft') sent = 0
  else if (def.status === 'Sending') sent = Math.round(def.audienceCount * 0.55)

  const f = makeFunnel(sent, rng)
  const revenue = f.ordered * def.avgOrderValue
  const created = new Date()
  created.setDate(created.getDate() - def.daysAgo)
  return {
    id: def.id,
    title: def.title,
    goal: def.goal,
    status: def.status,
    channel: def.channel,
    audienceCount: def.audienceCount,
    createdAt: created.toISOString(),
    metrics: {
      sent: f.sent,
      delivered: f.delivered,
      opened: f.opened,
      clicked: f.clicked,
      ordered: f.ordered,
      revenue,
    },
  }
}

export const CAMPAIGNS: Campaign[] = SEED_DEFS.map(buildCampaign)

function buildRecipients(def: SeedDef, c: Campaign): Recipient[] {
  const rng = mulberry32(def.audienceCount + 11)
  const pool = applyFilter(def.filter)
  const sample = (pool.length ? pool : CUSTOMERS).slice(0, 60)
  const { delivered, opened, clicked, ordered, sent } = c.metrics
  return sample.map((cust, i) => {
    const r = (i + 0.5) / sample.length
    let state: Recipient['state']
    let orderValue: number | null = null
    const failRatio = 1 - delivered / Math.max(sent, 1)
    if (sent === 0) {
      state = 'Sent'
    } else if (r < failRatio) {
      state = 'Failed'
    } else if (r < ordered / sent) {
      state = 'Ordered'
      orderValue = def.avgOrderValue + Math.round((rng() - 0.5) * 200)
    } else if (r < clicked / sent) {
      state = 'Clicked'
    } else if (r < opened / sent) {
      state = 'Opened'
    } else if (r < delivered / sent) {
      state = 'Delivered'
    } else {
      state = 'Sent'
    }
    return {
      customerId: cust.id,
      name: cust.name,
      city: cust.city,
      state,
      orderValue,
    }
  })
}

export function buildCampaignDetail(id: string): CampaignDetail | undefined {
  const def = SEED_DEFS.find((d) => d.id === id)
  const c = CAMPAIGNS.find((x) => x.id === id)
  if (!def || !c) return undefined
  const m = c.metrics
  return {
    ...c,
    persona: def.persona,
    filter: { conditions: def.filter },
    funnel: [
      { stage: 'Sent', count: m.sent },
      { stage: 'Delivered', count: m.delivered },
      { stage: 'Read', count: Math.round(m.delivered * 0.57) },
      { stage: 'Opened', count: m.opened },
      { stage: 'Clicked', count: m.clicked },
      { stage: 'Order', count: m.ordered },
    ],
    failures: makeFailures(m.sent, m.delivered),
    attributedRevenue: m.revenue,
    recipients: buildRecipients(def, c),
    dedupWarning: null,
  }
}

/* ------------------------------------------------------------------ *
 *  Postmortems — plain-English retro + next-campaign recommendation.
 * ------------------------------------------------------------------ */

const POSTMORTEMS: Record<string, Omit<Postmortem, 'campaignId'>> = {
  camp_1: {
    headline: 'A strong win-back — WhatsApp paid off',
    retro: [
      'This campaign reactivated lapsed weekly regulars with a personal WhatsApp nudge and a 20% offer. Delivery held at 94%, and open rates were unusually high for a win-back — the read-receipt intimacy of WhatsApp clearly helped.',
      'The conversion to an order was the standout: customers who clicked through ordered at well above the benchmark, suggesting the offer was sized right and the timing (early week) caught people planning their coffee runs.',
      'Bengaluru and Mumbai drove most of the revenue. The handful of invalid numbers are worth cleaning before the next send.',
    ],
    highlights: [
      { label: 'Attributed revenue', value: 'recovered ~₹', tone: 'pass' },
      { label: 'Delivery rate', value: '94%', tone: 'pass' },
      { label: 'Invalid numbers', value: 'worth a cleanup', tone: 'warn' },
    ],
    recommendedNextGoal:
      'Reward my top spenders to lock in the regulars we just won back',
    recommendedNextTitle: 'Reward top spenders',
    recommendedRationale:
      'You’ve just re-activated a wave of regulars. Convert that momentum into loyalty by giving your highest-value daily visitors a concierge thank-you before they drift again.',
  },
  camp_2: {
    headline: 'Loyalty reward landing well — early signal is positive',
    retro: [
      'A gratitude-led WhatsApp message to daily, high-LTV regulars. Three days in, deliverability and opens are excellent — this audience is engaged and reachable.',
      'Because the offer is a gift rather than a discount, redemption is steady without eroding margin. Keep an eye on whether order values hold once the free drink is claimed.',
    ],
    highlights: [
      { label: 'Open rate', value: 'excellent', tone: 'pass' },
      { label: 'Margin impact', value: 'gift, not discount', tone: 'pass' },
      { label: 'Status', value: 'still live', tone: 'warn' },
    ],
    recommendedNextGoal: 'Re-engage the weekday morning crowd who have gone quiet',
    recommendedNextTitle: 'Re-engage the weekday morning crowd',
    recommendedRationale:
      'With your VIPs handled, the biggest untapped pocket is morning-office regulars who’ve slipped to fortnightly. A timed SMS can rebuild the daily habit.',
  },
  camp_3: {
    headline: 'Mid-send — morning SMS is moving',
    retro: [
      'Roughly half the audience has been sent so far. SMS delivery is strong and the pre-order angle is generating early clicks during the morning window, exactly as intended.',
      'Watch the post-10am drop-off: the offer expires at 10am by design, so late-openers won’t convert. Consider a follow-up wave timed to the commute.',
    ],
    highlights: [
      { label: 'Progress', value: '~55% sent', tone: 'warn' },
      { label: 'Delivery', value: 'strong', tone: 'pass' },
      { label: 'Timing risk', value: 'post-10am drop', tone: 'warn' },
    ],
    recommendedNextGoal: 'Drive weekend visits with a seasonal special',
    recommendedNextTitle: 'Drive weekend visits',
    recommendedRationale:
      'Weekday habits are being rebuilt. Extend the same customers into their leisure time with a weekend ritual offer to grow share of week.',
  },
  camp_4: {
    headline: 'Draft — ready to launch when you are',
    retro: [
      'This weekend campaign hasn’t sent yet. The audience is large (~1,530), so the guardrail flagged splitting the send to protect email deliverability.',
      'Email suits the leisurely weekend browse — give the seasonal special strong imagery and a single clear call to action.',
    ],
    highlights: [
      { label: 'Status', value: 'not sent', tone: 'warn' },
      { label: 'Audience size', value: 'large — split send', tone: 'warn' },
      { label: 'Channel fit', value: 'email suits weekend', tone: 'pass' },
    ],
    recommendedNextGoal: 'Win back regulars who stopped coming',
    recommendedNextTitle: 'Win back lapsed regulars',
    recommendedRationale:
      'Before chasing new weekend footfall, recover the lapsed regulars already in your base — they convert cheaper than acquiring fresh weekend traffic.',
  },
}

export function buildPostmortem(id: string): Postmortem | undefined {
  const base = POSTMORTEMS[id]
  const c = CAMPAIGNS.find((x) => x.id === id)
  if (!base || !c) return undefined
  // splice the real revenue figure into the first highlight where relevant
  const highlights = base.highlights.map((h) =>
    h.value.startsWith('recovered ~₹')
      ? { ...h, value: `₹${c.metrics.revenue.toLocaleString('en-IN')}` }
      : h
  )
  return { campaignId: id, ...base, highlights }
}

/* ------------------------------------------------------------------ *
 *  Saved audiences.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 *  Runtime store — campaigns launched during the session. Kept in
 *  memory so the Co-pilot → dashboard loop works end-to-end without a
 *  backend. Merged ahead of the seed campaigns everywhere.
 * ------------------------------------------------------------------ */

const RUNTIME_CAMPAIGNS: Campaign[] = []
const RUNTIME_DETAILS: Record<string, CampaignDetail> = {}
const RUNTIME_POSTMORTEMS: Record<string, Postmortem> = {}

export function listAllCampaigns(): Campaign[] {
  return [...RUNTIME_CAMPAIGNS, ...CAMPAIGNS]
}

export function getCampaignDetail(id: string): CampaignDetail | undefined {
  return RUNTIME_DETAILS[id] ?? buildCampaignDetail(id)
}

export function getPostmortemFor(id: string): Postmortem | undefined {
  return RUNTIME_POSTMORTEMS[id] ?? buildPostmortem(id)
}

/** Persist a launched plan as a Live campaign with a freshly-derived funnel. */
export function launchPlan(plan: CampaignPlan): Campaign {
  const rng = mulberry32(plan.audience.count + 99)
  const sent = plan.audience.count
  const f = makeFunnel(sent, rng)
  const avgOrderValue = 360
  const revenue = f.ordered * avgOrderValue
  const id = `camp_live_${RUNTIME_CAMPAIGNS.length + 1}_${Date.now() % 100000}`

  const campaign: Campaign = {
    id,
    title: plan.title,
    goal: plan.goal,
    status: 'Live',
    channel: plan.recommendedChannel,
    audienceCount: plan.audience.count,
    createdAt: new Date().toISOString(),
    metrics: {
      sent: f.sent,
      delivered: f.delivered,
      opened: f.opened,
      clicked: f.clicked,
      ordered: f.ordered,
      revenue,
    },
  }
  RUNTIME_CAMPAIGNS.unshift(campaign)

  // derive recipients from the plan's compiled filter
  const pool = applyFilter(plan.audience.filter.conditions)
  const sample = (pool.length ? pool : CUSTOMERS).slice(0, 60)
  const m = campaign.metrics
  const recipients: Recipient[] = sample.map((cust, i) => {
    const r = (i + 0.5) / sample.length
    let state: Recipient['state'] = 'Sent'
    let orderValue: number | null = null
    const failRatio = 1 - m.delivered / Math.max(m.sent, 1)
    if (r < failRatio) state = 'Failed'
    else if (r < m.ordered / m.sent) {
      state = 'Ordered'
      orderValue = avgOrderValue + Math.round((rng() - 0.5) * 200)
    } else if (r < m.clicked / m.sent) state = 'Clicked'
    else if (r < m.opened / m.sent) state = 'Opened'
    else if (r < m.delivered / m.sent) state = 'Delivered'
    return { customerId: cust.id, name: cust.name, city: cust.city, state, orderValue }
  })

  RUNTIME_DETAILS[id] = {
    ...campaign,
    persona: plan.audience.persona,
    filter: plan.audience.filter,
    funnel: [
      { stage: 'Sent', count: m.sent },
      { stage: 'Delivered', count: m.delivered },
      { stage: 'Read', count: Math.round(m.delivered * 0.57) },
      { stage: 'Opened', count: m.opened },
      { stage: 'Clicked', count: m.clicked },
      { stage: 'Order', count: m.ordered },
    ],
    failures: makeFailures(m.sent, m.delivered),
    attributedRevenue: m.revenue,
    recipients,
    dedupWarning: null,
  }

  RUNTIME_POSTMORTEMS[id] = {
    campaignId: id,
    headline: 'Just launched — early numbers forming',
    retro: [
      `“${plan.title}” went live on ${plan.recommendedChannel} to ${plan.audience.count.toLocaleString('en-IN')} recipients. ${plan.channelReasoning}`,
      'First delivery and open numbers are landing now. Check back as the funnel fills out — clicks and orders typically follow within the first few hours.',
    ],
    highlights: [
      { label: 'Channel', value: plan.recommendedChannel, tone: 'pass' },
      { label: 'Audience', value: `${plan.audience.count.toLocaleString('en-IN')} recipients`, tone: 'pass' },
      { label: 'Status', value: 'just launched', tone: 'warn' },
    ],
    recommendedNextGoal: 'Reward my top spenders to deepen loyalty',
    recommendedNextTitle: 'Reward top spenders',
    recommendedRationale:
      'Once this send settles, convert the customers who engaged into repeat regulars with a targeted thank-you to your highest-value visitors.',
  }

  return campaign
}

export function buildAudiences() {
  const defs: { id: string; name: string; persona: string; filter: FilterCondition[] }[] = [
    {
      id: 'aud_1',
      name: 'Lapsed regulars',
      persona: 'Weekly regulars who’ve gone quiet for 60+ days — prime for win-back.',
      filter: [
        { field: 'last_order_days', op: '>', value: 60, label: 'Last ordered over 60 days ago' },
        { field: 'visit_frequency', op: '=', value: 'weekly', label: 'Was a weekly regular' },
        { field: 'lifetime_value', op: '>', value: 4000, label: 'Lifetime value above ₹4,000' },
      ],
    },
    {
      id: 'aud_2',
      name: 'Top spenders',
      persona: 'Daily visitors with ₹9k+ lifetime value — your VIP regulars.',
      filter: [
        { field: 'lifetime_value', op: '>', value: 9000, label: 'Lifetime value above ₹9,000' },
        { field: 'visit_frequency', op: '=', value: 'daily', label: 'Daily visitor' },
      ],
    },
    {
      id: 'aud_3',
      name: 'Weekday morning crowd',
      persona: 'Office-commute regulars with a morning habit across metro business districts.',
      filter: [
        { field: 'time_habit', op: '=', value: 'morning-office', label: 'Weekday-morning office habit' },
      ],
    },
    {
      id: 'aud_4',
      name: 'Weekend ritualists',
      persona: 'Customers who treat Daybreak as a slow weekend ritual.',
      filter: [
        { field: 'time_habit', op: '=', value: 'weekend', label: 'Weekend visitor' },
        { field: 'lifetime_value', op: '>', value: 3000, label: 'Lifetime value above ₹3,000' },
      ],
    },
  ]
  return defs.map((d) => {
    const members = applyFilter(d.filter)
    return {
      id: d.id,
      name: d.name,
      persona: d.persona,
      count: members.length,
      filter: { conditions: d.filter },
      topCities: topCities(members).slice(0, 3),
    }
  })
}
