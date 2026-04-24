import { useState } from 'react'
import { X, Plus, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { TicketSummaryResponse } from '@/types/api'

interface LinkTicketPickerProps {
  linkedTickets: TicketSummaryResponse[]
  onAdd: (ticketIdOrNumber: string) => Promise<void>
  onRemove: (ticketId: string) => Promise<void>
  disabled?: boolean
}

export function LinkTicketPicker({ linkedTickets, onAdd, onRemove, disabled }: LinkTicketPickerProps) {
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
      setError(e instanceof Error ? e.message : 'Failed to link ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Linked tickets</h4>
      </div>

      {linkedTickets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No linked tickets.</p>
      ) : (
        <ul className="space-y-1">
          {linkedTickets.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <Link
                to="/tickets/$ticketId"
                params={{ ticketId: t.id }}
                className="min-w-0 flex-1 hover:underline"
              >
                <span className="font-mono text-xs text-muted-foreground">#{t.ticketNumber}</span>{' '}
                <span className="truncate">{t.subject}</span>
              </Link>
              <Link
                to="/tickets/$ticketId"
                params={{ ticketId: t.id }}
                className="text-muted-foreground hover:text-foreground"
                title="Open ticket"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Unlink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ticket # or ID"
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
