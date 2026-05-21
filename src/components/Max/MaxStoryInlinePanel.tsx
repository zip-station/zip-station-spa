import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Sparkles, Loader2, AlertTriangle, Bug, Lightbulb, Wrench, Hammer, HelpCircle, Flag, Check, X as XIcon, GitMerge, Search, MessageCircleQuestion } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  useStoryMax,
  useReenrichStory,
  useApproveStoryMaxTask,
  useRejectStoryMaxTask,
} from '@/hooks/useStoryMax'
import type { MaxTaskResponse } from '@/types/api'
import { MaxText } from './MaxText'

const categoryStyle: Record<string, { bg: string; text: string; icon: typeof Bug }> = {
  bug: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: Bug },
  feature: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Lightbulb },
  improvement: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', icon: Wrench },
  tech_debt: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: Hammer },
  unclear: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', icon: HelpCircle },
}

const categoryLabel: Record<string, string> = {
  bug: 'Bug',
  feature: 'Feature',
  improvement: 'Improvement',
  tech_debt: 'Tech Debt',
  unclear: 'Unclear',
}

const actionLabel: Record<string, string> = {
  merge_story_duplicate: 'Suggests merging as duplicate',
  investigate: 'Suggests investigation',
  escalated: 'Escalated',
  no_action: 'No action',
}

interface MaxStoryInlinePanelProps {
  companyId: string
  projectId: string
  cardId: string
}

export function MaxStoryInlinePanel({ companyId, projectId, cardId }: MaxStoryInlinePanelProps) {
  const { data, isLoading } = useStoryMax(companyId, projectId, cardId)
  const reenrich = useReenrichStory(companyId, projectId, cardId)
  const [reenrichError, setReenrichError] = useState<string | null>(null)

  if (isLoading) return null
  const enrichment = data?.enrichment ?? null
  const tasks = data?.tasks ?? []
  const questions = data?.questions ?? []

  const handleReenrich = () => {
    setReenrichError(null)
    reenrich.mutate(undefined, { onError: (err: Error) => setReenrichError(err.message) })
  }

  if (!enrichment) {
    return (
      <div className="mb-4 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Max hasn't enriched this story yet.</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleReenrich} disabled={reenrich.isPending}>
            {reenrich.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Run Max
          </Button>
        </div>
        {reenrichError && (
          <p className="mt-2 text-xs text-red-600">{reenrichError}</p>
        )}
      </div>
    )
  }

  if (enrichment.status === 'processing') {
    return (
      <div className="mb-4 rounded-lg border bg-card p-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Max is analyzing this story…</span>
        </div>
      </div>
    )
  }

  if (enrichment.status === 'failed') {
    return (
      <div className="mb-4 rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-900/10 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Max enrichment failed. Check API key + server logs.</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleReenrich} disabled={reenrich.isPending}>
            {reenrich.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const cat = categoryStyle[enrichment.category] ?? categoryStyle.unclear
  const CatIcon = cat.icon
  const confidencePct = Math.round(enrichment.confidence * 100)
  const isEscalated = enrichment.suggestedActionType === 'escalated'
  // `investigate` was retired — older pending tasks of this type still live in Mongo until
  // their story is re-enriched, but we hide them so the panel doesn't show suggestions the
  // maintainer can't act on. Re-enrich auto-cleans them via the pending soft-delete loop.
  const renderableTasks = tasks.filter((t) =>
    t.status === 'pending' && t.type !== 'no_action' && t.type !== 'investigate'
  )

  return (
    <div className="mb-4 space-y-3">
      {/* Top strip */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full ${cat.bg} ${cat.text} px-2 py-0.5 text-xs font-medium`}>
              <CatIcon className="h-3 w-3" />
              {categoryLabel[enrichment.category] ?? enrichment.category}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {confidencePct}% confident
            </span>
            {isEscalated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                <Flag className="h-3 w-3" />
                Needs you
              </span>
            )}
            {enrichment.flaggedQuestion && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <MessageCircleQuestion className="h-3 w-3" />
                Max is asking
              </span>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={handleReenrich} disabled={reenrich.isPending} title="Re-run Max">
            {reenrich.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {enrichment.summary && (
          <p className="text-sm"><MaxText text={enrichment.summary} /></p>
        )}
        {reenrichError && (
          <p className="text-xs text-red-600">{reenrichError}</p>
        )}
      </div>

      {/* Suggested action cards */}
      {renderableTasks.map((task) => (
        <StoryTaskCard
          key={task.id}
          task={task}
          companyId={companyId}
          projectId={projectId}
          cardId={cardId}
        />
      ))}

      {/* Flagged questions */}
      {questions.filter((q) => q.status === 'pending').map((q) => (
        <div key={q.id} className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-900/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <MessageCircleQuestion className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-300">
                <MaxText text={q.question} />
              </p>
              {q.contextExcerpt && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 italic">
                  "<MaxText text={q.contextExcerpt} />"
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StoryTaskCard({
  task,
  companyId,
  projectId,
  cardId,
}: {
  task: MaxTaskResponse
  companyId: string
  projectId: string
  cardId: string
}) {
  const approve = useApproveStoryMaxTask(companyId, projectId, cardId)
  const reject = useRejectStoryMaxTask(companyId, projectId, cardId)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const Icon = task.type === 'merge_story_duplicate' ? GitMerge
    : task.type === 'investigate' ? Search
    : task.type === 'escalated' ? Flag
    : Sparkles
  const label = actionLabel[task.type] ?? task.type
  // investigate / escalated are informational — there's no automated side effect to
  // approve or reject; Approve just acknowledges Max's heads-up. Show a single
  // "Mark reviewed" button instead of the Approve/Reject pair.
  const isInformational = task.type === 'investigate' || task.type === 'escalated'

  if (done) {
    const message = isInformational
      ? (done === 'approved' ? 'Reviewed.' : 'Dismissed.')
      : (done === 'approved' ? 'Approved.' : 'Rejected.')
    return (
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <Check className="h-3.5 w-3.5" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{Math.round(task.confidence * 100)}%</span>
          </div>
          {task.type === 'merge_story_duplicate' && task.details.duplicateOfStoryCardNumber && (
            <p className="mt-1 text-xs text-muted-foreground">
              Merge into{' '}
              <Link
                to="/kanban/stories/$storyNumber"
                params={{ storyNumber: String(task.details.duplicateOfStoryCardNumber) }}
                search={{ fromTicket: undefined }}
                className="font-mono text-primary hover:underline"
              >
                STR-{task.details.duplicateOfStoryCardNumber}
              </Link>
              {task.details.duplicateOfStoryTitle ? <> &ldquo;{task.details.duplicateOfStoryTitle}&rdquo;</> : null}.
              The current story will be voided; linked tickets and Discord links carry over.
            </p>
          )}
          {task.details.notes && (
            <p className="mt-1 text-xs text-muted-foreground italic">
              <MaxText text={task.details.notes} />
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null)
            approve.mutate(task.id, {
              onSuccess: () => setDone('approved'),
              onError: (e: Error) => setError(e.message),
            })
          }}
          disabled={approve.isPending || reject.isPending}
        >
          {approve.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
          {isInformational ? 'Mark reviewed' : 'Approve'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setError(null)
            reject.mutate(task.id, {
              onSuccess: () => setDone('rejected'),
              onError: (e: Error) => setError(e.message),
            })
          }}
          disabled={approve.isPending || reject.isPending}
        >
          {reject.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <XIcon className="mr-1.5 h-3.5 w-3.5" />}
          {isInformational ? 'Dismiss' : 'Reject'}
        </Button>
      </div>
    </div>
  )
}
