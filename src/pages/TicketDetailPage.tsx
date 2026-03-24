import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Send, StickyNote, CheckCircle, RotateCcw, XCircle, MessageSquare, AlertCircle, RefreshCw, Check, Clock, UserCircle, Link2, GitMerge, Plus, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { copyToClipboard } from '@/lib/utils'
import type { UserResponse } from '@/types/api'

interface TicketResponse {
  id: string
  companyId: string
  projectId: string
  ticketNumber: number
  subject: string
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed' | 'Merged' | 'Abandoned'
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  assignedToUserId?: string
  customerName?: string
  customerEmail?: string
  tags: string[]
  linkedTicketIds: string[]
  mergedIntoTicketId?: string
  creationSource?: 'Manual' | 'IntakeManual' | 'IntakeAutoRule' | 'DirectApi'
  createdOnDateTime: number
  updatedOnDateTime: number
}

interface TicketMessageResponse {
  id: string
  ticketId: string
  body: string
  bodyHtml?: string
  isInternalNote: boolean
  authorUserId?: string
  authorName?: string
  authorEmail?: string
  source: 'Customer' | 'Agent' | 'System'
  sendStatus: 'NotApplicable' | 'Pending' | 'Sent' | 'Failed'
  sendError?: string
  sentOnDateTime: number
  createdOnDateTime: number
}

interface TicketDetailData {
  ticket: TicketResponse
  messages: TicketMessageResponse[]
}

const statusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-100 text-gray-800',
  Merged: 'bg-purple-100 text-purple-800',
  Abandoned: 'bg-slate-100 text-slate-800',
}

const statusDescKeys: Record<string, string> = {
  Open: 'ticketDetail.statusDescOpen',
  Pending: 'ticketDetail.statusDescPending',
  Resolved: 'ticketDetail.statusDescResolved',
  Closed: 'ticketDetail.statusDescClosed',
  Merged: 'ticketDetail.statusDescMerged',
  Abandoned: 'ticketDetail.statusDescAbandoned',
}

const priorityColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Normal: 'bg-blue-50 text-blue-700',
  High: 'bg-orange-100 text-orange-800',
  Urgent: 'bg-red-100 text-red-800',
}

interface CannedResponseItem {
  id: string
  title: string
  bodyHtml: string
  shortcut?: string
}

export function TicketDetailPage() {
  const { ticketId } = useParams({ from: '/tickets/$ticketId' })
  const { companyId } = useCurrentUser()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [activeViewers, setActiveViewers] = useState<{ userId: string; userDisplayName: string; avatarUrl?: string }[]>([])
  const [replyBody, setReplyBody] = useState('')
  const [replyHtml, setReplyHtml] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [showCannedPicker, setShowCannedPicker] = useState(false)
  const [ticketIdCopied, setTicketIdCopied] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkTargetId, setLinkTargetId] = useState('')
  const [showMergeInput, setShowMergeInput] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [draftStatus, setDraftStatus] = useState<'idle' | 'restored' | 'saved'>('idle')
  const lastSavedBodyRef = useRef('')
  const draftStatusTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const { data, isLoading } = useQuery({
    queryKey: ['ticket', companyId, ticketId],
    queryFn: () => api.get<TicketDetailData>(`/api/v1/companies/${companyId}/tickets/${ticketId}`),
    enabled: !!companyId && !!ticketId,
  })

  const projectId = data?.ticket?.projectId

  // Canned responses — must be before any early returns (React hooks rules)
  const { data: cannedResponses } = useQuery({
    queryKey: ['cannedResponses', companyId, projectId],
    queryFn: () =>
      api.get<CannedResponseItem[]>(`/api/v1/companies/${companyId}/projects/${projectId}/canned-responses`),
    enabled: !!companyId && !!projectId,
  })

  // Customer lookup for linking
  const customerEmail = data?.ticket?.customerEmail
  const { data: customerData } = useQuery({
    queryKey: ['customerByEmail', companyId, customerEmail],
    queryFn: () =>
      api.get<{ totalResultCount: number; results: { id: string }[] }>(
        `/api/v1/companies/${companyId}/customers?email=${encodeURIComponent(customerEmail!)}&page=1&resultsPerPage=1`
      ),
    enabled: !!companyId && !!customerEmail,
  })
  const customerId = customerData?.results?.[0]?.id

  // Draft: fetch on load
  const { data: draftData } = useQuery({
    queryKey: ['ticketDraft', companyId, ticketId],
    queryFn: () =>
      api.get<{ exists: boolean; body?: string; bodyHtml?: string; isInternalNote?: boolean }>(
        `/api/v1/companies/${companyId}/tickets/${ticketId}/draft`
      ),
    enabled: !!companyId && !!ticketId,
    staleTime: Infinity,
  })

  // Draft: restore once on load
  const draftRestoredRef = useRef(false)
  useEffect(() => {
    if (draftData?.exists && !draftRestoredRef.current) {
      draftRestoredRef.current = true
      setReplyBody(draftData.body ?? '')
      setReplyHtml(draftData.bodyHtml ?? '')
      setIsInternalNote(draftData.isInternalNote ?? false)
      lastSavedBodyRef.current = draftData.body ?? ''
      setEditorKey((k) => k + 1)
      setDraftStatus('restored')
      draftStatusTimerRef.current = setTimeout(() => setDraftStatus('idle'), 3000)
    }
  }, [draftData])

  // Draft: auto-save every 5 seconds
  const showDraftSaved = useCallback(() => {
    setDraftStatus('saved')
    clearTimeout(draftStatusTimerRef.current)
    draftStatusTimerRef.current = setTimeout(() => setDraftStatus('idle'), 2000)
  }, [])

  useEffect(() => {
    if (!companyId || !ticketId) return
    const interval = setInterval(() => {
      const body = replyBody.trim()
      if (!body || body === lastSavedBodyRef.current) return
      lastSavedBodyRef.current = body
      api
        .put(`/api/v1/companies/${companyId}/tickets/${ticketId}/draft`, {
          body: replyBody,
          bodyHtml: replyHtml || undefined,
          isInternalNote,
        })
        .then(() => showDraftSaved())
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [companyId, ticketId, replyBody, replyHtml, isInternalNote, showDraftSaved])

  // Draft: cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(draftStatusTimerRef.current)
  }, [])

  // Collision detection - heartbeat
  useEffect(() => {
    if (!companyId || !ticketId) return

    const sendHeartbeat = async () => {
      try {
        const viewers = await api.post<{ userId: string; userDisplayName: string; avatarUrl?: string }[]>(
          `/api/v1/companies/${companyId}/tickets/${ticketId}/heartbeat`
        )
        setActiveViewers(viewers)
      } catch { /* ignore */ }
    }

    sendHeartbeat() // immediate
    const interval = setInterval(sendHeartbeat, 15000)
    return () => clearInterval(interval)
  }, [companyId, ticketId])

  const deleteDraft = useCallback(() => {
    if (!companyId || !ticketId) return
    lastSavedBodyRef.current = ''
    api.delete(`/api/v1/companies/${companyId}/tickets/${ticketId}/draft`).catch(() => {})
    queryClient.removeQueries({ queryKey: ['ticketDraft', companyId, ticketId] })
  }, [companyId, ticketId, queryClient])

  const addMessage = useMutation({
    mutationFn: (body: { body: string; bodyHtml?: string; isInternalNote: boolean }) =>
      api.post(`/api/v1/companies/${companyId}/tickets/${ticketId}/messages`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketBadgeCount'] })
      setReplyBody('')
      setReplyHtml('')
      setEditorKey((k) => k + 1)
      deleteDraft()
      setDraftStatus('idle')
      // Poll for send status update (email sends in background on the server)
      const pollSendStatus = () => {
        let attempts = 0
        const interval = setInterval(() => {
          attempts++
          queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
          if (attempts >= 10) clearInterval(interval) // stop after ~30s
        }, 3000)
      }
      pollSendStatus()
    },
  })

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/v1/companies/${companyId}/tickets/${ticketId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] })
      queryClient.invalidateQueries({ queryKey: ['ticketBadgeCount'] })
    },
  })

  const retryMessage = useMutation({
    mutationFn: (messageId: string) =>
      api.post(`/api/v1/companies/${companyId}/tickets/${ticketId}/messages/${messageId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
    },
  })

  // Fetch company members for assignment dropdown
  const { data: companyMembers } = useQuery({
    queryKey: ['companyMembers', companyId],
    queryFn: () => api.get<UserResponse[]>(`/api/v1/users/company/${companyId}`),
    enabled: !!companyId,
  })

  const updatePriority = useMutation({
    mutationFn: (priority: string) =>
      api.patch(`/api/v1/companies/${companyId}/tickets/${ticketId}/priority`, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
    },
  })

  const assignTicket = useMutation({
    mutationFn: (userId: string | null) =>
      api.patch(`/api/v1/companies/${companyId}/tickets/${ticketId}/assign`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const updateTags = useMutation({
    mutationFn: (tags: string[]) =>
      api.patch(`/api/v1/companies/${companyId}/tickets/${ticketId}/tags`, { tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
    },
  })

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !data?.ticket?.tags?.includes(tag)) {
      updateTags.mutate([...(data?.ticket?.tags ?? []), tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    updateTags.mutate((data?.ticket?.tags ?? []).filter((t) => t !== tag))
  }

  const linkTicket = useMutation({
    mutationFn: (targetTicketId: string) =>
      api.post(`/api/v1/companies/${companyId}/tickets/${ticketId}/link`, { targetTicketId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
      setLinkTargetId('')
      setShowLinkInput(false)
    },
  })

  const unlinkTicket = useMutation({
    mutationFn: (targetTicketId: string) =>
      api.post(`/api/v1/companies/${companyId}/tickets/${ticketId}/unlink`, { targetTicketId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
    },
  })

  const mergeTicket = useMutation({
    mutationFn: (targetTicketId: string) =>
      api.post(`/api/v1/companies/${companyId}/tickets/${ticketId}/merge`, { targetTicketId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', companyId, ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] })
      setMergeTargetId('')
      setShowMergeInput(false)
      setShowMergeConfirm(false)
    },
  })

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyBody.trim()) return
    addMessage.mutate({ body: replyBody, bodyHtml: replyHtml || undefined, isInternalNote })
  }

  const formatDate = (ts: number) => {
    if (!ts) return ''
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const statusI18n: Record<string, string> = {
    Open: 'tickets.statusOpen',
    Pending: 'tickets.statusPending',
    Resolved: 'tickets.statusResolved',
    Closed: 'tickets.statusClosed',
    Merged: 'tickets.statusMerged',
  }

  // priorityI18n removed — priority is now an editable dropdown

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t('ticketDetail.ticketNotFound')}
      </div>
    )
  }

  const { ticket, messages } = data

  const insertCannedResponse = (item: CannedResponseItem) => {
    setReplyHtml(item.bodyHtml)
    setReplyBody(item.bodyHtml.replace(/<[^>]+>/g, ''))
    setEditorKey((k) => k + 1) // force re-render with new content
    setShowCannedPicker(false)
    // Track usage
    api.post(`/api/v1/companies/${companyId}/projects/${projectId}/canned-responses/${item.id}/use`).catch(() => {})
  }

  return (
    <>
      {/* Merged banner */}
      {ticket.mergedIntoTicketId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800 dark:border-purple-900 dark:bg-purple-900/20 dark:text-purple-300">
          <GitMerge className="h-4 w-4 shrink-0" />
          <span>
            This ticket was merged into{' '}
            <Link
              to="/tickets/$ticketId"
              params={{ ticketId: ticket.mergedIntoTicketId }}
              className="font-medium underline hover:no-underline"
            >
              {ticket.mergedIntoTicketId}
            </Link>
          </span>
        </div>
      )}

      {/* Merge confirmation modal */}
      {showMergeConfirm && (
        <ConfirmModal
          title="Merge Ticket"
          message={`This will merge this ticket into ${mergeTargetId}. All messages will be moved and this ticket will be closed. This action cannot be undone.`}
          confirmLabel="Merge"
          cancelLabel="Cancel"
          destructive
          onConfirm={() => mergeTicket.mutate(mergeTargetId)}
          onCancel={() => setShowMergeConfirm(false)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          {t('ticketDetail.backToTickets')}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => { copyToClipboard(String(ticket.ticketNumber)); setTicketIdCopied(true); setTimeout(() => setTicketIdCopied(false), 2000) }}
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground cursor-pointer"
            >
              {ticketIdCopied ? 'Copied!' : `Ticket #${ticket.ticketNumber}`}
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{ticket.subject}</h2>
              {activeViewers.length > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  {activeViewers.map((v) => (
                    <div
                      key={v.userId}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                      title={`${v.userDisplayName} is viewing this ticket`}
                    >
                      {v.userDisplayName.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {activeViewers.length === 1 ? 'also viewing' : `${activeViewers.length} others viewing`}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-help ${statusColors[ticket.status] ?? ''}`}
                title={t(statusDescKeys[ticket.status] ?? '')}
              >
                {t(statusI18n[ticket.status] ?? ticket.status)}
              </span>
              {ticket.status === 'Pending' && ticket.updatedOnDateTime > 0 &&
                (Date.now() - ticket.updatedOnDateTime) > 5 * 24 * 60 * 60 * 1000 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                  <Clock className="h-3 w-3" /> {t('ticketDetail.staleNoReply', { days: Math.floor((Date.now() - ticket.updatedOnDateTime) / (24 * 60 * 60 * 1000)) })}
                </span>
              )}
              <select
                value={ticket.priority}
                onChange={(e) => updatePriority.mutate(e.target.value)}
                disabled={updatePriority.isPending}
                className={`appearance-none rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer border-0 ${priorityColors[ticket.priority] ?? ''}`}
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              {ticket.customerEmail && (
                <span className="text-sm text-muted-foreground">
                  {t('ticketDetail.customer')}:{' '}
                  {customerId ? (
                    <Link to="/customers/$customerId" params={{ customerId }} className="text-primary hover:underline">
                      {ticket.customerName ? `${ticket.customerName} (${ticket.customerEmail})` : ticket.customerEmail}
                    </Link>
                  ) : (
                    <>{ticket.customerName ? `${ticket.customerName} (${ticket.customerEmail})` : ticket.customerEmail}</>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Assignment + Status actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Assignment dropdown */}
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <select
                value={ticket.assignedToUserId ?? ''}
                onChange={(e) => assignTicket.mutate(e.target.value || null)}
                disabled={assignTicket.isPending}
                className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{t('tickets.unassigned')}</option>
                {companyMembers?.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName || member.email}
                  </option>
                ))}
              </select>
            </div>

          <div className="flex gap-2">
            {(ticket.status === 'Open' || ticket.status === 'Pending') && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate('Resolved')}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  {t('ticketDetail.markResolved')}
                </Button>
                {!showMergeInput ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowMergeInput(true)}
                  >
                    <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                    Merge
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={mergeTargetId}
                      onChange={(e) => setMergeTargetId(e.target.value)}
                      placeholder="Target ticket number (e.g. 6)"
                      className="h-8 w-48 rounded-md border border-input bg-background px-2 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => {
                        if (mergeTargetId.trim()) setShowMergeConfirm(true)
                      }}
                      disabled={!mergeTargetId.trim() || mergeTicket.isPending}
                    >
                      {mergeTicket.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                      Merge
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowMergeInput(false); setMergeTargetId('') }}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </>
            )}
            {ticket.status === 'Resolved' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate('Open')}
                  disabled={updateStatus.isPending}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  {t('ticketDetail.reopen')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate('Closed')}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  {t('ticketDetail.close')}
                </Button>
              </>
            )}
            {ticket.status === 'Closed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus.mutate('Open')}
                disabled={updateStatus.isPending}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t('ticketDetail.reopen')}
              </Button>
            )}
          </div>
          </div>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {t('ticketDetail.created')}: {formatDate(ticket.createdOnDateTime)}
          {ticket.creationSource && (
            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {ticket.creationSource === 'Manual' && 'Created manually'}
              {ticket.creationSource === 'IntakeManual' && 'From intake (approved)'}
              {ticket.creationSource === 'IntakeAutoRule' && 'From intake (auto-rule)'}
              {ticket.creationSource === 'DirectApi' && 'From API'}
            </span>
          )}
        </p>
      </div>

      {/* Tags */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Tag className="h-4 w-4" />
          Tags
          {ticket.tags?.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {ticket.tags.length}
            </span>
          )}
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ticket.tags?.length > 0 ? (
            ticket.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                  disabled={updateTags.isPending}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No tags yet.</span>
          )}
        </div>
        <div className="flex gap-1">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add a tag..."
            className="h-8 text-xs max-w-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addTag() }
            }}
            disabled={updateTags.isPending}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addTag}
            className="h-8"
            disabled={!tagInput.trim() || updateTags.isPending}
          >
            {updateTags.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('ticketDetail.noMessagesYet')}
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg border p-4 ${
              msg.isInternalNote
                ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-900/10'
                : msg.source === 'Customer'
                ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/10'
                : ''
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {msg.authorName || msg.authorEmail || (msg.source === 'System' ? t('ticketDetail.systemMessage') : t('ticketDetail.agent'))}
                </span>
                {msg.isInternalNote && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <StickyNote className="h-3 w-3" />
                    {t('ticketDetail.internalNoteLabel')}
                  </span>
                )}
                {msg.source === 'Customer' && (
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {t('ticketDetail.customer')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {msg.sendStatus === 'Sent' && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600"><Check className="h-3 w-3" /> {t('ticketDetail.sent')}</span>
                )}
                {msg.sendStatus === 'Pending' && (
                  <span className="inline-flex items-center gap-1 text-xs text-yellow-600"><Loader2 className="h-3 w-3 animate-spin" /> {t('ticketDetail.sending')}</span>
                )}
                {msg.sendStatus === 'Failed' && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" /> {t('ticketDetail.failed')}
                    <button
                      onClick={() => retryMessage.mutate(msg.id)}
                      disabled={retryMessage.isPending}
                      className="ml-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700"
                      title={msg.sendError || t('ticketDetail.retrySending')}
                    >
                      <RefreshCw className="h-3 w-3" /> {t('ticketDetail.retry')}
                    </button>
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(msg.createdOnDateTime)}</span>
              </div>
            </div>
            {msg.bodyHtml ? (
              <div className="prose prose-sm max-w-none dark:prose-invert text-sm" dangerouslySetInnerHTML={{ __html: msg.bodyHtml }} />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
            )}
          </div>
        ))}
      </div>

      {/* Linked tickets section */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4" />
            Linked Tickets
            {ticket.linkedTicketIds?.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                {ticket.linkedTicketIds.length}
              </span>
            )}
          </h3>
          {!showLinkInput && (
            <Button size="sm" variant="outline" onClick={() => setShowLinkInput(true)}>
              <Link2 className="mr-1.5 h-3.5 w-3.5" />
              Link Ticket
            </Button>
          )}
        </div>

        {showLinkInput && (
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={linkTargetId}
              onChange={(e) => setLinkTargetId(e.target.value)}
              placeholder="Enter ticket number (e.g. 6)"
              className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && linkTargetId.trim()) {
                  linkTicket.mutate(linkTargetId.trim())
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => linkTicket.mutate(linkTargetId.trim())}
              disabled={!linkTargetId.trim() || linkTicket.isPending}
            >
              {linkTicket.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowLinkInput(false); setLinkTargetId('') }}
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {ticket.linkedTicketIds?.length > 0 ? (
          <div className="space-y-1">
            {ticket.linkedTicketIds.map((linkedId) => (
              <div key={linkedId} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50">
                <Link
                  to="/tickets/$ticketId"
                  params={{ ticketId: linkedId }}
                  className="text-sm text-primary hover:underline font-mono"
                >
                  {linkedId}
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-red-600"
                  onClick={() => unlinkTicket.mutate(linkedId)}
                  disabled={unlinkTicket.isPending}
                >
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No linked tickets.</p>
        )}
      </div>

      {/* Reply form */}
      {ticket.status !== 'Closed' && ticket.status !== 'Merged' && !ticket.mergedIntoTicketId && (
        <div className="rounded-lg border bg-card p-4">
          {/* Toggle reply vs internal note + canned responses */}
          <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            <button
              type="button"
              onClick={() => setIsInternalNote(false)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                !isInternalNote ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Send className="mr-1.5 inline h-3.5 w-3.5" />
              {t('ticketDetail.reply')}
            </button>
            <button
              type="button"
              onClick={() => setIsInternalNote(true)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                isInternalNote ? 'bg-yellow-100 text-yellow-800 shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <StickyNote className="mr-1.5 inline h-3.5 w-3.5" />
              {t('ticketDetail.internalNote')}
            </button>
          </div>

          {/* Canned response picker */}
          <div className="relative">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCannedPicker(!showCannedPicker)}
              disabled={!cannedResponses || cannedResponses.length === 0}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              {t('ticketDetail.cannedResponses')}
            </Button>

            {showCannedPicker && cannedResponses && cannedResponses.length > 0 && (
              <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border bg-card shadow-lg">
                <div className="max-h-64 overflow-y-auto divide-y">
                  {cannedResponses.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => insertCannedResponse(item)}
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.title}</span>
                        {item.shortcut && (
                          <span className="rounded bg-muted px-1 py-0.5 text-xs font-mono text-muted-foreground">{item.shortcut}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1" dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>

          <form onSubmit={handleSendReply}>
            <div className="mb-3">
              <RichTextEditor
                key={editorKey}
                content={replyHtml}
                onChange={(html, text) => {
                  setReplyHtml(html)
                  setReplyBody(text)
                }}
                onSubmit={() => {
                  if (replyBody.trim()) {
                    addMessage.mutate({ body: replyBody, bodyHtml: replyHtml || undefined, isInternalNote })
                  }
                }}
                placeholder={isInternalNote ? t('ticketDetail.notePlaceholder') : t('ticketDetail.replyPlaceholder')}
                className={isInternalNote ? 'border-yellow-300 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-900/10' : ''}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={addMessage.isPending || !replyBody.trim()} size="sm">
                {addMessage.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {isInternalNote ? t('ticketDetail.addNote') : t('ticketDetail.sendReply')}
              </Button>
              {draftStatus === 'saved' && (
                <span className="text-xs text-muted-foreground animate-in fade-in duration-300">
                  {t('ticketDetail.draftSaved', 'Draft saved')}
                </span>
              )}
              {draftStatus === 'restored' && (
                <span className="text-xs text-blue-600 dark:text-blue-400 animate-in fade-in duration-300">
                  {t('ticketDetail.draftRestored', 'Draft restored')}
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  )
}
