import { useState } from 'react'
import { X, Plus, MessageSquare, ExternalLink, Link as LinkIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { ExternalSourceType, KanbanCardExternalSourceResponse } from '@/types/api'

interface ExternalSourcesPickerProps {
  externalSources: KanbanCardExternalSourceResponse[]
  onAdd: (url: string) => Promise<void>
  onRemove: (url: string) => Promise<void>
  disabled?: boolean
}

function meta(type: ExternalSourceType): { label: string; icon: LucideIcon; className: string } {
  switch (type) {
    case 'Discord':
      return {
        label: 'Discord',
        icon: MessageSquare,
        className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      }
    default:
      return {
        label: 'Link',
        icon: LinkIcon,
        className: 'bg-muted text-muted-foreground',
      }
  }
}

// For generic links, show the hostname (e.g. "github.com") instead of the bare "Link" word.
function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function ExternalSourcesPicker({ externalSources, onAdd, onRemove, disabled }: ExternalSourcesPickerProps) {
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
      setError(e instanceof Error ? e.message : 'Failed to link source')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">External sources</h4>
      </div>

      {externalSources.length === 0 ? (
        <p className="text-xs text-muted-foreground">No external links pinned.</p>
      ) : (
        <ul className="space-y-1">
          {externalSources.map((src, i) => {
            const m = meta(src.type)
            const Icon = m.icon
            const label = src.type === 'Discord' ? m.label : (hostnameOf(src.url) ?? m.label)
            // URL is the unique key for every source type; fall back to index for a stray empty one.
            const removeKey = src.url || `${src.type}-${i}`
            return (
              <li
                key={removeKey}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.className}`}>
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {!disabled && src.url && (
                      <button
                        type="button"
                        onClick={() => onRemove(src.url)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Unlink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block break-all text-xs text-muted-foreground hover:underline"
                >
                  {src.threadTitle || src.url}
                </a>
                {src.authorName && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">by {src.authorName}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste any link (Discord, X, GitHub, docs…)"
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
