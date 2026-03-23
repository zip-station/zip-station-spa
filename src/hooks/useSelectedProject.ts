import { useProjectStore } from '@/store/projectStore'
import { useProjects } from '@/hooks/useProjects'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function useSelectedProject() {
  const { companyId } = useCurrentUser()
  const { data: projects } = useProjects(companyId)
  const { selectedProjectId, setSelectedProjectId } = useProjectStore()

  const hasMultipleProjects = (projects?.length ?? 0) > 1

  // If only one project, always use it (no selector shown)
  const effectiveProjectId = hasMultipleProjects
    ? selectedProjectId
    : projects?.[0]?.id ?? null

  return {
    selectedProjectId: effectiveProjectId,
    setSelectedProjectId,
    projects: projects ?? [],
    hasMultipleProjects,
  }
}
