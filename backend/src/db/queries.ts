import { SupabaseClient } from '@supabase/supabase-js'

export async function fetchFilteredCustomers(
  supabase: SupabaseClient,
  conditions: any[]
) {
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

export function getTopCities(customers: any[]): string[] {
  const counts = new Map<string, number>()
  for (const c of customers) counts.set(c.city, (counts.get(c.city) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city)
}
