import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Loader2, FlaskConical, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useRunToneAnalyzer, useCreateMaxExampleReply } from '@/hooks/useMax'
import type { MaxToneAnalyzerResponse } from '@/types/api'

type ToneApplyMode = 'replace' | 'merge'

interface ToneAnalyzerModalProps {
  companyId: string
  projectId: string
  currentToneGuide: string
  currentToneAvoid: string
  onClose: () => void
  onApplied: () => void
}

export function ToneAnalyzerModal({
  companyId,
  projectId,
  currentToneGuide,
  currentToneAvoid,
  onClose,
  onApplied,
}: ToneAnalyzerModalProps) {
  const queryClient = useQueryClient()
  const analyze = useRunToneAnalyzer(companyId, projectId)
  const createExample = useCreateMaxExampleReply(companyId, projectId)

  const [result, setResult] = useState<MaxToneAnalyzerResponse | null>(null)
  const [editedTone, setEditedTone] = useState('')
  const [selectedExampleIndices, setSelectedExampleIndices] = useState<Set<number>>(new Set())
  const [mode, setMode] = useState<ToneApplyMode>('replace')
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = () => {
    setError(null)
    analyze.mutate(
      { replyCount: 25 },
      {
        onSuccess: (r) => {
          setResult(r)
          // Max returns two distinct drafts; we combine them into one field
          // since the settings UI also uses a single combined field.
          const combined = [r.toneGuide?.trim(), r.toneAvoid?.trim()].filter(Boolean).join('\n\n')
          setEditedTone(combined)
          setSelectedExampleIndices(new Set(r.recommendedExampleIndices ?? []))
        },
        onError: (e: Error) => setError(e.message),
      },
    )
  }

  const toggleExample = (i: number) => {
    setSelectedExampleIndices((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const handleApply = async () => {
    if (!result) return
    setApplying(true)
    setError(null)
    try {
      // We write the combined tone into toneGuide. toneAvoid is cleared on
      // replace (so old separate-field data doesn't linger) and preserved on
      // append. The em-dash post-processing checks both fields, so backward
      // compat for existing data is maintained.
      const newGuide = mode === 'replace'
        ? editedTone
        : [currentToneGuide, editedTone].filter(Boolean).join('\n\n')
      const newAvoid = mode === 'replace' ? '' : currentToneAvoid

      await api.patch(`/api/v1/companies/${companyId}/projects/${projectId}/settings`, {
        max: {
          toneGuide: newGuide,
          toneAvoid: newAvoid,
        },
      })

      for (const i of selectedExampleIndices) {
        const text = result.replies[i]
        if (!text) continue
        await createExample.mutateAsync({
          replyText: text,
          notes: 'Saved from tone analyzer',
        })
      }

      // Refresh the parent project so the new tone settings show in the form.
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] })
      onApplied()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply tone analyzer results')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={applying ? undefined : onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <FlaskConical className="h-4 w-4 text-primary" />
            Analyze your past replies
          </h3>
          <button onClick={onClose} disabled={applying} className="rounded-md p-1 hover:bg-accent disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!result && (
            <>
              <p className="text-sm text-muted-foreground">
                Max will read up to 25 of your recent replies and draft a tone guide, things to avoid, and a list of suggested example replies in your voice. You'll review before anything is saved.
              </p>
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-50 dark:bg-red-900/10 p-3 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button type="button" onClick={handleRun} disabled={analyze.isPending}>
                  {analyze.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                  {analyze.isPending ? 'Analyzing your replies…' : 'Start analysis'}
                </Button>
              </div>
            </>
          )}

          {result && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Apply mode</p>
                <div className="flex gap-2">
                  <label className={`flex flex-1 cursor-pointer items-start gap-2 rounded-md border p-3 ${mode === 'replace' ? 'border-primary bg-primary/5' : 'border-input'}`}>
                    <input type="radio" name="apply-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Replace</p>
                      <p className="text-xs text-muted-foreground">Overwrite current tone guide and avoid with these drafts.</p>
                    </div>
                  </label>
                  <label className={`flex flex-1 cursor-pointer items-start gap-2 rounded-md border p-3 ${mode === 'merge' ? 'border-primary bg-primary/5' : 'border-input'}`}>
                    <input type="radio" name="apply-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Append</p>
                      <p className="text-xs text-muted-foreground">Add to what you already have. Useful if you've already curated tone settings.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Voice & tone draft</label>
                <p className="text-xs text-muted-foreground">
                  Combined draft of how you sound and what to avoid. Edit freely before applying.
                </p>
                <textarea
                  value={editedTone}
                  onChange={(e) => setEditedTone(e.target.value)}
                  rows={14}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Suggested example replies
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {selectedExampleIndices.size} of {result.replies.length} selected
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Max recommends these as canonical voice samples. Check the ones you want to save — they'll get added to your Example replies list.
                </p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto rounded-md border p-2">
                  {result.replies.map((reply, i) => {
                    const recommended = result.recommendedExampleIndices.includes(i)
                    const selected = selectedExampleIndices.has(i)
                    return (
                      <label key={i} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs ${selected ? 'bg-primary/5 border-primary/30' : 'border-input'}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleExample(i)} className="mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">[{i}]</span>
                            {recommended && (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Recommended</span>
                            )}
                          </div>
                          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{reply}</pre>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-50 dark:bg-red-900/10 p-3 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {result && (
          <div className="flex justify-end gap-2 border-t bg-muted/30 px-5 py-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={applying}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} disabled={applying}>
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {applying ? 'Applying…' : 'Apply'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
