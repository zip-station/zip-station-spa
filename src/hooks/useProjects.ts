import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ProjectResponse, CreateProjectRequest } from '@/types/api'

export function useProjects(companyId: string | null) {
  return useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => api.get<ProjectResponse[]>(`/api/v1/companies/${companyId}/projects`),
    enabled: !!companyId,
  })
}

export function useCreateProject(companyId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      api.post<ProjectResponse>(`/api/v1/companies/${companyId}/projects`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', companyId] })
    },
  })
}

export function useDeleteProject(companyId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) =>
      api.delete<void>(`/api/v1/companies/${companyId}/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', companyId] })
    },
  })
}
