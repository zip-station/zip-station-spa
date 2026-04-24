import { useEffect, useState } from 'react'
import { GripVertical, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { KanbanColumnResponse } from '@/types/api'

interface ColumnDraft {
  id?: string
  name: string
  color?: string
  key: string
}

interface ColumnSettingsModalProps {
  open: boolean
  columns: KanbanColumnResponse[]
  resolvedColumnId: string
  maxColumns: number
  onClose: () => void
  onSave: (columns: Array<{ id?: string; name: string; color?: string }>, resolvedColumnId: string) => Promise<void> | void
}

export function ColumnSettingsModal({
  open,
  columns,
  resolvedColumnId,
  maxColumns,
  onClose,
  onSave,
}: ColumnSettingsModalProps) {
  const [drafts, setDrafts] = useState<ColumnDraft[]>([])
  const [resolved, setResolved] = useState<string>(resolvedColumnId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDrafts(
        columns.map((c, i) => ({ id: c.id, name: c.name, color: c.color, key: c.id ?? `seed-${i}` })),
      )
      setResolved(resolvedColumnId)
      setError(null)
    }
  }, [open, columns, resolvedColumnId])

  if (!open) return null

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= drafts.length) return
    const next = [...drafts]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDrafts(next)
  }

  const updateDraft = (index: number, patch: Partial<ColumnDraft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const remove = (index: number) => {
    const toRemove = drafts[index]
    if (toRemove.id && toRemove.id === resolved) {
      setError('Pick a different resolved column before removing this one.')
      return
    }
    setDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  const add = () => {
    if (drafts.length >= maxColumns) {
      setError(`Maximum ${maxColumns} columns.`)
      return
    }
    setDrafts((prev) => [
      ...prev,
      { name: 'New column', color: '#94a3b8', key: `new-${Date.now()}-${Math.random()}` },
    ])
  }

  const handleSave = async () => {
    setError(null)
    if (drafts.length === 0) {
      setError('At least one column required.')
      return
    }
    if (drafts.some((d) => !d.name.trim())) {
      setError('All columns need a name.')
      return
    }
    setSaving(true)
    try {
      const payload = drafts.map((d) => ({ id: d.id, name: d.name.trim(), color: d.color }))
      let resolvedId = resolved
      if (!drafts.some((d) => d.id === resolvedId)) {
        resolvedId = drafts[drafts.length - 1].id ?? ''
      }
      await onSave(payload, resolvedId)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save columns')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Manage columns</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-auto p-6">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {drafts.map((draft, index) => {
            const isResolved = draft.id && draft.id === resolved
            return (
              <div key={draft.key} className="flex items-center gap-2 rounded-md border bg-background p-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                    title="Move up"
                  >
                    <GripVertical className="h-3 w-3 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === drafts.length - 1}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                    title="Move down"
                  >
                    <GripVertical className="h-3 w-3 -rotate-90" />
                  </button>
                </div>
                <input
                  type="color"
                  value={draft.color || '#94a3b8'}
                  onChange={(e) => updateDraft(index, { color: e.target.value })}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border"
                  title="Column color"
                />
                <Input
                  value={draft.name}
                  onChange={(e) => updateDraft(index, { name: e.target.value })}
                  className="flex-1"
                  placeholder="Column name"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    checked={!!isResolved}
                    onChange={() => draft.id && setResolved(draft.id)}
                    disabled={!draft.id}
                    title={draft.id ? 'Mark as resolved column' : 'Save first to mark resolved'}
                  />
                  Resolved
                </label>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Remove column"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          <Button variant="outline" size="sm" onClick={add} disabled={drafts.length >= maxColumns}>
            <Plus className="mr-2 h-4 w-4" /> Add column ({drafts.length}/{maxColumns})
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save columns'}
          </Button>
        </div>
      </div>
    </div>
  )
}
