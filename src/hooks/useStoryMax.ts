import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  MaxStoryEnrichmentResponse,
  StoryMaxResponse,
} from '@/types/api'

const base = (companyId: string, projectId: string, cardId: string) =>
  `/api/v1/companies/${companyId}/projects/${projectId}/board/cards/${cardId}/max`

const storyMaxKey = (companyId: string | null, projectId: string | null, cardId: string | null) =>
  ['max', 'story', companyId, projectId, cardId] as const

export function useStoryMax(
  companyId: string | null,
  projectId: string | null,
  cardId: string | null,
) {
  return useQuery({
    queryKey: storyMaxKey(companyId, projectId, cardId),
    queryFn: () => api.get<StoryMaxResponse>(base(companyId!, projectId!, cardId!)),
    enabled: !!companyId && !!projectId && !!cardId,
    // Poll while enrichment is in flight so the panel lights up automatically when Max finishes.
    refetchInterval: (query) => {
      const data = query.state.data as StoryMaxResponse | undefined
      return data?.enrichment?.status === 'processing' ? 3000 : false
    },
  })
}

export function useReenrichStory(
  companyId: string | null,
  projectId: string | null,
  cardId: string | null,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<MaxStoryEnrichmentResponse>(`${base(companyId!, projectId!, cardId!)}/enrich`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyMaxKey(companyId, projectId, cardId) })
    },
  })
}

export function useApproveStoryMaxTask(
  companyId: string | null,
  projectId: string | null,
  cardId: string | null,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post(`${base(companyId!, projectId!, cardId!)}/tasks/${taskId}/approve`),
    onSuccess: () => {
      // Match the ticket-side 1.5s delay so the "Done" state on the card lingers
      // long enough to register before the refetch removes it.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: storyMaxKey(companyId, projectId, cardId) })
        // A merge approval voids the source card — the board query needs to refresh.
        queryClient.invalidateQueries({ queryKey: ['kanbanCards', companyId] })
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard', companyId, projectId] })
      }, 1500)
    },
  })
}

export function useRejectStoryMaxTask(
  companyId: string | null,
  projectId: string | null,
  cardId: string | null,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post(`${base(companyId!, projectId!, cardId!)}/tasks/${taskId}/reject`),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: storyMaxKey(companyId, projectId, cardId) })
      }, 1000)
    },
  })
}
