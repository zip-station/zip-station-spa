import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCurrentUser } from './useCurrentUser'

interface MyPermissionsResponse {
  isOwner: boolean
  permissions: string[]
}

export function usePermissions() {
  const { companyId } = useCurrentUser()

  const { data } = useQuery({
    queryKey: ['myPermissions', companyId],
    queryFn: () => api.get<MyPermissionsResponse>(`/api/v1/companies/${companyId}/my-permissions`),
    enabled: !!companyId,
    staleTime: 60000, // Cache for 1 minute
  })

  const isOwner = data?.isOwner ?? false
  const permissions = new Set(data?.permissions ?? [])

  const hasPermission = (permission: string) => isOwner || permissions.has(permission)

  return {
    isOwner,
    permissions,
    hasPermission,
    isLoaded: !!data,
  }
}
