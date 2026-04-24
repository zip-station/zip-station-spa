import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { KanbanCardType, UserResponse } from '@/types/api'

export interface KanbanFilters {
  query: string
  assignedTo: string
  type: KanbanCardType | ''
  tags: string[]
  hasLinkedTickets: 'any' | 'yes' | 'no'
  includeArchived: boolean
}

interface FilterBarProps {
  filters: KanbanFilters
  onChange: (next: KanbanFilters) => void
  members: UserResponse[]
  availableTags: string[]
}

export function FilterBar({ filters, onChange, members, availableTags }: FilterBarProps) {
  const [open, setOpen] = useState(false)

  const activeCount =
    (filters.query ? 1 : 0) +
    (filters.assignedTo ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0) +
    (filters.hasLinkedTickets !== 'any' ? 1 : 0) +
    (filters.includeArchived ? 1 : 0)

  const reset = () =>
    onChange({ query: '', assignedTo: '', type: '', tags: [], hasLinkedTickets: 'any', includeArchived: false })

  return (
    <>
      {/* Desktop/tablet inline filter bar */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Search stories..."
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm"
          />
        </div>
        <select
          value={filters.assignedTo}
          onChange={(e) => onChange({ ...filters, assignedTo: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All assignees</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value as KanbanCardType | '' })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All types</option>
          <option value="Feature">Feature</option>
          <option value="Bug">Bug</option>
          <option value="Improvement">Improvement</option>
          <option value="TechDebt">Tech Debt</option>
        </select>
        <select
          value={filters.hasLinkedTickets}
          onChange={(e) =>
            onChange({ ...filters, hasLinkedTickets: e.target.value as 'any' | 'yes' | 'no' })
          }
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="any">Any linked tickets</option>
          <option value="yes">Has linked tickets</option>
          <option value="no">No linked tickets</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(e) => onChange({ ...filters, includeArchived: e.target.checked })}
          />
          Show archived
        </label>
        {availableTags.length > 0 && (
          <TagPicker
            selected={filters.tags}
            options={availableTags}
            onChange={(tags) => onChange({ ...filters, tags })}
          />
        )}
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
        )}
      </div>

      {/* Mobile button */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Search..."
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Filter className="mr-1.5 h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-auto rounded-t-xl border-t bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Assignee</label>
                <select
                  value={filters.assignedTo}
                  onChange={(e) => onChange({ ...filters, assignedTo: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">All assignees</option>
                  <option value="me">Assigned to me</option>
                  <option value="unassigned">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => onChange({ ...filters, type: e.target.value as KanbanCardType | '' })}
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">All types</option>
                  <option value="Feature">Feature</option>
                  <option value="Bug">Bug</option>
                  <option value="Improvement">Improvement</option>
                  <option value="TechDebt">Tech Debt</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Linked tickets</label>
                <select
                  value={filters.hasLinkedTickets}
                  onChange={(e) =>
                    onChange({ ...filters, hasLinkedTickets: e.target.value as 'any' | 'yes' | 'no' })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="any">Any</option>
                  <option value="yes">Has linked tickets</option>
                  <option value="no">No linked tickets</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.includeArchived}
                  onChange={(e) => onChange({ ...filters, includeArchived: e.target.checked })}
                />
                Show archived stories
              </label>
              {availableTags.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map((tag) => {
                      const selected = filters.tags.includes(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() =>
                            onChange({
                              ...filters,
                              tags: selected ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag],
                            })
                          }
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={reset}>Clear all</Button>
                <Button className="flex-1" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TagPicker({
  selected,
  options,
  onChange,
}: {
  selected: string[]
  options: string[]
  onChange: (tags: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        Tags{selected.length > 0 ? ` (${selected.length})` : ''}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border bg-popover p-2 shadow-lg">
            <div className="max-h-56 overflow-auto">
              {options.map((tag) => {
                const checked = selected.includes(tag)
                return (
                  <label key={tag} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange(checked ? selected.filter((t) => t !== tag) : [...selected, tag])
                      }
                    />
                    {tag}
                  </label>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
