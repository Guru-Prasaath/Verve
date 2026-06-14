import { z } from 'zod'
import {
  AudiencePreviewSchema,
  AudienceSchema,
  CampaignDetailSchema,
  CampaignPlanSchema,
  CampaignSchema,
  CustomerSchema,
  PostmortemSchema,
  type AudienceFilter,
  type Campaign,
  type CampaignPlan,
} from '@/lib/types'
import {
  applyFilter,
  buildAudiences,
  buildPlan,
  CUSTOMERS,
  getCampaignDetail,
  getPostmortemFor,
  launchPlan,
  listAllCampaigns,
} from '@/lib/api/mockData'

/*
  The single seam between the UI and the server. Every function hits a real
  REST path; when VITE_API_URL is unset we are in MOCK mode and return seeded
  data after a short artificial delay. Flip to the Express backend by setting
  VITE_API_URL — no component changes required.
*/

const API_URL = import.meta.env.VITE_API_URL as string | undefined
export const MOCK = !API_URL

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`)
  return schema.parse(await res.json())
}

// ---- Agent ----

export async function generateCampaignPlan(
  goal: string,
  refinements: string[] = []
): Promise<CampaignPlan> {
  if (MOCK) {
    await delay(1400) // let the "thinking" state breathe
    return CampaignPlanSchema.parse(buildPlan(goal, refinements))
  }
  // TODO: replace with POST /agent/plan
  return request('/agent/plan', CampaignPlanSchema, {
    method: 'POST',
    body: JSON.stringify({ goal, refinements }),
  })
}

// ---- Audiences ----

export async function getAudiencePreview(filter: AudienceFilter) {
  if (MOCK) {
    await delay(300)
    const members = applyFilter(filter.conditions)
    return AudiencePreviewSchema.parse({
      count: members.length,
      persona: `${members.length.toLocaleString('en-IN')} customers match this segment.`,
      sampleCustomers: members.slice(0, 5),
    })
  }
  // TODO: replace with POST /audiences/preview
  return request('/audiences/preview', AudiencePreviewSchema, {
    method: 'POST',
    body: JSON.stringify(filter),
  })
}

export async function listAudiences() {
  if (MOCK) {
    await delay(250)
    return z.array(AudienceSchema).parse(buildAudiences())
  }
  // TODO: replace with GET /audiences
  return request('/audiences', z.array(AudienceSchema))
}

// ---- Campaigns ----

export async function launchCampaign(plan: CampaignPlan): Promise<Campaign> {
  if (MOCK) {
    await delay(900)
    return CampaignSchema.parse(launchPlan(plan))
  }
  // TODO: replace with POST /campaigns
  return request('/campaigns', CampaignSchema, {
    method: 'POST',
    body: JSON.stringify(plan),
  })
}

export async function listCampaigns() {
  if (MOCK) {
    await delay(300)
    return z.array(CampaignSchema).parse(listAllCampaigns())
  }
  // TODO: replace with GET /campaigns
  return request('/campaigns', z.array(CampaignSchema))
}

export async function getCampaign(id: string) {
  if (MOCK) {
    await delay(300)
    const detail = getCampaignDetail(id)
    if (!detail) throw new Error(`Campaign ${id} not found`)
    return CampaignDetailSchema.parse(detail)
  }
  // TODO: replace with GET /campaigns/:id
  return request(`/campaigns/${id}`, CampaignDetailSchema)
}

export async function getPostmortem(id: string) {
  if (MOCK) {
    await delay(500)
    const pm = getPostmortemFor(id)
    if (!pm) throw new Error(`Postmortem for ${id} not found`)
    return PostmortemSchema.parse(pm)
  }
  // TODO: replace with GET /campaigns/:id/postmortem
  return request(`/campaigns/${id}/postmortem`, PostmortemSchema)
}

// ---- Customers ----

export async function listCustomers(query?: string) {
  if (MOCK) {
    await delay(250)
    const q = (query ?? '').trim().toLowerCase()
    const filtered = q
      ? CUSTOMERS.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.favoriteDrink.toLowerCase().includes(q) ||
            c.homeStore.toLowerCase().includes(q)
        )
      : CUSTOMERS
    return z.array(CustomerSchema).parse(filtered.slice(0, 200))
  }
  // TODO: replace with GET /customers?q=
  const qs = query ? `?q=${encodeURIComponent(query)}` : ''
  return request(`/customers${qs}`, z.array(CustomerSchema))
}
