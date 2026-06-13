import { SupabaseClient } from '@supabase/supabase-js'

export async function checkAudienceOverlap(
  supabase: SupabaseClient,
  campaignId: string,
  currentRecipientIds: string[]
) {
  const { data: otherCampaigns } = await supabase
    .from('campaigns')
    .select('id')
    .in('status', ['Live', 'Sending'])
    .neq('id', campaignId)

  if (!otherCampaigns || otherCampaigns.length === 0) {
    return { overlapCount: 0, overlapPercentage: 0 }
  }

  let totalOverlap = new Set<string>()
  for (const camp of otherCampaigns) {
    const { data: otherRecs } = await supabase
      .from('recipients')
      .select('customer_id')
      .eq('campaign_id', camp.id)

    if (otherRecs) {
      for (const rec of otherRecs) {
        if (currentRecipientIds.includes(rec.customer_id)) {
          totalOverlap.add(rec.customer_id)
        }
      }
    }
  }

  const overlapCount = totalOverlap.size
  const overlapPercentage = currentRecipientIds.length > 0
    ? Math.round((overlapCount / currentRecipientIds.length) * 100)
    : 0

  return { overlapCount, overlapPercentage }
}

export async function analyzeCohort(supabase: SupabaseClient, campaignId: string) {
  const { data: converters } = await supabase
    .from('recipients')
    .select('customer_id')
    .eq('campaign_id', campaignId)
    .eq('state', 'Ordered')

  if (!converters || converters.length === 0) {
    return { characteristics: [], topSegments: [] }
  }

  const customerIds = converters.map(c => c.customer_id)
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .in('id', customerIds)

  if (!customers || customers.length === 0) {
    return { characteristics: [], topSegments: [] }
  }

  const totalConverters = customers.length
  const characteristics: { label: string; percentage: number }[] = []

  const ltv = customers.filter(c => c.lifetime_value > 5000).length
  const highValue = Math.round((ltv / totalConverters) * 100)
  if (highValue > 0) characteristics.push({ label: 'High-value customers (₹5000+)', percentage: highValue })

  const daily = customers.filter(c => c.frequency === 'daily').length
  const dailyPct = Math.round((daily / totalConverters) * 100)
  if (dailyPct > 0) characteristics.push({ label: 'Daily visitors', percentage: dailyPct })

  const weekend = customers.filter(c => c.time_habit === 'weekend').length
  const weekendPct = Math.round((weekend / totalConverters) * 100)
  if (weekendPct > 0) characteristics.push({ label: 'Weekend visitors', percentage: weekendPct })

  const morning = customers.filter(c => c.time_habit === 'morning-office').length
  const morningPct = Math.round((morning / totalConverters) * 100)
  if (morningPct > 0) characteristics.push({ label: 'Morning office-goers', percentage: morningPct })

  const drinkMap = new Map<string, number>()
  for (const c of customers) {
    drinkMap.set(c.favorite_drink, (drinkMap.get(c.favorite_drink) ?? 0) + 1)
  }
  const topDrink = [...drinkMap.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topDrink) {
    const drinkPct = Math.round((topDrink[1] / totalConverters) * 100)
    characteristics.push({ label: `Prefer ${topDrink[0]}`, percentage: drinkPct })
  }

  const cityMap = new Map<string, number>()
  for (const c of customers) {
    cityMap.set(c.city, (cityMap.get(c.city) ?? 0) + 1)
  }
  const topCities = [...cityMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
  for (const [city, count] of topCities) {
    const cityPct = Math.round((count / totalConverters) * 100)
    characteristics.push({ label: `From ${city}`, percentage: cityPct })
  }

  characteristics.sort((a, b) => b.percentage - a.percentage)

  return {
    characteristics: characteristics.slice(0, 5),
    converterCount: totalConverters,
  }
}
