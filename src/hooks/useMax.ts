import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  MaxInstructionRequest,
  MaxInstructionResponse,
  MaxExampleReplyRequest,
  MaxExampleReplyResponse,
  MaxSettings,
  MaxTestConnectionRequest,
  MaxTestConnectionResponse,
  SetMaxApiKeyRequest,
} from '@/types/api'

const base = (companyId: string, projectId: string) =>
  `/api/v1/companies/${companyId}/projects/${projectId}/max`

const instructionsKey = (companyId: string | null, projectId: string | null) =>
  ['max', 'instructions', companyId, projectId] as const

const exampleRepliesKey = (companyId: string | null, projectId: string | null) =>
  ['max', 'exampleReplies', companyId, projectId] as const

export function useMaxInstructions(companyId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: instructionsKey(companyId, projectId),
    queryFn: () => api.get<MaxInstructionResponse[]>(`${base(companyId!, projectId!)}/instructions`),
    enabled: !!companyId && !!projectId,
  })
}

export function useCreateMaxInstruction(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MaxInstructionRequest) =>
      api.post<MaxInstructionResponse>(`${base(companyId!, projectId!)}/instructions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instructionsKey(companyId, projectId) })
    },
  })
}

export function useUpdateMaxInstruction(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MaxInstructionRequest }) =>
      api.put<MaxInstructionResponse>(`${base(companyId!, projectId!)}/instructions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instructionsKey(companyId, projectId) })
    },
  })
}

export function useDeleteMaxInstruction(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`${base(companyId!, projectId!)}/instructions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instructionsKey(companyId, projectId) })
    },
  })
}

export function useMaxExampleReplies(companyId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: exampleRepliesKey(companyId, projectId),
    queryFn: () => api.get<MaxExampleReplyResponse[]>(`${base(companyId!, projectId!)}/example-replies`),
    enabled: !!companyId && !!projectId,
  })
}

export function useCreateMaxExampleReply(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MaxExampleReplyRequest) =>
      api.post<MaxExampleReplyResponse>(`${base(companyId!, projectId!)}/example-replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleRepliesKey(companyId, projectId) })
    },
  })
}

export function useUpdateMaxExampleReply(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MaxExampleReplyRequest }) =>
      api.put<MaxExampleReplyResponse>(`${base(companyId!, projectId!)}/example-replies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleRepliesKey(companyId, projectId) })
    },
  })
}

export function useDeleteMaxExampleReply(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`${base(companyId!, projectId!)}/example-replies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleRepliesKey(companyId, projectId) })
    },
  })
}

export function useSetMaxApiKey(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SetMaxApiKeyRequest) =>
      api.put<MaxSettings>(`${base(companyId!, projectId!)}/api-key`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] })
    },
  })
}

export function useTestMaxConnection(companyId: string | null, projectId: string | null) {
  return useMutation({
    mutationFn: (data: MaxTestConnectionRequest) =>
      api.post<MaxTestConnectionResponse>(`${base(companyId!, projectId!)}/test-connection`, data),
  })
}

export function useResetMax(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ instructionsCleared: number; exampleRepliesCleared: number }>(
        `${base(companyId!, projectId!)}/reset`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] })
      queryClient.invalidateQueries({ queryKey: instructionsKey(companyId, projectId) })
      queryClient.invalidateQueries({ queryKey: exampleRepliesKey(companyId, projectId) })
    },
  })
}
