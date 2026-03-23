import { useState, useEffect } from 'react'
import { Inbox, Plus, Loader2, ArrowRight, Clock, Search, CheckSquare, Square, X, Trash2, UserPlus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProjects } from '@/hooks/useProjects'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ProjectResponse, UserResponse } from '@/types/api'

interface TicketResponse {
  id: string
  companyId: string
  projectId: string
  subject: string
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed' | 'Merged' | 'Abandoned'
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  assignedToUserId?: string
  customerName?: string
  customerEmail?: string
  tags: string[]
  createdOnDateTime: number
  updatedOnDateTime: number
}

interface CreateTicketRequest {
  projectId: string
  subject: string
  priority: string
  customerName?: string
  customerEmail?: string
  body?: string
}

const statusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  Merged: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Abandoned: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
}

const priorityColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  Normal: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

type AssignmentFilter = 'all' | 'me' | 'unassigned'
type PriorityFilter = 'all' | 'Low' | 'Normal' | 'High' | 'Urgent'

export function TicketsPage() {
  const { companyId } = useCurrentUser()
  const { data: projects } = useProjects(companyId)
  const { selectedProjectId } = useSelectedProject()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Check for ?create=true from keyboard shortcut
  const urlParams = new URLSearchParams(window.location.search)
  const shouldCreate = urlParams.get('create') === 'true'

  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(['Open', 'Pending']))
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreate, setShowCreate] = useState(shouldCreate)
  const [subject, setSubject] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState('Normal')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set())
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)

  useEffect(() => { setPage(1) }, [statusFilter, assignmentFilter, priorityFilter, searchQuery])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', companyId, Array.from(statusFilter).sort().join(','), assignmentFilter, priorityFilter, selectedProjectId, page, searchQuery],
    queryFn: () => {
      const statusParams = statusFilter.size > 0
        ? Array.from(statusFilter).map(s => `status=${s}`).join('&')
        : ''
      const baseParams = `page=${page}&resultsPerPage=25`
      const params = statusParams ? `?${statusParams}&${baseParams}` : `?${baseParams}`
      const projectParam = selectedProjectId ? `&projectId=${selectedProjectId}` : ''
      const queryParam = searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ''
      const assignParam = assignmentFilter !== 'all' ? `&assignedTo=${assignmentFilter}` : ''
      const priorityParam = priorityFilter !== 'all' ? `&priority=${priorityFilter}` : ''
      return api.get<{ totalResultCount: number; results: TicketResponse[] }>(`/api/v1/companies/${companyId}/tickets${params}${projectParam}${queryParam}${assignParam}${priorityParam}`)
    },
    enabled: !!companyId,
  })

  const tickets = data?.results
  const totalCount = data?.totalResultCount ?? 0

  const createTicket = useMutation({
    mutationFn: (data: CreateTicketRequest) =>
      api.post<TicketResponse>(`/api/v1/companies/${companyId}/tickets`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] })
      setShowCreate(false)
      setSubject('')
      setProjectId('')
      setPriority('Normal')
      setCustomerName('')
      setCustomerEmail('')
      setBody('')
    },
  })

  // Fetch company members for bulk assign dropdown
  const { data: companyMembers } = useQuery({
    queryKey: ['companyMembers', companyId],
    queryFn: () => api.get<UserResponse[]>(`/api/v1/users/company/${companyId}`),
    enabled: !!companyId && selectedTicketIds.size > 0,
  })

  const bulkAction = useMutation({
    mutationFn: (payload: { ticketIds: string[]; action: string; assignToUserId?: string }) =>
      api.post<{ affectedCount: number }>(`/api/v1/companies/${companyId}/tickets/bulk`, {
        ticketIds: payload.ticketIds,
        action: payload.action,
        assignToUserId: payload.assignToUserId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] })
      setSelectedTicketIds(new Set())
      setShowAssignDropdown(false)
    },
  })

  const handleBulkAction = (action: string, assignToUserId?: string) => {
    if (selectedTicketIds.size === 0) return
    bulkAction.mutate({ ticketIds: Array.from(selectedTicketIds), action, assignToUserId })
  }

  const toggleTicketSelection = (ticketId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedTicketIds((prev) => {
      const next = new Set(prev)
      if (next.has(ticketId)) next.delete(ticketId)
      else next.add(ticketId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!tickets) return
    if (selectedTicketIds.size === tickets.length) {
      setSelectedTicketIds(new Set())
    } else {
      setSelectedTicketIds(new Set(tickets.map((t) => t.id)))
    }
  }

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedTicketIds(new Set())
    setShowAssignDropdown(false)
  }, [statusFilter, assignmentFilter, priorityFilter, page, searchQuery, selectedProjectId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createTicket.mutateAsync({
        projectId,
        subject,
        priority,
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
        body: body || undefined,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tickets.failedToCreate'))
    }
  }

  const getProjectName = (pid: string) =>
    projects?.find((p: ProjectResponse) => p.id === pid)?.name ?? pid

  const statusFilterKey: Record<string, string> = {
    all: 'tickets.filterAll',
    Open: 'tickets.filterOpen',
    Pending: 'tickets.filterPending',
    Resolved: 'tickets.filterResolved',
    Closed: 'tickets.filterClosed',
  }

  const statusI18n: Record<string, string> = {
    Open: 'tickets.statusOpen',
    Pending: 'tickets.statusPending',
    Resolved: 'tickets.statusResolved',
    Closed: 'tickets.statusClosed',
    Merged: 'tickets.statusMerged',
    Abandoned: 'tickets.statusAbandoned',
  }

  const priorityI18n: Record<string, string> = {
    Low: 'tickets.priorityLow',
    Normal: 'tickets.priorityNormal',
    High: 'tickets.priorityHigh',
    Urgent: 'tickets.priorityUrgent',
  }

  const formatDate = (ts: number) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('tickets.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('tickets.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={showCreate}>
          <Plus className="mr-2 h-4 w-4" /> {t('tickets.newTicket')}
        </Button>
      </div>

      {/* Create ticket form */}
      {showCreate && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('tickets.createTicket')}</h3>

          {!projects || projects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">{t('tickets.noProjectsWarning')}</p>
              <Link to="/projects">
                <Button variant="outline" size="sm">
                  {t('tickets.goToProjects')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('tickets.project')}</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">{t('tickets.selectProject')}</option>
                      {projects.map((p: ProjectResponse) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('tickets.priority')}</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {['Low', 'Normal', 'High', 'Urgent'].map((p) => (
                        <option key={p} value={p}>{t(priorityI18n[p])}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('tickets.subject')} <span className="text-muted-foreground">({t('common.optional')})</span>
                  </label>
                  <Input
                    placeholder={t('tickets.subjectPlaceholder')}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('tickets.customerName')} <span className="text-muted-foreground">({t('common.optional')})</span>
                    </label>
                    <Input
                      placeholder={t('tickets.customerNamePlaceholder')}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('tickets.customerEmail')} <span className="text-muted-foreground">({t('common.optional')})</span>
                    </label>
                    <Input
                      type="email"
                      placeholder={t('tickets.customerEmailPlaceholder')}
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('tickets.message')} <span className="text-muted-foreground">({t('common.optional')})</span>
                  </label>
                  <textarea
                    placeholder={t('tickets.messagePlaceholder')}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createTicket.isPending}>
                    {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('tickets.createTicketBtn')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setError(null) }}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Search + Status filter tabs */}
      {!showCreate && (
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('tickets.searchPlaceholder')}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}
      {!showCreate && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            <button
              key="all"
              onClick={() => setStatusFilter(new Set())}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter.size === 0
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(statusFilterKey['all'])}
            </button>
            {(['Open', 'Pending', 'Resolved', 'Closed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setStatusFilter((prev) => {
                    const next = new Set(prev)
                    if (next.has(f)) next.delete(f)
                    else next.add(f)
                    return next
                  })
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter.has(f)
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(statusFilterKey[f])}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            {(['all', 'me', 'unassigned'] as AssignmentFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setAssignmentFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  assignmentFilter === f
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? t('tickets.filterAll') : f === 'me' ? t('tickets.assignedToMe') : t('tickets.unassigned')}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg border bg-muted p-1">
            {(['all', 'Low', 'Normal', 'High', 'Urgent'] as PriorityFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPriorityFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  priorityFilter === f
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? t('tickets.filterAll') : t(priorityI18n[f])}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {!showCreate && selectedTicketIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border bg-accent/50 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedTicketIds.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('close')}
              disabled={bulkAction.isPending}
            >
              {bulkAction.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Close All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('resolve')}
              disabled={bulkAction.isPending}
            >
              Resolve All
            </Button>
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                disabled={bulkAction.isPending}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign All
              </Button>
              {showAssignDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg">
                  <button
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => handleBulkAction('assign', undefined)}
                  >
                    {t('tickets.unassigned')}
                  </button>
                  {companyMembers?.map((member) => (
                    <button
                      key={member.id}
                      className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => handleBulkAction('assign', member.id)}
                    >
                      {member.displayName || member.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => handleBulkAction('delete')}
              disabled={bulkAction.isPending}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedTicketIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {!showCreate && isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Ticket list */}
      {!showCreate && !isLoading && tickets && tickets.length > 0 && (
        <div className="rounded-lg border">
          {/* Select all header */}
          <div className="flex items-center gap-3 border-b px-4 py-2 bg-muted/30">
            <button
              onClick={toggleSelectAll}
              className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedTicketIds.size === tickets.length && tickets.length > 0
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />
              }
            </button>
            <span className="text-xs text-muted-foreground">
              {selectedTicketIds.size > 0
                ? `${selectedTicketIds.size} of ${tickets.length} selected`
                : 'Select all'
              }
            </span>
          </div>
          <div className="divide-y">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center gap-0">
                <button
                  onClick={(e) => toggleTicketSelection(ticket.id, e)}
                  className="flex items-center justify-center pl-4 pr-1 py-3 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {selectedTicketIds.has(ticket.id)
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />
                  }
                </button>
                <Link
                  to="/tickets/$ticketId"
                  params={{ ticketId: ticket.id }}
                  className="flex flex-1 items-center gap-4 px-3 py-3 transition-colors hover:bg-accent/50 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{ticket.subject}</p>
                      {ticket.status === 'Pending' && ticket.updatedOnDateTime > 0 &&
                        (Date.now() - ticket.updatedOnDateTime) > 5 * 24 * 60 * 60 * 1000 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          <Clock className="h-3 w-3" /> {t('tickets.stale')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{getProjectName(ticket.projectId)}</span>
                      <span>{ticket.customerEmail || ticket.customerName || t('tickets.noCustomer')}</span>
                      <span>{formatDate(ticket.createdOnDateTime)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[ticket.priority] ?? ''}`}>
                      {t(priorityI18n[ticket.priority] ?? ticket.priority)}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status] ?? ''}`}>
                      {t(statusI18n[ticket.status] ?? ticket.status)}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!showCreate && !isLoading && tickets && tickets.length > 0 && (
        <Pagination page={page} totalCount={totalCount} resultsPerPage={25} onPageChange={setPage} />
      )}

      {/* Empty state */}
      {!showCreate && !isLoading && (!tickets || tickets.length === 0) && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('tickets.noTicketsTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('tickets.noTicketsDesc')}</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t('tickets.createFirst')}
          </Button>
        </div>
      )}
    </>
  )
}
