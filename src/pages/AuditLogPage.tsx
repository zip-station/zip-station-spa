import { useState, useEffect, useMemo } from 'react'
import { ClipboardList, Loader2, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Pagination } from '@/components/ui/Pagination'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

interface AuditLogEntryResponse {
  id: string
  companyId: string
  projectId?: string
  action: string
  entityType: string
  entityId?: string
  userId: string
  userDisplayName: string
  details?: string
  createdOnDateTime: number
}

const actionColors: Record<string, string> = {
  Create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Approve: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Deny: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

type ActionFilter = 'all' | 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Denied' | 'StatusChanged'
type EntityFilter = 'all' | 'Ticket' | 'Project' | 'IntakeEmail' | 'ApiKey'
type DateFilter = 'all' | '24h' | '7d' | '30d'

export function AuditLogPage() {
  const { companyId } = useCurrentUser()
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [searchQuery, actionFilter, entityFilter, dateFilter])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fromDate = useMemo(() => {
    if (dateFilter === 'all') return undefined
    const now = Date.now()
    if (dateFilter === '24h') return now - 24 * 60 * 60 * 1000
    if (dateFilter === '7d') return now - 7 * 24 * 60 * 60 * 1000
    if (dateFilter === '30d') return now - 30 * 24 * 60 * 60 * 1000
    return undefined
  }, [dateFilter])

  const { data, isLoading } = useQuery({
    queryKey: ['auditLog', companyId, page, searchQuery, actionFilter, entityFilter, fromDate],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('resultsPerPage', '25')
      if (searchQuery) params.set('query', searchQuery)
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (entityFilter !== 'all') params.set('entityType', entityFilter)
      if (fromDate !== undefined) params.set('fromDate', String(fromDate))
      return api.get<{ totalResultCount: number; results: AuditLogEntryResponse[] }>(
        `/api/v1/companies/${companyId}/audit-log?${params.toString()}`
      )
    },
    enabled: !!companyId,
  })

  const entries = data?.results
  const totalCount = data?.totalResultCount ?? 0

  const formatDate = (ts: number) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const getActionColor = (action: string) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action.toLowerCase().includes(key.toLowerCase())) return color
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  }

  const pillClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('auditLog.title')}</h2>
        <p className="mt-1 text-muted-foreground">{t('auditLog.subtitle')}</p>
      </div>

      {/* Search box */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search audit log..."
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Action type filter */}
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {(['all', 'Created', 'Updated', 'Deleted', 'Approved', 'Denied', 'StatusChanged'] as ActionFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setActionFilter(f)}
              className={pillClass(actionFilter === f)}
            >
              {f === 'all' ? 'All Actions' : f}
            </button>
          ))}
        </div>

        {/* Entity type filter */}
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {(['all', 'Ticket', 'Project', 'IntakeEmail', 'ApiKey'] as EntityFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setEntityFilter(f)}
              className={pillClass(entityFilter === f)}
            >
              {f === 'all' ? 'All Entities' : f}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {([
            { value: 'all', label: 'All Time' },
            { value: '24h', label: 'Last 24h' },
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
          ] as { value: DateFilter; label: string }[]).map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value)}
              className={pillClass(dateFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && entries && entries.length > 0 && (
        <div className="rounded-lg border">
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(entry.action)}`}>
                        {entry.action}
                      </span>
                      <span className="text-sm font-medium">{entry.entityType}</span>
                      {entry.entityId && (
                        <span className="text-xs text-muted-foreground font-mono">{entry.entityId.slice(0, 8)}...</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{entry.userDisplayName}</span>
                      {entry.details && <span>{entry.details}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(entry.createdOnDateTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && entries && entries.length > 0 && (
        <Pagination page={page} totalCount={totalCount} resultsPerPage={25} onPageChange={setPage} />
      )}

      {!isLoading && (!entries || entries.length === 0) && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('auditLog.noEntriesTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('auditLog.noEntriesDesc')}</p>
        </div>
      )}
    </>
  )
}
