import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// --- Constants matches frontend mockData.ts ---
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Pune', 'Hyderabad'] as const
const DRINKS = ['Latte', 'Cappuccino', 'Flat White', 'Cortado', 'Cold Brew', 'Pour-Over', 'Seasonal Special'] as const

const OUTLETS = [
  { id: 'o1', name: 'Daybreak Indiranagar', city: 'Bengaluru' },
  { id: 'o2', name: 'Daybreak Koramangala', city: 'Bengaluru' },
  { id: 'o3', name: 'Daybreak Bandra', city: 'Mumbai' },
  { id: 'o4', name: 'Daybreak Lower Parel', city: 'Mumbai' },
  { id: 'o5', name: 'Daybreak Khan Market', city: 'Delhi' },
  { id: 'o6', name: 'Daybreak Nungambakkam', city: 'Chennai' },
  { id: 'o7', name: 'Daybreak Koregaon Park', city: 'Pune' },
  { id: 'o8', name: 'Daybreak Jubilee Hills', city: 'Hyderabad' },
] as const

const OUTLETS_BY_CITY: Record<string, typeof OUTLETS[number][]> = {}
for (const city of CITIES) {
  OUTLETS_BY_CITY[city] = OUTLETS.filter((o) => o.city === city)
}

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

const CITY_WEIGHTS = [
  { city: 'Bengaluru', w: 0.3 },
  { city: 'Mumbai', w: 0.25 },
  { city: 'Delhi', w: 0.15 },
  { city: 'Chennai', w: 0.12 },
  { city: 'Pune', w: 0.1 },
  { city: 'Hyderabad', w: 0.08 },
]

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

function weightedCity(rng: () => number): typeof CITIES[number] {
  const r = rng()
  let acc = 0
  for (const { city, w } of CITY_WEIGHTS) {
    acc += w
    if (r <= acc) return city as any
  }
  return 'Bengaluru'
}

// Build customers AND their order history together. Orders are the source of
// truth: each customer's lifetime_value / total_orders / days_since_last_order
// are DERIVED by summing/counting their generated orders, so the aggregates the
// UI shows are provably backed by real rows (and "this order came from this
// communication" can be a genuine foreign-key link, not a number on a recipient).
function generateData() {
  const rng = mulberry32(42)
  const customers: any[] = []
  const orders: any[] = []
  const now = Date.now()
  const DAY = 86_400_000
  let orderSeq = 0

  for (let i = 0; i < 2000; i++) {
    const city = weightedCity(rng)
    const store = pick(rng, OUTLETS_BY_CITY[city])
    const frequency = pick(rng, [
      'daily', 'weekly', 'weekly', 'occasional', 'occasional', 'occasional',
    ])
    const timeHabit = pick(rng, [
      'morning-office', 'morning-office', 'afternoon', 'weekend', 'weekend',
    ])
    const favoriteDrink = pick(rng, DRINKS)
    const lapsed = rng() < 0.32
    const daysSinceLastOrder = lapsed
      ? 60 + Math.floor(rng() * 130)
      : Math.floor(rng() * 45)

    // How many past orders, and the typical gap between them, by frequency.
    const orderCount =
      frequency === 'daily'
        ? 20 + Math.floor(rng() * 30) // 20–49
        : frequency === 'weekly'
          ? 8 + Math.floor(rng() * 16) // 8–23
          : 2 + Math.floor(rng() * 7) // 2–8
    const gapDays = frequency === 'daily' ? 2 : frequency === 'weekly' ? 9 : 30

    // Walk backwards from the most recent order (daysSinceLastOrder ago).
    let dayCursor = daysSinceLastOrder
    let lifetimeValue = 0
    for (let j = 0; j < orderCount; j++) {
      const amount = 180 + Math.floor(rng() * 300) // ₹180–₹479
      lifetimeValue += amount
      orders.push({
        id: `o${++orderSeq}`,
        customer_id: `c${i + 1}`,
        amount,
        // mostly the usual, occasionally something else
        drink: rng() < 0.75 ? favoriteDrink : pick(rng, DRINKS),
        store: store.name,
        ordered_at: new Date(now - dayCursor * DAY).toISOString(),
        campaign_id: null,
      })
      dayCursor += Math.max(1, Math.round(gapDays * (0.5 + rng())))
    }

    customers.push({
      id: `c${i + 1}`,
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      city,
      home_store: store.name,
      favorite_drink: favoriteDrink,
      frequency,
      time_habit: timeHabit,
      // derived from the order rows above
      lifetime_value: lifetimeValue,
      days_since_last_order: daysSinceLastOrder,
      total_orders: orderCount,
    })
  }

  return { customers, orders }
}

async function runSeed() {
  console.log('🌱 Starting Supabase Seeding...')

  const { customers, orders } = generateData()
  console.log(`Generated ${customers.length} customers + ${orders.length} orders. Cleaning up old tables...`)

  // Clear existing data. Delete orders first (FK → customers), then customers.
  // (Deleting customers cascades, but we're explicit so a missing orders table
  // surfaces clearly rather than failing the cascade silently.)
  await supabase.from('orders').delete().neq('id', '')
  const { error: deleteError } = await supabase.from('customers').delete().neq('id', '')
  if (deleteError) {
    console.error('Error clearing old customers:', deleteError)
    process.exit(1)
  }

  // Insert customers in chunks of 200
  const chunkSize = 200
  for (let i = 0; i < customers.length; i += chunkSize) {
    const chunk = customers.slice(i, i + chunkSize)
    const { error } = await supabase.from('customers').insert(chunk)
    if (error) {
      console.error(`Error inserting chunk ${i} to ${i + chunkSize}:`, error)
      process.exit(1)
    }
    console.log(`Successfully inserted customers ${i + 1} to ${Math.min(i + chunkSize, customers.length)}`)
  }

  // Insert orders in chunks of 1000 (customers must exist first for the FK).
  console.log(`Inserting ${orders.length} orders...`)
  const orderChunk = 1000
  for (let i = 0; i < orders.length; i += orderChunk) {
    const chunk = orders.slice(i, i + orderChunk)
    const { error } = await supabase.from('orders').insert(chunk)
    if (error) {
      console.error(`Error inserting orders ${i} to ${i + orderChunk}:`, error)
      console.error('Did you run migrations/002_add_orders.sql (or schema.sql) first?')
      process.exit(1)
    }
    console.log(`Successfully inserted orders ${i + 1} to ${Math.min(i + orderChunk, orders.length)}`)
  }

  console.log('Seeding pre-built audiences...')
  // Clean old audiences
  await supabase.from('audiences').delete().neq('id', '')

  const audiences = [
    {
      id: 'aud_1',
      name: 'Lapsed regulars',
      persona: 'Weekly regulars who’ve gone quiet for 60+ days — prime for win-back.',
      count: 0, // Will compute
      filter: {
        conditions: [
          { field: 'last_order_days', op: '>', value: 60, label: 'Last ordered over 60 days ago' },
          { field: 'visit_frequency', op: '=', value: 'weekly', label: 'Was a weekly regular' },
          { field: 'lifetime_value', op: '>', value: 4000, label: 'Lifetime value above ₹4,000' },
        ]
      },
      top_cities: ['Bengaluru', 'Mumbai', 'Chennai']
    },
    {
      id: 'aud_2',
      name: 'Top spenders',
      persona: 'Daily visitors with ₹9k+ lifetime value — your VIP regulars.',
      count: 0,
      filter: {
        conditions: [
          { field: 'lifetime_value', op: '>', value: 9000, label: 'Lifetime value above ₹9,000' },
          { field: 'visit_frequency', op: '=', value: 'daily', label: 'Daily visitor' },
        ]
      },
      top_cities: ['Bengaluru', 'Mumbai', 'Delhi']
    },
    {
      id: 'aud_3',
      name: 'Weekday morning crowd',
      persona: 'Office-commute regulars with a morning habit across metro business districts.',
      count: 0,
      filter: {
        conditions: [
          { field: 'time_habit', op: '=', value: 'morning-office', label: 'Weekday-morning office habit' },
        ]
      },
      top_cities: ['Bengaluru', 'Mumbai', 'Delhi']
    },
    {
      id: 'aud_4',
      name: 'Weekend ritualists',
      persona: 'Customers who treat Daybreak as a slow weekend ritual.',
      count: 0,
      filter: {
        conditions: [
          { field: 'time_habit', op: '=', value: 'weekend', label: 'Weekend visitor' },
          { field: 'lifetime_value', op: '>', value: 3000, label: 'Lifetime value above ₹3,000' },
        ]
      },
      top_cities: ['Bengaluru', 'Mumbai', 'Pune']
    }
  ]

  // Count matches for each audience and save to db
  for (const aud of audiences) {
    let matches = customers
    for (const cond of aud.filter.conditions) {
      matches = matches.filter((c: any) => {
        if (cond.field === 'last_order_days') {
          return cond.op === '>' ? c.days_since_last_order > Number(cond.value) : c.days_since_last_order < Number(cond.value)
        }
        if (cond.field === 'lifetime_value') {
          return cond.op === '>' ? c.lifetime_value > Number(cond.value) : c.lifetime_value < Number(cond.value)
        }
        if (cond.field === 'visit_frequency') {
          return c.frequency === cond.value
        }
        if (cond.field === 'time_habit') {
          return c.time_habit === cond.value
        }
        return true
      })
    }
    aud.count = matches.length
    
    const { error } = await supabase.from('audiences').insert(aud)
    if (error) {
      console.error(`Error inserting audience ${aud.name}:`, error)
    } else {
      console.log(`Inserted audience: ${aud.name} (${aud.count} members)`)
    }
  }

  console.log('✅ Seeding complete!')
}

runSeed().catch((err) => {
  console.error('Fatal seed error:', err)
  process.exit(1)
})
