import { Link } from '@tanstack/react-router'
import { Sparkles, Check, X as XIcon, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { usePermissions } from '@/hooks/usePermissions'
import { usePendingMaxTasks, useApproveMaxTask, useRejectMaxTask } from '@/hooks/useMax'
import type { MaxTaskWithTicketResponse } from '@/types/api'

const typeLabel: Record<string, string> = {
  draft_reply: 'Reply drafted',
  merge_duplicate: 'Merge as duplicate',
  add_to_backlog: 'Add to kanban',
  link_to_story: 'Link to existing story',
  investigate: 'Investigate',
  escalated: 'Escalated',
}

export function MaxTasksPage() {
  const { companyId } = useCurrentUser()
  const { selectedProjectId } = useSelectedProject()
  const { hasPermission } = usePermissions()
  const { data: tasks, isLoading } = usePendingMaxTasks(companyId, selectedProjectId)

  if (!hasPermission('Max.View')) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        You don't have access to Max.
      </div>
    )
  }

  if (!selectedProjectId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Select a project to see its Max tasks.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Max</h1>
          <p className="text-sm text-muted-foreground">
            Pending suggestions across all tickets. Approve to execute, reject to dismiss.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {tasks && tasks.length === 0 && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No pending tasks. Max has nothing waiting for your approval right now.
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="divide-y rounded-lg border bg-card">
          {tasks.map((row) => (
            <TaskRow key={row.task.id} row={row} companyId={companyId!} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ row, companyId }: { row: MaxTaskWithTicketResponse; companyId: string }) {
  const approve = useApproveMaxTask(companyId, row.task.ticketId)
  const reject = useRejectMaxTask(companyId, row.task.ticketId)
  const busy = approve.isPending || reject.isPending || approve.isSuccess || reject.isSuccess
  const isDraftReply = row.task.type === 'draft_reply'
  const informational = row.task.type === 'investigate' || row.task.type === 'escalated'

  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {typeLabel[row.task.type] ?? row.task.type}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {Math.round(row.task.confidence * 100)}%
          </span>
          <Link
            to="/tickets/$ticketId"
            params={{ ticketId: row.task.ticketId }}
            className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            #{row.ticketNumber}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="mt-1 truncate text-sm">{row.ticketSubject}</p>
        {row.customerEmail && (
          <p className="text-xs text-muted-foreground">
            {row.customerName ? `${row.customerName} · ${row.customerEmail}` : row.customerEmail}
          </p>
        )}
        {row.task.details.notes && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground italic">{row.task.details.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isDraftReply ? (
          <Link
            to="/tickets/$ticketId"
            params={{ ticketId: row.task.ticketId }}
            className="text-xs text-muted-foreground hover:underline"
          >
            Open ticket to send
          </Link>
        ) : informational ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => approve.mutate(row.task.id)}
            disabled={busy}
          >
            {approve.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
            {approve.isSuccess ? 'Done' : 'Mark reviewed'}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => reject.mutate(row.task.id)}
              disabled={busy}
            >
              {reject.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <XIcon className="mr-1 h-3 w-3" />}
              {reject.isSuccess ? 'Rejected' : 'Reject'}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7"
              onClick={() => approve.mutate(row.task.id)}
              disabled={busy}
            >
              {approve.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
              {approve.isSuccess ? 'Done' : 'Approve'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
