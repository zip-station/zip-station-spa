import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Sparkles, Loader2, AlertTriangle, Bug, Lightbulb, BookOpen, CreditCard, UserCircle, MessageCircle, Trash, HelpCircle, ArrowRight, MessageCircleQuestion, Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTicketMax, useReenrichTicket } from '@/hooks/useMax'
import type { MaxTicketEnrichmentResponse, MaxTaskResponse } from '@/types/api'

const categoryStyle: Record<string, { bg: string; text: string; icon: typeof Bug }> = {
  bug: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: Bug },
  feature_request: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Lightbulb },
  how_to: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', icon: BookOpen },
  billing: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: CreditCard },
  account: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: UserCircle },
  feedback: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', icon: MessageCircle },
  spam: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', icon: Trash },
  unsure: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', icon: HelpCircle },
}

const categoryLabel: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'Feature request',
  how_to: 'How-to',
  billing: 'Billing',
  account: 'Account',
  feedback: 'Feedback',
  spam: 'Spam',
  unsure: 'Unsure',
}

const actionLabel: Record<string, string> = {
  investigate: 'Suggests investigation',
  merge_duplicate: 'Suggests merging as duplicate',
  add_to_backlog: 'Suggests adding to kanban',
  no_action: 'No action',
}

// Tasks rendered as standalone cards. draft_reply gets prefilled into the reply
// composer instead, and escalated surfaces as a badge in the top strip.
const RENDER_AS_CARD: ReadonlySet<string> = new Set([
  'investigate',
  'merge_duplicate',
  'add_to_backlog',
])

interface MaxInlinePanelProps {
  companyId: string
  ticketId: string
}

export function MaxInlinePanel({ companyId, ticketId }: MaxInlinePanelProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useTicketMax(companyId, ticketId)
  const reenrich = useReenrichTicket(companyId, ticketId)
  const [reenrichError, setReenrichError] = useState<string | null>(null)

  if (isLoading) return null
  const enrichment = data?.enrichment ?? null
  const tasks = data?.tasks ?? []
  const questions = data?.questions ?? []

  const handleReenrich = () => {
    setReenrichError(null)
    reenrich.mutate(undefined, {
      onError: (err: Error) => setReenrichError(err.message),
    })
  }

  if (!enrichment) {
    return (
      <div className="mb-4 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>{t('maxInline.notEnriched', 'Max hasn’t enriched this ticket yet.')}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleReenrich} disabled={reenrich.isPending}>
            {reenrich.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {t('maxInline.enrichNow', 'Enrich now')}
          </Button>
        </div>
        {reenrichError && <p className="mt-2 text-xs text-red-600">{reenrichError}</p>}
      </div>
    )
  }

  if (enrichment.status === 'processing') {
    return (
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>{t('maxInline.analyzing', 'Max is analyzing this ticket…')}</span>
        </div>
      </div>
    )
  }

  if (enrichment.status === 'failed') {
    return (
      <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t('maxInline.failed', 'Max couldn’t analyze this ticket. Check the worker logs, then try again.')}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleReenrich} disabled={reenrich.isPending}>
            {reenrich.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {t('maxInline.retry', 'Try again')}
          </Button>
        </div>
        {reenrichError && <p className="mt-2 text-xs text-red-600">{reenrichError}</p>}
      </div>
    )
  }

  const style = categoryStyle[enrichment.category] ?? categoryStyle.unsure
  const Icon = style.icon
  const isEscalated = enrichment.suggestedActionType === 'escalated'
  const escalatedTask = tasks.find((task) => task.type === 'escalated' && task.status === 'pending')
  const escalationReason = escalatedTask?.details.notes ?? enrichment.suggestedNotes ?? enrichment.reasoning

  return (
    <div className="mb-4 space-y-3">
      {/* Top strip: Max's summary */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          {t('maxInline.summaryHeader', "Max's summary")}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
              <Icon className="h-3 w-3" />
              {categoryLabel[enrichment.category] ?? enrichment.category}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t('maxInline.confidence', { confidence: Math.round(enrichment.confidence * 100), defaultValue: '{{confidence}}% confidence' })}
            </span>
            {isEscalated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" title={t('maxInline.escalatedTooltip', 'Max won’t act on this. Handle it yourself.')}>
                <Flag className="h-3 w-3" />
                {t('maxInline.escalatedBadge', 'Needs you')}
              </span>
            )}
            {enrichment.platform && enrichment.platform !== 'unknown' && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{enrichment.platform}</span>
            )}
            {enrichment.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-input px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
            ))}
          </div>
          {enrichment.summary && (
            <p className="text-sm text-foreground">{enrichment.summary}</p>
          )}
          {isEscalated && escalationReason && (
            <p className="text-xs text-amber-700 dark:text-amber-400 italic">
              {t('maxInline.escalatedWhy', 'Why:')} {escalationReason}
            </p>
          )}
          {enrichment.duplicateOfTicketId && (
            <p className="text-xs text-muted-foreground">
              {t('maxInline.duplicateOf', 'Possibly a duplicate of')}{' '}
              <Link to="/tickets/$ticketId" params={{ ticketId: enrichment.duplicateOfTicketId }} className="text-primary hover:underline inline-flex items-center gap-0.5">
                {t('maxInline.thisTicket', 'this ticket')} <ArrowRight className="h-3 w-3" />
              </Link>
            </p>
          )}
          {enrichment.relatedTicketIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>{t('maxInline.related', 'Related:')}</span>
              {enrichment.relatedTicketIds.map((id) => (
                <Link key={id} to="/tickets/$ticketId" params={{ ticketId: id }} className="text-primary hover:underline">
                  ticket
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested action cards. draft_reply is handled inline in the reply composer;
          escalated surfaces as the top-strip badge above. */}
      {tasks.filter((t) => t.status === 'pending' && RENDER_AS_CARD.has(t.type)).map((task) => (
        <SuggestedActionCard key={task.id} task={task} enrichment={enrichment} />
      ))}

      {/* Flagged questions */}
      {questions.filter((q) => q.status === 'pending').map((q) => (
        <div key={q.id} className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t('maxInline.maxAsks', 'Max is asking')}</p>
              <p className="text-sm">{q.question}</p>
              {q.contextExcerpt && (
                <p className="text-xs text-muted-foreground italic">"{q.contextExcerpt}"</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('maxInline.questionPhase4', 'You’ll be able to answer Max in the chat surface (coming in phase 4). Until then, edit the project context manually.')}
              </p>
            </div>
          </div>
        </div>
      ))}

      {reenrichError && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{reenrichError}</span>
        </div>
      )}
    </div>
  )
}

function SuggestedActionCard({ task, enrichment }: { task: MaxTaskResponse; enrichment: MaxTicketEnrichmentResponse }) {
  const { t } = useTranslation()
  const headerLabel = actionLabel[task.type] ?? task.type

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{headerLabel}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {Math.round(task.confidence * 100)}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground italic">{t('maxInline.readOnly', 'Read-only in this phase')}</span>
      </div>
      <div className="p-4 space-y-3">
        {task.type === 'investigate' && (
          <div className="text-sm">
            <p className="font-medium mb-1">{t('maxInline.investigationHints', 'Investigation hints')}</p>
            <p className="text-sm whitespace-pre-wrap">{task.details.notes ?? '(no notes provided)'}</p>
          </div>
        )}
        {task.type === 'merge_duplicate' && (
          <div className="text-sm">
            <p>{t('maxInline.suggestsMerge', 'Suggests merging into the duplicate above.')}</p>
            {task.details.notes && <p className="text-xs text-muted-foreground italic mt-1">{task.details.notes}</p>}
          </div>
        )}
        {task.type === 'add_to_backlog' && (
          <div className="text-sm">
            <p>
              {t('maxInline.suggestsKanban', 'Suggests creating a kanban card:')}{' '}
              <span className="font-medium">{task.details.suggestedTitle ?? enrichment.summary}</span>
              {task.details.suggestedKanbanType && (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{task.details.suggestedKanbanType}</span>
              )}
            </p>
            {task.details.notes && <p className="text-xs text-muted-foreground italic mt-1">{task.details.notes}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
