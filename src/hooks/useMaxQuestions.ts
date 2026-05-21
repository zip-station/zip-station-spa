import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  MaxQuestionAnswerRequest,
  MaxQuestionResponse,
  MaxQuestionWithSourceResponse,
} from '@/types/api'

const base = (companyId: string, projectId: string) =>
  `/api/v1/companies/${companyId}/projects/${projectId}/max`

export type MaxQuestionStatus = 'pending' | 'answered' | 'dismissed'

const listKey = (companyId: string | null, projectId: string | null, status: MaxQuestionStatus) =>
  ['max', 'questions', status, companyId, projectId] as const

export function useMaxQuestionsByStatus(
  companyId: string | null,
  projectId: string | null,
  status: MaxQuestionStatus = 'pending',
) {
  return useQuery({
    queryKey: listKey(companyId, projectId, status),
    queryFn: () =>
      api.get<MaxQuestionWithSourceResponse[]>(
        `${base(companyId!, projectId!)}/questions?status=${status}`,
      ),
    enabled: !!companyId && !!projectId,
  })
}

// Back-compat alias for callers that only want the pending bucket.
export function usePendingMaxQuestions(companyId: string | null, projectId: string | null) {
  return useMaxQuestionsByStatus(companyId, projectId, 'pending')
}

function invalidateAllStatuses(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string | null,
  projectId: string | null,
) {
  for (const s of ['pending', 'answered', 'dismissed'] as const) {
    queryClient.invalidateQueries({ queryKey: listKey(companyId, projectId, s) })
  }
}

export function useAnswerMaxQuestion(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MaxQuestionAnswerRequest }) =>
      api.post<MaxQuestionResponse>(`${base(companyId!, projectId!)}/questions/${id}/answer`, data),
    onSuccess: () => {
      invalidateAllStatuses(queryClient, companyId, projectId)
      // Project context may have been updated.
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] })
    },
  })
}

export function useDismissMaxQuestion(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<MaxQuestionResponse>(`${base(companyId!, projectId!)}/questions/${id}/dismiss`),
    onSuccess: () => {
      invalidateAllStatuses(queryClient, companyId, projectId)
    },
  })
}
