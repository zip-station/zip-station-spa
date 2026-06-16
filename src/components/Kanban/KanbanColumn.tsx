import { useCallback, useLayoutEffect, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { KanbanCardResponse, KanbanColumnResponse } from '@/types/api'
import { KanbanCardTile } from './KanbanCardTile'

// In-memory scroll memory keyed by project + column. Survives SPA navigation (opening a card
// and clicking "Back to board" unmounts/remounts KanbanPage) without persisting across reloads.
const columnScrollPositions = new Map<string, number>()

interface KanbanColumnProps {
  column: KanbanColumnResponse
  cards: KanbanCardResponse[]
  userNamesById: Map<string, string>
  isResolvedColumn?: boolean
  collapsed?: boolean
  scrollScope?: string
  onAddCard: (columnId: string) => void
  onToggleCollapse: (columnId: string) => void
}

export function KanbanColumn({
  column,
  cards,
  userNamesById,
  isResolvedColumn,
  collapsed,
  scrollScope,
  onAddCard,
  onToggleCollapse,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  })

  const scrollKey = `${scrollScope ?? 'default'}:${column.id}`
  const scrollElRef = useRef<HTMLDivElement | null>(null)

  // Merge the dnd-kit droppable ref with our scroll-tracking ref.
  const setScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      scrollElRef.current = node
    },
    [setNodeRef],
  )

  // Restore the saved scroll position once cards are rendered.
  useLayoutEffect(() => {
    const el = scrollElRef.current
    if (!el) return
    const saved = columnScrollPositions.get(scrollKey)
    if (saved != null) el.scrollTop = saved
  }, [scrollKey, collapsed])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    columnScrollPositions.set(scrollKey, e.currentTarget.scrollTop)
  }

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={`flex h-full w-12 shrink-0 snap-start flex-col items-center gap-2 rounded-lg border bg-muted/30 py-2 transition-colors ${
          isOver ? 'bg-accent/30' : ''
        }`}
        style={column.color ? { borderTopColor: column.color, borderTopWidth: 3 } : undefined}
      >
        <button
          type="button"
          onClick={() => onToggleCollapse(column.id)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="Expand column"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {column.color && (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
        )}
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{cards.length}</span>
        <button
          type="button"
          onClick={() => onToggleCollapse(column.id)}
          className="flex min-h-0 flex-1 items-center text-sm font-semibold [writing-mode:vertical-rl]"
          title={column.name}
        >
          <span className="truncate">{column.name}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-[280px] shrink-0 snap-start flex-col rounded-lg border bg-muted/30 sm:w-[320px]">
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-lg border-b bg-muted/80 px-3 py-2 backdrop-blur"
        style={column.color ? { borderTopColor: column.color, borderTopWidth: 3 } : undefined}
      >
        <div className="flex min-w-0 items-center gap-2">
          {column.color && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
          )}
          <h3 className="truncate text-sm font-semibold">{column.name}</h3>
          <span className="shrink-0 text-xs text-muted-foreground">{cards.length}</span>
          {isResolvedColumn && (
            <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Resolved
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onAddCard(column.id)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Add story"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleCollapse(column.id)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Collapse column"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={setScrollRef}
        onScroll={handleScroll}
        className={`flex-1 space-y-2 overflow-y-auto p-2 transition-colors ${
          isOver ? 'bg-accent/30' : ''
        }`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCardTile
              key={card.id}
              card={card}
              assigneeName={card.assignedToUserId ? userNamesById.get(card.assignedToUserId) : undefined}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            Drop stories here
          </div>
        )}
      </div>
    </div>
  )
}
