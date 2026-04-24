import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  KanbanBoardResponse,
  KanbanCardResponse,
  KanbanCardDetailResponse,
  KanbanCardCommentResponse,
  CreateKanbanCardRequest,
  UpdateKanbanCardRequest,
  UpdateKanbanColumnsRequest,
} from '@/types/api'

function boardPath(companyId: string, projectId: string) {
  return `/api/v1/companies/${companyId}/projects/${projectId}/board`
}

export interface CardFilters {
  query?: string
  columnId?: string
  assignedTo?: string
  type?: string
  tags?: string[]
  hasLinkedTickets?: boolean
  includeArchived?: boolean
}

function buildCardQuery(filters: CardFilters): string {
  const parts: string[] = []
  if (filters.query) parts.push(`query=${encodeURIComponent(filters.query)}`)
  if (filters.columnId) parts.push(`columnId=${encodeURIComponent(filters.columnId)}`)
  if (filters.assignedTo) parts.push(`assignedTo=${encodeURIComponent(filters.assignedTo)}`)
  if (filters.type) parts.push(`type=${encodeURIComponent(filters.type)}`)
  if (filters.tags?.length) filters.tags.forEach((t) => parts.push(`tags=${encodeURIComponent(t)}`))
  if (filters.hasLinkedTickets !== undefined) parts.push(`hasLinkedTickets=${filters.hasLinkedTickets}`)
  if (filters.includeArchived) parts.push('includeArchived=true')
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

export function useKanbanBoard(companyId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ['kanbanBoard', companyId, projectId],
    queryFn: () => api.get<KanbanBoardResponse>(boardPath(companyId!, projectId!)),
    enabled: !!companyId && !!projectId,
  })
}

export function useKanbanCards(companyId: string | null, projectId: string | null, filters: CardFilters) {
  return useQuery({
    queryKey: ['kanbanCards', companyId, projectId, filters],
    queryFn: () =>
      api.get<KanbanCardResponse[]>(`${boardPath(companyId!, projectId!)}/cards${buildCardQuery(filters)}`),
    enabled: !!companyId && !!projectId,
  })
}

export function useKanbanCardDetail(companyId: string | null, projectId: string | null, cardNumber: number | null) {
  return useQuery({
    queryKey: ['kanbanCardDetail', companyId, projectId, cardNumber],
    queryFn: () =>
      api.get<KanbanCardDetailResponse>(`${boardPath(companyId!, projectId!)}/cards/${cardNumber}`),
    enabled: !!companyId && !!projectId && cardNumber != null,
  })
}

export function useCreateKanbanCard(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateKanbanCardRequest) =>
      api.post<KanbanCardResponse>(`${boardPath(companyId!, projectId!)}/cards`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
    },
  })
}

export function useUpdateKanbanCard(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; data: UpdateKanbanCardRequest }) =>
      api.patch<KanbanCardResponse>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}`,
        params.data,
      ),
    onSuccess: (_data, params) => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
      qc.invalidateQueries({ queryKey: ['kanbanCardDetail', companyId, projectId] })
      void params
    },
  })
}

export function useDeleteKanbanCard(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cardId: string) =>
      api.delete<void>(`${boardPath(companyId!, projectId!)}/cards/${cardId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
    },
  })
}

export function useUpdateKanbanColumns(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateKanbanColumnsRequest) =>
      api.put<KanbanBoardResponse>(`${boardPath(companyId!, projectId!)}/columns`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanBoard', companyId, projectId] })
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
    },
  })
}

export function useAddKanbanComment(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; bodyHtml: string }) =>
      api.post<KanbanCardCommentResponse>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}/comments`,
        { bodyHtml: params.bodyHtml },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCardDetail', companyId, projectId] })
    },
  })
}

export function useLinkTicket(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; ticketIdOrNumber: string }) =>
      api.post<KanbanCardResponse>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}/link-ticket`,
        { ticketIdOrNumber: params.ticketIdOrNumber },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
      qc.invalidateQueries({ queryKey: ['kanbanCardDetail', companyId, projectId] })
    },
  })
}

export function useUnlinkTicket(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; ticketId: string }) =>
      api.delete<KanbanCardResponse>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}/link-ticket/${params.ticketId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
      qc.invalidateQueries({ queryKey: ['kanbanCardDetail', companyId, projectId] })
    },
  })
}
