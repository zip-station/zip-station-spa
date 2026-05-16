import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  CreatePersonalAccessTokenRequest,
  PersonalAccessTokenCreatedResponse,
  PersonalAccessTokenResponse,
} from '@/types/api'

const base = (companyId: string) => `/api/v1/companies/${companyId}/personal-access-tokens`

const listKey = (companyId: string | null) => ['personalAccessTokens', companyId] as const

export function usePersonalAccessTokens(companyId: string | null) {
  return useQuery({
    queryKey: listKey(companyId),
    queryFn: () => api.get<PersonalAccessTokenResponse[]>(base(companyId!)),
    enabled: !!companyId,
  })
}

export function useCreatePersonalAccessToken(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePersonalAccessTokenRequest) =>
      api.post<PersonalAccessTokenCreatedResponse>(base(companyId!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey(companyId) })
    },
  })
}

export function useRevokePersonalAccessToken(companyId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`${base(companyId!)}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey(companyId) })
    },
  })
}
