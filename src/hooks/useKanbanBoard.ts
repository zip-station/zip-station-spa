import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { buildBacklogQuery } from '@/lib/backlog'
import type {
  KanbanBoardResponse,
  KanbanCardResponse,
  KanbanCardDetailResponse,
  KanbanCardCommentResponse,
  KanbanStorySummaryResponse,
  CreateKanbanCardRequest,
  UpdateKanbanCardRequest,
  UpdateKanbanColumnsRequest,
  BacklogFilters,
  BulkUpdateStoriesRequest,
  BulkUpdateStoriesResponse,
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
}

function buildCardQuery(filters: CardFilters): string {
  const parts: string[] = []
  if (filters.query) parts.push(`query=${encodeURIComponent(filters.query)}`)
  if (filters.columnId) parts.push(`columnId=${encodeURIComponent(filters.columnId)}`)
  if (filters.assignedTo) parts.push(`assignedTo=${encodeURIComponent(filters.assignedTo)}`)
  if (filters.type) parts.push(`type=${encodeURIComponent(filters.type)}`)
  if (filters.tags?.length) filters.tags.forEach((t) => parts.push(`tags=${encodeURIComponent(t)}`))
  if (filters.hasLinkedTickets !== undefined) parts.push(`hasLinkedTickets=${filters.hasLinkedTickets}`)
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
    // Keep the previous results on screen while a new filter/search query loads.
    // Without this, changing `filters` swaps to a fresh (empty) query, cardsLoading
    // flips true, and KanbanPage unmounts the search bar mid-keystroke (focus loss).
    placeholderData: keepPreviousData,
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
      // A new story shows up in the cross-project backlog grid too — keep it live.
      qc.invalidateQueries({ queryKey: ['backlog', companyId] })
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
      qc.invalidateQueries({ queryKey: ['backlog', companyId] })
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
      qc.invalidateQueries({ queryKey: ['backlog', companyId] })
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

export function useDeleteKanbanComment(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; commentId: string }) =>
      api.delete<void>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}/comments/${params.commentId}`,
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

export function useLinkStory(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; cardIdOrNumber: string }) =>
      api.post<KanbanCardResponse>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}/link-story`,
        { cardIdOrNumber: params.cardIdOrNumber },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
      qc.invalidateQueries({ queryKey: ['kanbanCardDetail', companyId, projectId] })
    },
  })
}

export function useUnlinkStory(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; otherCardId: string }) =>
      api.delete<KanbanCardResponse>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}/link-story/${params.otherCardId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
      qc.invalidateQueries({ queryKey: ['kanbanCardDetail', companyId, projectId] })
    },
  })
}

export function useAddExternalSource(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; url: string }) =>
      api.post<KanbanCardResponse>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}/external-source`,
        { url: params.url },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
      qc.invalidateQueries({ queryKey: ['kanbanCardDetail', companyId, projectId] })
    },
  })
}

export function useRemoveExternalSource(companyId: string | null, projectId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; url: string }) =>
      api.delete<KanbanCardResponse>(
        `${boardPath(companyId!, projectId!)}/cards/${params.cardId}/external-source?url=${encodeURIComponent(params.url)}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanbanCards', companyId, projectId] })
      qc.invalidateQueries({ queryKey: ['kanbanCardDetail', companyId, projectId] })
    },
  })
}

// ---- Cross-project backlog grid ----

/** Rows fetched per page. The server caps a single request at BacklogMaxLimit (500); we page in
 *  smaller chunks and load more on scroll so an unbounded backlog (e.g. Discord intake) all loads. */
export const BACKLOG_PAGE_SIZE = 200

/** Cross-project backlog list, paginated via infinite scroll. Scope/filter/sort live in `filters`;
 *  `skip`/`limit` are managed here per page. Flatten `data.pages` for the full loaded set. */
export function useBacklog(companyId: string | null, filters: BacklogFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['backlog', companyId, filters],
    queryFn: ({ pageParam }) =>
      api.get<KanbanStorySummaryResponse[]>(
        `/api/v1/companies/${companyId}/stories/backlog${buildBacklogQuery({ ...filters, skip: pageParam, limit: BACKLOG_PAGE_SIZE })}`,
      ),
    initialPageParam: 0,
    // A full page means there may be more; a short page is the last one.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === BACKLOG_PAGE_SIZE ? allPages.length * BACKLOG_PAGE_SIZE : undefined,
    enabled: !!companyId && enabled,
    placeholderData: keepPreviousData,
  })
}

/** Bulk edit / transition a selection of stories (may span projects). */
export function useBulkUpdateStories(companyId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkUpdateStoriesRequest) =>
      api.post<BulkUpdateStoriesResponse>(`/api/v1/companies/${companyId}/stories/bulk`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog', companyId] })
      // A committed/obsoleted/archived story changes what the per-project board shows.
      qc.invalidateQueries({ queryKey: ['kanbanCards'] })
    },
  })
}

/** Drag-to-prioritize a single backlog story (single-board scope) via the board PATCH route. */
export function useReorderBacklogStory(companyId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { projectId: string; cardId: string; backlogPosition: number }) =>
      api.patch<KanbanCardResponse>(
        `${boardPath(companyId!, params.projectId)}/cards/${params.cardId}`,
        { backlogPosition: params.backlogPosition },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog', companyId] })
    },
  })
}
