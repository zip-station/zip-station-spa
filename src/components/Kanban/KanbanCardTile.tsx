import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link as LinkIcon, MessageSquare } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { KanbanCardResponse } from '@/types/api'
import { cardTypeColors, cardTypeLabels, priorityColors, formatStoryId } from './kanbanStyles'

interface KanbanCardTileProps {
  card: KanbanCardResponse
  assigneeName?: string
  isDragging?: boolean
}

export function KanbanCardTile({ card, assigneeName, isDragging }: KanbanCardTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: card.id, data: { type: 'card', columnId: card.columnId, card } })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableDragging || isDragging ? 0.5 : 1,
  }

  const linkedCount = card.linkedTicketIds?.length ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none select-none rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <Link
        to="/kanban/stories/$storyNumber"
        params={{ storyNumber: String(card.cardNumber) }}
        search={{ fromTicket: undefined }}
        className="block"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cardTypeColors[card.type]}`}
          >
            {cardTypeLabels[card.type]}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[card.priority]}`}
          >
            {card.priority}
          </span>
          <span className="ml-auto text-xs font-mono text-muted-foreground">{formatStoryId(card.cardNumber)}</span>
        </div>

        <h4 className="text-sm font-medium leading-snug line-clamp-2">{card.title}</h4>

        {card.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {card.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {card.tags.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{card.tags.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {assigneeName && (
            <span className="truncate" title={assigneeName}>
              {assigneeName}
            </span>
          )}
          {linkedCount > 0 && (
            <span className="flex items-center gap-1" title={`${linkedCount} linked ticket(s)`}>
              <LinkIcon className="h-3 w-3" />
              {linkedCount}
            </span>
          )}
          {card.descriptionHtml && (
            <span title="Has description">
              <MessageSquare className="h-3 w-3" />
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
