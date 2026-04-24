import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Link2, Plus, X, Loader2, ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import type { KanbanStorySummaryResponse } from '@/types/api'
import { cardTypeColors, cardTypeLabels, formatStoryId } from './kanbanStyles'

interface LinkedStoriesSectionProps {
  companyId: string
  ticketId: string
  canEdit: boolean
}

export function LinkedStoriesSection({ companyId, ticketId, canEdit }: LinkedStoriesSectionProps) {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: stories, isLoading } = useQuery({
    queryKey: ['linkedStories', companyId, ticketId],
    queryFn: () =>
      api.get<KanbanStorySummaryResponse[]>(`/api/v1/companies/${companyId}/tickets/${ticketId}/linked-stories`),
    enabled: !!companyId && !!ticketId,
  })

  const unlink = useMutation({
    mutationFn: (story: KanbanStorySummaryResponse) =>
      api.delete<void>(
        `/api/v1/companies/${companyId}/projects/${story.projectId}/board/cards/${story.id}/link-ticket/${ticketId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedStories', companyId, ticketId] })
    },
  })

  const link = useMutation({
    mutationFn: (story: KanbanStorySummaryResponse) =>
      api.post(
        `/api/v1/companies/${companyId}/projects/${story.projectId}/board/cards/${story.id}/link-ticket`,
        { ticketIdOrNumber: ticketId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedStories', companyId, ticketId] })
      setPickerOpen(false)
    },
  })

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="h-4 w-4" />
          Linked Stories
          {(stories?.length ?? 0) > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {stories!.length}
            </span>
          )}
        </h3>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Link Story
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading...
        </div>
      ) : !stories || stories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No linked stories.</p>
      ) : (
        <ul className="space-y-1">
          {stories.map((s) => (
            <li
              key={s.id}
              className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <Link
                to="/kanban/stories/$storyNumber"
                params={{ storyNumber: String(s.cardNumber) }}
                search={{ fromTicket: ticketId }}
                className="min-w-0 flex-1 hover:underline"
              >
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cardTypeColors[s.type]}`}>
                    {cardTypeLabels[s.type]}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{formatStoryId(s.cardNumber)}</span>
                  <span className="truncate text-sm">{s.title}</span>
                </div>
                {s.columnName && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {s.projectName ? `${s.projectName} · ${s.columnName}` : s.columnName}
                  </div>
                )}
              </Link>
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
              {canEdit && (
                <button
                  type="button"
                  onClick={() => unlink.mutate(s)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  disabled={unlink.isPending}
                  title="Unlink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && (
        <StoryPicker
          companyId={companyId}
          excludeIds={new Set(stories?.map((s) => s.id) ?? [])}
          onPick={(story) => link.mutate(story)}
          onClose={() => setPickerOpen(false)}
          isLinking={link.isPending}
        />
      )}
    </div>
  )
}

interface StoryPickerProps {
  companyId: string
  excludeIds: Set<string>
  onPick: (story: KanbanStorySummaryResponse) => void
  onClose: () => void
  isLinking: boolean
}

function StoryPicker({ companyId, excludeIds, onPick, onClose, isLinking }: StoryPickerProps) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const { data: results, isFetching } = useQuery({
    queryKey: ['storySearch', companyId, debounced],
    queryFn: () => {
      const q = debounced ? `?query=${encodeURIComponent(debounced)}` : ''
      return api.get<KanbanStorySummaryResponse[]>(`/api/v1/companies/${companyId}/stories${q}`)
    },
    enabled: !!companyId,
  })

  const filtered = (results ?? []).filter((r) => !excludeIds.has(r.id))

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Link a story</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or STR-#..."
              autoFocus
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isFetching && filtered.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}
          {!isFetching && filtered.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              {debounced ? 'No matching stories.' : 'Type to search across your accessible projects.'}
            </div>
          )}
          {filtered.length > 0 && (
            <ul className="divide-y">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onPick(s)}
                    disabled={isLinking}
                    className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-accent/50 disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cardTypeColors[s.type]}`}>
                          {cardTypeLabels[s.type]}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{formatStoryId(s.cardNumber)}</span>
                        <span className="truncate text-sm font-medium">{s.title}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {[s.projectName, s.columnName].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
