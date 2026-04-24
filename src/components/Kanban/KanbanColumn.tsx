import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { KanbanCardResponse, KanbanColumnResponse } from '@/types/api'
import { KanbanCardTile } from './KanbanCardTile'

interface KanbanColumnProps {
  column: KanbanColumnResponse
  cards: KanbanCardResponse[]
  userNamesById: Map<string, string>
  isResolvedColumn?: boolean
  onAddCard: (columnId: string) => void
}

export function KanbanColumn({ column, cards, userNamesById, isResolvedColumn, onAddCard }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  })

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
        <button
          type="button"
          onClick={() => onAddCard(column.id)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="Add story"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
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
