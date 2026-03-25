import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { UserResponse } from '@/types/api'

export function useCurrentUser() {
  const query = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.get<UserResponse>('/api/v1/users/me'),
  })

  const companyId = query.data?.roleAssignments?.[0]?.companyId ?? null

  return {
    ...query,
    user: query.data ?? null,
    companyId,
  }
}
