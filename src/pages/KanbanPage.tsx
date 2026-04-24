import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { useQuery } from '@tanstack/react-query'
import { Trello, Settings as SettingsIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useKanbanBoard,
  useKanbanCards,
  useCreateKanbanCard,
  useUpdateKanbanCard,
  useUpdateKanbanColumns,
} from '@/hooks/useKanbanBoard'
import { api } from '@/lib/api'
import type { KanbanCardResponse, UserResponse, CreateKanbanCardRequest } from '@/types/api'
import { KanbanColumn } from '@/components/Kanban/KanbanColumn'
import { KanbanCardTile } from '@/components/Kanban/KanbanCardTile'
import { ColumnSettingsModal } from '@/components/Kanban/ColumnSettingsModal'
import { CreateCardModal } from '@/components/Kanban/CreateCardModal'
import { FilterBar, type KanbanFilters } from '@/components/Kanban/FilterBar'

const POSITION_STEP = 1000

export function KanbanPage() {
  const { companyId } = useCurrentUser()
  const { selectedProjectId, projects } = useSelectedProject()
  const { hasPermission } = usePermissions()

  const canEdit = hasPermission('Kanban.Edit')

  const [filters, setFilters] = useState<KanbanFilters>({
    query: '',
    assignedTo: '',
    type: '',
    tags: [],
    hasLinkedTickets: 'any',
    includeArchived: false,
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localOverrides, setLocalOverrides] = useState<Record<string, { columnId: string; position: number }>>({})
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [createForColumnId, setCreateForColumnId] = useState<string | null>(null)

  const { data: board, isLoading: boardLoading } = useKanbanBoard(companyId, selectedProjectId)
  const { data: cards, isLoading: cardsLoading } = useKanbanCards(companyId, selectedProjectId, {
    query: filters.query,
    assignedTo: filters.assignedTo,
    type: filters.type || undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    hasLinkedTickets:
      filters.hasLinkedTickets === 'yes' ? true : filters.hasLinkedTickets === 'no' ? false : undefined,
    includeArchived: filters.includeArchived,
  })

  const { data: members } = useQuery({
    queryKey: ['companyMembers', companyId],
    queryFn: () => api.get<UserResponse[]>(`/api/v1/users/company/${companyId}`),
    enabled: !!companyId,
  })

  const updateCard = useUpdateKanbanCard(companyId, selectedProjectId)
  const createCard = useCreateKanbanCard(companyId, selectedProjectId)
  const updateColumns = useUpdateKanbanColumns(companyId, selectedProjectId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  // Prefer pointer-inside hits; fall back to any rect that intersects the drag overlay.
  // closestCorners (the dnd-kit default) can return the source column for partial overlay overlap,
  // which manifests as a card "bouncing back" to its origin column.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointer = pointerWithin(args)
    if (pointer.length > 0) return pointer
    const rects = rectIntersection(args)
    const first = getFirstCollision(rects, 'id')
    return first != null ? [{ id: first }] : []
  }, [])

  const userNamesById = useMemo(() => {
    const map = new Map<string, string>()
    members?.forEach((m) => map.set(m.id, m.displayName || m.email))
    return map
  }, [members])

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    cards?.forEach((c) => c.tags.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [cards])

  // Apply optimistic overrides to visual state
  const visualCards = useMemo(() => {
    if (!cards) return []
    return cards.map((c) => {
      const override = localOverrides[c.id]
      return override ? { ...c, columnId: override.columnId, position: override.position } : c
    })
  }, [cards, localOverrides])

  const cardsByColumn = useMemo(() => {
    const by: Record<string, KanbanCardResponse[]> = {}
    if (!board) return by
    board.columns.forEach((col) => (by[col.id] = []))
    visualCards.forEach((card) => {
      if (!by[card.columnId]) by[card.columnId] = []
      by[card.columnId].push(card)
    })
    Object.values(by).forEach((arr) => arr.sort((a, b) => a.position - b.position))
    return by
  }, [board, visualCards])

  const activeCard = activeId ? visualCards.find((c) => c.id === activeId) : null

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Trello className="mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Select a project</h2>
        <p className="mt-1 text-muted-foreground">
          {projects.length === 0
            ? 'Create a project first to start using the kanban board.'
            : 'Pick a project from the sidebar to view its board.'}
        </p>
      </div>
    )
  }

  if (boardLoading || cardsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!board) return null

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    setActiveId(null)
    if (!over) return

    const activeCardData = active.data.current as { type: string; card: KanbanCardResponse } | undefined
    if (activeCardData?.type !== 'card') return
    const card = activeCardData.card

    const overData = over.data.current as { type: string; columnId?: string; card?: KanbanCardResponse } | undefined
    const targetColumnId = overData?.type === 'column' ? overData.columnId : overData?.columnId
    if (!targetColumnId) return

    const sameColumn = card.columnId === targetColumnId
    const columnCards = (cardsByColumn[targetColumnId] ?? []).filter((c) => c.id !== card.id)

    let newPosition = card.position

    if (overData?.type === 'card' && overData.card && overData.card.id !== card.id) {
      const overIndex = columnCards.findIndex((c) => c.id === overData.card!.id)
      if (overIndex !== -1) {
        const before = columnCards[overIndex - 1]
        const after = columnCards[overIndex]
        newPosition = midpoint(before?.position, after?.position)
      }
    } else {
      // Dropped on column area (empty or blank space)
      const maxPos = columnCards.length > 0 ? columnCards[columnCards.length - 1].position : 0
      newPosition = maxPos + POSITION_STEP
    }

    if (sameColumn && newPosition === card.position) return

    // Optimistic override until server confirms
    setLocalOverrides((prev) => ({
      ...prev,
      [card.id]: { columnId: targetColumnId, position: newPosition },
    }))

    updateCard.mutate(
      { cardId: card.id, data: { columnId: targetColumnId, position: newPosition } },
      {
        onError: (error) => {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          console.error('[Kanban] Card move failed', { cardId: card.id, targetColumnId, newPosition, error })
          alert(`Card move failed: ${msg}`)
        },
        onSettled: () => {
          setLocalOverrides((prev) => {
            const { [card.id]: _removed, ...rest } = prev
            void _removed
            return rest
          })
        },
      },
    )
  }

  const handleCreate = async (data: CreateKanbanCardRequest) => {
    await createCard.mutateAsync(data)
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col lg:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Kanban</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan features, bugs, improvements, and tech debt. Drag stories between columns.
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setColumnsOpen(true)}>
            <SettingsIcon className="mr-2 h-4 w-4" /> Columns
          </Button>
        )}
      </div>

      <div className="mb-3">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          members={members ?? []}
          availableTags={availableTags}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto snap-x snap-mandatory pb-3">
          {board.columns
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={cardsByColumn[column.id] ?? []}
                userNamesById={userNamesById}
                isResolvedColumn={column.id === board.resolvedColumnId}
                onAddCard={(id) => canEdit && setCreateForColumnId(id)}
              />
            ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <KanbanCardTile
              card={activeCard}
              assigneeName={
                activeCard.assignedToUserId ? userNamesById.get(activeCard.assignedToUserId) : undefined
              }
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <ColumnSettingsModal
        open={columnsOpen}
        columns={board.columns}
        resolvedColumnId={board.resolvedColumnId}
        maxColumns={8}
        onClose={() => setColumnsOpen(false)}
        onSave={async (columns, resolvedColumnId) => {
          await updateColumns.mutateAsync({ columns, resolvedColumnId })
        }}
      />

      <CreateCardModal
        open={createForColumnId !== null}
        columnId={createForColumnId ?? ''}
        members={members ?? []}
        onClose={() => setCreateForColumnId(null)}
        onCreate={handleCreate}
      />
    </div>
  )
}

function midpoint(before: number | undefined, after: number | undefined): number {
  if (before == null && after == null) return POSITION_STEP
  if (before == null) return after! - POSITION_STEP
  if (after == null) return before + POSITION_STEP
  return (before + after) / 2
}
