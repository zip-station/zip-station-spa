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
  MaxTicketEnrichmentResponse,
  SetMaxApiKeyRequest,
  TicketMaxResponse,
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

const ticketMaxKey = (companyId: string | null, ticketId: string | null) =>
  ['max', 'ticket', companyId, ticketId] as const

export function useTicketMax(companyId: string | null, ticketId: string | null) {
  return useQuery({
    queryKey: ticketMaxKey(companyId, ticketId),
    queryFn: () =>
      api.get<TicketMaxResponse>(`/api/v1/companies/${companyId}/tickets/${ticketId}/max`),
    enabled: !!companyId && !!ticketId,
    // Poll while enrichment is in flight so the UI lights up automatically
    // when Max finishes. Stop polling once it's complete or failed.
    refetchInterval: (query) => {
      const data = query.state.data as TicketMaxResponse | undefined
      return data?.enrichment?.status === 'processing' ? 3000 : false
    },
  })
}

export function useReenrichTicket(companyId: string | null, ticketId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<MaxTicketEnrichmentResponse>(
        `/api/v1/companies/${companyId}/tickets/${ticketId}/max/enrich`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketMaxKey(companyId, ticketId) })
    },
  })
}

export function useApproveMaxTask(companyId: string | null, ticketId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/api/v1/companies/${companyId}/tickets/${ticketId}/max/tasks/${taskId}/approve`),
    onSuccess: () => {
      // Delay the invalidations so the UI can show a brief "Done" success state
      // on the action card before the refetched task list removes it. Without
      // this the card vanishes the instant the request returns and the user
      // sees nothing to confirm the action worked.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ticketMaxKey(companyId, ticketId) })
        queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
        // add_to_backlog approvals create a kanban story linked to the ticket;
        // the Linked Stories section refetches to surface it.
        queryClient.invalidateQueries({ queryKey: ['linkedStories', companyId, ticketId] })
        queryClient.invalidateQueries({ queryKey: ['kanbanCards', companyId] })
      }, 1500)
    },
  })
}

export function useRejectMaxTask(companyId: string | null, ticketId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/api/v1/companies/${companyId}/tickets/${ticketId}/max/tasks/${taskId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketMaxKey(companyId, ticketId) })
    },
  })
}

// Link the current ticket to another ticket by ticket number.
// Server's ResolveTicketAsync handles number→id natively.
export function useLinkTicketByNumber(companyId: string | null, sourceTicketId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ticketNumber: string) =>
      api.post(`/api/v1/companies/${companyId}/tickets/${sourceTicketId}/link`, {
        targetTicketId: ticketNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, sourceTicketId] })
    },
  })
}

// Link the current ticket to a kanban story by card number. Two-step: fetch
// the card to resolve its id, then call link-ticket with that id.
export function useLinkTicketToStoryByNumber(
  companyId: string | null,
  projectId: string | null,
  sourceTicketId: string | null,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (storyNumber: string) => {
      const detail = await api.get<{ card: { id: string } }>(
        `/api/v1/companies/${companyId}/projects/${projectId}/board/cards/${storyNumber}`,
      )
      await api.post(
        `/api/v1/companies/${companyId}/projects/${projectId}/board/cards/${detail.card.id}/link-ticket`,
        { ticketIdOrNumber: sourceTicketId },
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, sourceTicketId] })
      queryClient.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
    },
  })
}
