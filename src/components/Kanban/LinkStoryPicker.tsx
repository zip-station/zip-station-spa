import { useState } from 'react'
import { X, Plus, GitBranch, ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { KanbanStorySummaryResponse } from '@/types/api'
import { cardTypeColors, cardTypeLabels, formatStoryId } from './kanbanStyles'

interface LinkStoryPickerProps {
  linkedStories: KanbanStorySummaryResponse[]
  onAdd: (cardIdOrNumber: string) => Promise<void>
  onRemove: (cardId: string) => Promise<void>
  disabled?: boolean
}

export function LinkStoryPicker({ linkedStories, onAdd, onRemove, disabled }: LinkStoryPickerProps) {
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = async () => {
    const value = input.trim()
    if (!value) return
    setError(null)
    setSubmitting(true)
    try {
      await onAdd(value)
      setInput('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to link story')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Linked stories</h4>
      </div>

      {linkedStories.length === 0 ? (
        <p className="text-xs text-muted-foreground">No linked stories.</p>
      ) : (
        <ul className="space-y-1">
          {linkedStories.map((s) => (
            <li key={s.id} className="rounded-md border bg-background px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    to="/kanban/stories/$storyNumber"
                    params={{ storyNumber: String(s.cardNumber) }}
                    search={{ fromTicket: undefined }}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {formatStoryId(s.cardNumber)}
                  </Link>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cardTypeColors[s.type]}`}>
                    {cardTypeLabels[s.type]}
                  </span>
                  {s.columnName && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s.columnName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/kanban/stories/$storyNumber"
                    params={{ storyNumber: String(s.cardNumber) }}
                    search={{ fromTicket: undefined }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    title="Open story in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => onRemove(s.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Unlink"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <Link
                to="/kanban/stories/$storyNumber"
                params={{ storyNumber: String(s.cardNumber) }}
                search={{ fromTicket: undefined }}
                className="mt-0.5 block text-sm hover:underline"
              >
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Story # or ID"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void add()
              }
            }}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={add} disabled={submitting || !input.trim()}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Link
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
