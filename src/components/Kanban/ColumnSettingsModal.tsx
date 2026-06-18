import { useEffect, useState } from 'react'
import { GripVertical, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BUILTIN_CARD_TYPES } from '@/types/api'
import type { KanbanColumnResponse, KanbanCardTypeResponse } from '@/types/api'
import { cardTypeColors, cardTypeLabels } from './kanbanStyles'

interface ColumnDraft {
  id?: string
  name: string
  color?: string
  key: string
}

interface CardTypeDraft {
  id?: string
  label: string
  color?: string
  key: string
}

const NEW_TYPE_COLOR = '#6366f1'

interface ColumnSettingsModalProps {
  open: boolean
  columns: KanbanColumnResponse[]
  resolvedColumnId: string
  intakeColumnId: string
  customCardTypes: KanbanCardTypeResponse[]
  maxColumns: number
  onClose: () => void
  onSave: (
    columns: Array<{ id?: string; name: string; color?: string }>,
    resolvedColumnId: string,
    intakeColumnId: string,
    cardTypes: Array<{ id?: string; label: string; color?: string }>,
  ) => Promise<void> | void
}

export function ColumnSettingsModal({
  open,
  columns,
  resolvedColumnId,
  intakeColumnId,
  customCardTypes,
  maxColumns,
  onClose,
  onSave,
}: ColumnSettingsModalProps) {
  const [drafts, setDrafts] = useState<ColumnDraft[]>([])
  const [typeDrafts, setTypeDrafts] = useState<CardTypeDraft[]>([])
  const [resolved, setResolved] = useState<string>(resolvedColumnId)
  const [intake, setIntake] = useState<string>(intakeColumnId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDrafts(
        columns.map((c, i) => ({ id: c.id, name: c.name, color: c.color, key: c.id ?? `seed-${i}` })),
      )
      setTypeDrafts(
        customCardTypes.map((t, i) => ({ id: t.id, label: t.label, color: t.color, key: t.id ?? `type-${i}` })),
      )
      setResolved(resolvedColumnId)
      setIntake(intakeColumnId)
      setError(null)
    }
  }, [open, columns, customCardTypes, resolvedColumnId, intakeColumnId])

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
    if (toRemove.id && toRemove.id === intake) {
      setError('Pick a different intake column before removing this one.')
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

  const updateType = (index: number, patch: Partial<CardTypeDraft>) => {
    setTypeDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const removeType = (index: number) => {
    setTypeDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  const addType = () => {
    setTypeDrafts((prev) => [
      ...prev,
      { label: '', color: NEW_TYPE_COLOR, key: `new-${Date.now()}-${Math.random()}` },
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
    if (typeDrafts.some((t) => !t.label.trim())) {
      setError('All story types need a name.')
      return
    }
    const labels = typeDrafts.map((t) => t.label.trim().toLowerCase())
    if (new Set(labels).size !== labels.length) {
      setError('Story type names must be unique.')
      return
    }
    const builtinLabels = new Set(BUILTIN_CARD_TYPES.map((t) => t.toLowerCase()))
    if (labels.some((l) => builtinLabels.has(l))) {
      setError('That story type name is already built in.')
      return
    }
    setSaving(true)
    try {
      const payload = drafts.map((d) => ({ id: d.id, name: d.name.trim(), color: d.color }))
      const typePayload = typeDrafts.map((t) => ({ id: t.id, label: t.label.trim(), color: t.color }))
      let resolvedId = resolved
      if (!drafts.some((d) => d.id === resolvedId)) {
        resolvedId = drafts[drafts.length - 1].id ?? ''
      }
      let intakeId = intake
      if (!drafts.some((d) => d.id === intakeId)) {
        intakeId = drafts[0].id ?? ''
      }
      await onSave(payload, resolvedId, intakeId, typePayload)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save board settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Board settings</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-auto p-6">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Columns */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Columns</h4>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Intake</span> is where new cards from Discord and Max land.{' '}
              <span className="font-medium">Resolved</span> marks a card done.
            </p>
            {drafts.map((draft, index) => {
              const isResolved = draft.id && draft.id === resolved
              const isIntake = draft.id && draft.id === intake
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
                      checked={!!isIntake}
                      onChange={() => draft.id && setIntake(draft.id)}
                      disabled={!draft.id}
                      title={draft.id ? 'Mark as intake column (new Discord/Max cards land here)' : 'Save first to mark intake'}
                    />
                    Intake
                  </label>
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
          </section>

          {/* Story types */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Story types</h4>
            <p className="text-xs text-muted-foreground">
              The four built-in types are always available. Add your own below for this project.
            </p>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {BUILTIN_CARD_TYPES.map((t) => (
                <span
                  key={t}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cardTypeColors[t]}`}
                >
                  {cardTypeLabels[t]}
                </span>
              ))}
            </div>

            {typeDrafts.map((draft, index) => (
              <div key={draft.key} className="flex items-center gap-2 rounded-md border bg-background p-2">
                <input
                  type="color"
                  value={draft.color || NEW_TYPE_COLOR}
                  onChange={(e) => updateType(index, { color: e.target.value })}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border"
                  title="Type color"
                />
                <Input
                  value={draft.label}
                  onChange={(e) => updateType(index, { label: e.target.value })}
                  className="flex-1"
                  placeholder="Type name (e.g. Spike, Chore)"
                />
                <button
                  type="button"
                  onClick={() => removeType(index)}
                  className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Remove type"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addType}>
              <Plus className="mr-2 h-4 w-4" /> Add story type
            </Button>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
