import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, HelpCircle, Inbox, KanbanSquare, Check, X, ArrowRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useMaxQuestionsByStatus,
  useAnswerMaxQuestion,
  useDismissMaxQuestion,
  type MaxQuestionStatus,
} from '@/hooks/useMaxQuestions'
import type { MaxQuestionWithSourceResponse } from '@/types/api'

const STATUS_TABS: { value: MaxQuestionStatus; labelKey: string }[] = [
  { value: 'pending', labelKey: 'questions.tabs.pending' },
  { value: 'answered', labelKey: 'questions.tabs.answered' },
  { value: 'dismissed', labelKey: 'questions.tabs.dismissed' },
]

function formatDate(ts?: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function MaxQuestionsPage() {
  const { t } = useTranslation()
  const { companyId } = useCurrentUser()
  const { selectedProjectId } = useSelectedProject()
  const { hasPermission } = usePermissions()
  const [status, setStatus] = useState<MaxQuestionStatus>('pending')
  const { data: questions, isLoading } = useMaxQuestionsByStatus(companyId, selectedProjectId, status)

  if (!hasPermission('Max.View')) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        You don't have access to Max.
      </div>
    )
  }

  if (!selectedProjectId) {
    return <div className="p-6 text-sm text-muted-foreground">{t('questions.noProject')}</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('questions.subtitle')}</p>

      <div className="flex items-center gap-1 rounded-md border bg-card p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              status === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {!isLoading && (!questions || questions.length === 0) && (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          <HelpCircle className="h-8 w-8 opacity-40" />
          {status === 'pending' && t('questions.emptyPending')}
          {status === 'answered' && t('questions.emptyAnswered')}
          {status === 'dismissed' && t('questions.emptyDismissed')}
        </div>
      )}

      {questions && questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionRow
              key={q.question.id}
              entry={q}
              companyId={companyId!}
              projectId={selectedProjectId}
              readOnly={status !== 'pending'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionRow({
  entry,
  companyId,
  projectId,
  readOnly,
}: {
  entry: MaxQuestionWithSourceResponse
  companyId: string
  projectId: string
  readOnly: boolean
}) {
  const { t } = useTranslation()
  const answerMutation = useAnswerMaxQuestion(companyId, projectId)
  const dismissMutation = useDismissMaxQuestion(companyId, projectId)
  const [answer, setAnswer] = useState('')
  const [promote, setPromote] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleAnswer = async () => {
    setError(null)
    if (!answer.trim()) {
      setError('Answer is required')
      return
    }
    try {
      await answerMutation.mutateAsync({
        id: entry.question.id,
        data: { answer: answer.trim(), promoteToContext: promote },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save answer')
    }
  }

  const handleDismiss = async () => {
    try {
      await dismissMutation.mutateAsync(entry.question.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to dismiss')
    }
  }

  const sourceLabel =
    entry.sourceType === 'ticket'
      ? t('questions.fromTicket', { n: entry.ticketNumber })
      : t('questions.fromStory', { n: entry.storyCardNumber })
  const sourceTitle = entry.sourceType === 'ticket' ? entry.ticketSubject : entry.storyTitle
  const sourceHref =
    entry.sourceType === 'ticket'
      ? `/tickets/${entry.question.sourceTicketId}`
      : `/kanban/stories/${entry.storyCardNumber}`
  const SourceIcon = entry.sourceType === 'ticket' ? Inbox : KanbanSquare

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Link
          to={sourceHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <SourceIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {sourceLabel}
          {sourceTitle && <span className="text-muted-foreground"> · {sourceTitle}</span>}
          <ArrowRight className="h-3 w-3 opacity-50" />
        </Link>
        {readOnly && entry.question.promotedToContext && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <BookOpen className="h-3 w-3" />
            {t('questions.promotedBadge')}
          </span>
        )}
      </div>

      {entry.question.contextExcerpt && (
        <div className="mb-3 rounded border-l-2 border-muted bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground">
          {entry.question.contextExcerpt}
        </div>
      )}

      <p className="mb-3 text-sm font-medium">{entry.question.question}</p>

      {readOnly ? (
        <div className="space-y-1">
          {entry.question.answer ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
              {entry.question.answer}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">{t('questions.noAnswerStored')}</p>
          )}
          {entry.question.answeredOnDateTime && (
            <p className="text-xs text-muted-foreground">
              {t('questions.answeredOn', { date: formatDate(entry.question.answeredOnDateTime) })}
            </p>
          )}
        </div>
      ) : (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t('questions.answerPlaceholder') ?? ''}
            rows={3}
            className="mb-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={promote}
              onChange={(e) => setPromote(e.target.checked)}
              className="rounded"
            />
            {t('questions.promoteToContext')}
          </label>

          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAnswer}
              disabled={answerMutation.isPending || !answer.trim()}
              size="sm"
            >
              {answerMutation.isPending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 h-3.5 w-3.5" />
              )}
              {t('questions.answer')}
            </Button>
            <Button
              onClick={handleDismiss}
              disabled={dismissMutation.isPending}
              variant="ghost"
              size="sm"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {t('questions.dismiss')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
