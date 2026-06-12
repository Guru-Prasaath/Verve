import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { CampaignPlan } from '@/lib/types'

/*
  The only way components touch server data. Each hook wraps one api-client
  function; components never import the api client directly.
*/

export const queryKeys = {
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaign', id] as const,
  postmortem: (id: string) => ['postmortem', id] as const,
  customers: (q: string) => ['customers', q] as const,
  audiences: ['audiences'] as const,
}

export function useCampaigns() {
  return useQuery({
    queryKey: queryKeys.campaigns,
    queryFn: () => api.listCampaigns(),
  })
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: queryKeys.campaign(id),
    queryFn: () => api.getCampaign(id),
    enabled: !!id,
  })
}

export function usePostmortem(id: string) {
  return useQuery({
    queryKey: queryKeys.postmortem(id),
    queryFn: () => api.getPostmortem(id),
    enabled: !!id,
  })
}

export function useCustomers(query: string) {
  return useQuery({
    queryKey: queryKeys.customers(query),
    queryFn: () => api.listCustomers(query),
    placeholderData: (prev) => prev,
  })
}

export function useAudiences() {
  return useQuery({
    queryKey: queryKeys.audiences,
    queryFn: () => api.listAudiences(),
  })
}

/** Generate (or refine) a campaign plan from a goal + refinement messages. */
export function useGeneratePlan() {
  return useMutation({
    mutationFn: ({
      goal,
      refinements,
    }: {
      goal: string
      refinements?: string[]
    }) => api.generateCampaignPlan(goal, refinements),
  })
}

export function useLaunchCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plan: CampaignPlan) => api.launchCampaign(plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns })
    },
  })
}
