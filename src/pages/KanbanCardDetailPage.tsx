import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useKanbanBoard,
  useKanbanCardDetail,
  useUpdateKanbanCard,
  useDeleteKanbanCard,
  useAddKanbanComment,
  useDeleteKanbanComment,
  useLinkTicket,
  useUnlinkTicket,
} from '@/hooks/useKanbanBoard'
import { api } from '@/lib/api'
import type {
  KanbanCardType,
  KanbanPriority,
  UserResponse,
  KanbanCardCommentResponse,
} from '@/types/api'
import type { ImageUploadResult } from '@/components/ui/RichTextEditor'
import { cardTypeColors, cardTypeLabels, priorityColors, formatStoryId } from '@/components/Kanban/kanbanStyles'
import { LinkTicketPicker } from '@/components/Kanban/LinkTicketPicker'

const types: KanbanCardType[] = ['Feature', 'Bug', 'Improvement', 'TechDebt']
const priorities: KanbanPriority[] = ['Low', 'Normal', 'High', 'Urgent']

export function KanbanCardDetailPage() {
  const params = useParams({ from: '/kanban/stories/$storyNumber' })
  const search = useSearch({ from: '/kanban/stories/$storyNumber' })
  const navigate = useNavigate()
  const cardNumber = Number(params.storyNumber)
  const fromTicket = search.fromTicket

  const { companyId } = useCurrentUser()
  const { selectedProjectId } = useSelectedProject()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('Kanban.Edit')
  const canDelete = hasPermission('Kanban.Delete')

  const { data: board } = useKanbanBoard(companyId, selectedProjectId)
  const { data: detail, isLoading } = useKanbanCardDetail(companyId, selectedProjectId, isNaN(cardNumber) ? null : cardNumber)

  const { data: members } = useQuery({
    queryKey: ['companyMembers', companyId],
    queryFn: () => api.get<UserResponse[]>(`/api/v1/users/company/${companyId}`),
    enabled: !!companyId,
  })

  const updateCard = useUpdateKanbanCard(companyId, selectedProjectId)
  const deleteComment = useDeleteKanbanComment(companyId, selectedProjectId)

  const uploadImage = useMemo(
    () =>
      companyId && selectedProjectId
        ? (file: File) =>
            api.upload<ImageUploadResult>(
              `/api/v1/companies/${companyId}/projects/${selectedProjectId}/board/images`,
              file,
            )
        : undefined,
    [companyId, selectedProjectId],
  )
  const deleteCard = useDeleteKanbanCard(companyId, selectedProjectId)
  const addComment = useAddKanbanComment(companyId, selectedProjectId)
  const linkTicket = useLinkTicket(companyId, selectedProjectId)
  const unlinkTicket = useUnlinkTicket(companyId, selectedProjectId)

  const [title, setTitle] = useState('')
  const [descriptionHtml, setDescriptionHtml] = useState('')
  const [type, setType] = useState<KanbanCardType>('Feature')
  const [priority, setPriority] = useState<KanbanPriority>('Normal')
  const [assignee, setAssignee] = useState('')
  const [columnId, setColumnId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [commentHtml, setCommentHtml] = useState('')
  const [commentKey, setCommentKey] = useState(0)

  useEffect(() => {
    if (detail?.card) {
      setTitle(detail.card.title)
      setDescriptionHtml(detail.card.descriptionHtml ?? '')
      setType(detail.card.type)
      setPriority(detail.card.priority)
      setAssignee(detail.card.assignedToUserId ?? '')
      setColumnId(detail.card.columnId)
      setTags([...detail.card.tags])
    }
  }, [detail?.card?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  const userNamesById = useMemo(() => {
    const map = new Map<string, string>()
    members?.forEach((m) => map.set(m.id, m.displayName || m.email))
    return map
  }, [members])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Story not found.</p>
        {fromTicket ? (
          <Link
            to="/tickets/$ticketId"
            params={{ ticketId: fromTicket }}
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Back to ticket
          </Link>
        ) : (
          <Link to="/kanban" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to board
          </Link>
        )}
      </div>
    )
  }

  const card = detail.card

  const saveField = (patch: Record<string, unknown>) => {
    if (!canEdit) return
    updateCard.mutate({ cardId: card.id, data: patch })
  }

  const addTagFromInput = () => {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) {
      setTagInput('')
      return
    }
    const next = [...tags, t]
    setTags(next)
    setTagInput('')
    saveField({ tags: next })
  }

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t)
    setTags(next)
    saveField({ tags: next })
  }

  const handleSaveDescription = () => {
    saveField({ descriptionHtml })
  }

  const handleSubmitComment = async () => {
    const trimmed = commentHtml.replace(/<p>\s*<\/p>/g, '').trim()
    if (!trimmed) return
    await addComment.mutateAsync({ cardId: card.id, bodyHtml: commentHtml })
    setCommentHtml('')
    setCommentKey((k) => k + 1)
  }

  const handleDelete = async () => {
    await deleteCard.mutateAsync(card.id)
    navigate({ to: '/kanban' })
  }

  const isResolved = board?.resolvedColumnId === card.columnId

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        {fromTicket ? (
          <Link
            to="/tickets/$ticketId"
            params={{ ticketId: fromTicket }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ticket
          </Link>
        ) : (
          <Link to="/kanban" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to board
          </Link>
        )}
        <span className="font-mono text-sm text-muted-foreground">{formatStoryId(card.cardNumber)}</span>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cardTypeColors[card.type]}`}>
            {cardTypeLabels[card.type]}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[card.priority]}`}>
            {card.priority}
          </span>
          {isResolved && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Resolved
            </span>
          )}
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== card.title && saveField({ title })}
          disabled={!canEdit}
          className="!h-auto !text-2xl !font-bold !px-2 !py-1"
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Description</label>
                {canEdit && descriptionHtml !== (card.descriptionHtml ?? '') && (
                  <Button size="sm" variant="outline" onClick={handleSaveDescription}>
                    <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                  </Button>
                )}
              </div>
              <RichTextEditor
                content={descriptionHtml}
                onChange={(html) => setDescriptionHtml(html)}
                onSubmit={handleSaveDescription}
                placeholder="Add a description..."
                onImageUpload={uploadImage}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Activity</h3>
              <div className="space-y-3">
                {detail.comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                ) : (
                  detail.comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      authorName={c.authorUserId ? userNamesById.get(c.authorUserId) : undefined}
                      canDelete={canEdit && c.type !== 'System'}
                      onDelete={() => deleteComment.mutate({ cardId: card.id, commentId: c.id })}
                      isDeleting={deleteComment.isPending}
                    />
                  ))
                )}
              </div>

              {canEdit && (
                <div className="space-y-2 border-t pt-3">
                  <RichTextEditor
                    key={commentKey}
                    content=""
                    onChange={(html) => setCommentHtml(html)}
                    onSubmit={handleSubmitComment}
                    placeholder="Write a comment... (Ctrl+Enter to send)"
                    onImageUpload={uploadImage}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSubmitComment} disabled={addComment.isPending}>
                      {addComment.isPending ? 'Posting...' : 'Comment'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5 rounded-lg border bg-muted/30 p-4">
            <Field label="Status (column)">
              <select
                value={columnId}
                onChange={(e) => {
                  const v = e.target.value
                  setColumnId(v)
                  saveField({ columnId: v })
                }}
                disabled={!canEdit}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {board?.columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Type">
              <select
                value={type}
                onChange={(e) => {
                  const v = e.target.value as KanbanCardType
                  setType(v)
                  saveField({ type: v })
                }}
                disabled={!canEdit}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {types.map((t) => <option key={t} value={t}>{t === 'TechDebt' ? 'Tech Debt' : t}</option>)}
              </select>
            </Field>

            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => {
                  const v = e.target.value as KanbanPriority
                  setPriority(v)
                  saveField({ priority: v })
                }}
                disabled={!canEdit}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="Assignee">
              <select
                value={assignee}
                onChange={(e) => {
                  const v = e.target.value
                  setAssignee(v)
                  if (v === '') saveField({ clearAssignee: true })
                  else saveField({ assignedToUserId: v })
                }}
                disabled={!canEdit}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Unassigned</option>
                {members?.map((m) => (
                  <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                ))}
              </select>
            </Field>

            <Field label="Tags">
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                      {t}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {canEdit && (
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        addTagFromInput()
                      }
                    }}
                    onBlur={addTagFromInput}
                    placeholder="Add tag and press Enter"
                    className="text-xs"
                  />
                )}
              </div>
            </Field>

            <LinkTicketPicker
              linkedTickets={detail.linkedTickets}
              onAdd={async (v) => {
                await linkTicket.mutateAsync({ cardId: card.id, ticketIdOrNumber: v })
              }}
              onRemove={async (ticketId) => {
                await unlinkTicket.mutateAsync({ cardId: card.id, ticketId })
              }}
              disabled={!canEdit}
            />

            {canDelete && (
              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete story
                </Button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete story?"
          message={`${formatStoryId(card.cardNumber)} will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function CommentItem({
  comment,
  authorName,
  canDelete,
  onDelete,
  isDeleting,
}: {
  comment: KanbanCardCommentResponse
  authorName?: string
  canDelete?: boolean
  onDelete?: () => void
  isDeleting?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const isSystem = comment.type === 'System'
  const date = new Date(comment.createdOnDateTime).toLocaleString()

  return (
    <div className={`group rounded-md border px-3 py-2 text-sm ${isSystem ? 'bg-muted/30 italic' : 'bg-background'}`}>
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">
          {isSystem ? 'System' : authorName ?? 'Someone'}
        </span>
        <span>{date}</span>
        {canDelete && (
          <div className="ml-auto">
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                title="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { onDelete?.(); setConfirming(false) }}
                  disabled={isDeleting}
                  className="rounded px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded px-2 py-0.5 text-xs hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: comment.bodyHtml }}
      />
    </div>
  )
}
