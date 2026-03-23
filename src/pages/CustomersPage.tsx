import { useState, useEffect } from 'react'
import { Users, Loader2, Ban, Tag, Search } from 'lucide-react'
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
import type { ProjectResponse } from '@/types/api'

interface CustomerResponse {
  id: string
  companyId: string
  projectId: string
  email: string
  name: string
  tags: string[]
  notes?: string
  isBanned: boolean
  openTicketCount: number
  closedTicketCount: number
  totalTicketCount: number
  createdOnDateTime: number
  updatedOnDateTime: number
}

export function CustomersPage() {
  const { companyId } = useCurrentUser()
  const { data: projects } = useProjects(companyId)
  const { selectedProjectId } = useSelectedProject()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editBanned, setEditBanned] = useState(false)

  useEffect(() => { setPage(1) }, [selectedProjectId, searchQuery])
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', companyId, selectedProjectId, searchQuery, page],
    queryFn: () => {
      const params = selectedProjectId ? `?projectId=${selectedProjectId}&page=${page}&resultsPerPage=25` : `?page=${page}&resultsPerPage=25`
      const queryParam = searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ''
      return api.get<{ totalResultCount: number; results: CustomerResponse[] }>(`/api/v1/companies/${companyId}/customers${params}${queryParam}`)
    },
    enabled: !!companyId,
  })

  const customers = data?.results
  const totalCount = data?.totalResultCount ?? 0

  const updateCustomer = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerResponse> }) =>
      api.put<CustomerResponse>(`/api/v1/companies/${companyId}/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setEditingId(null)
    },
  })

  const getProjectName = (pid: string) =>
    projects?.find((p: ProjectResponse) => p.id === pid)?.name ?? pid

  const formatDate = (ts: number) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const startEdit = (customer: CustomerResponse) => {
    setEditingId(customer.id)
    setEditNotes(customer.notes || '')
    setEditBanned(customer.isBanned)
  }

  const saveEdit = (customer: CustomerResponse) => {
    updateCustomer.mutate({
      id: customer.id,
      data: {
        ...customer,
        notes: editNotes || undefined,
        isBanned: editBanned,
      },
    })
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('customers.title')}</h2>
        <p className="mt-1 text-muted-foreground">{t('customers.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('customers.searchPlaceholder', 'Search customers...')}
          className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && customers && customers.length > 0 && (
        <div className="rounded-lg border">
          <div className="divide-y">
            {customers.map((customer) => (
              <div key={customer.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link to="/customers/$customerId" params={{ customerId: customer.id }} className="font-medium hover:underline hover:text-primary">
                        {customer.name || customer.email}
                      </Link>
                      {customer.isBanned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          <Ban className="h-3 w-3" /> {t('customers.banned')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{customer.email}</span>
                      <span>{getProjectName(customer.projectId)}</span>
                      <span>{t('customers.tickets')}: {customer.openTicketCount} {t('customers.open')} / {customer.totalTicketCount} {t('customers.total')}</span>
                      <span>{formatDate(customer.createdOnDateTime)}</span>
                    </div>
                    {customer.tags.length > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {customer.tags.map((tag) => (
                          <span key={tag} className="rounded bg-accent px-1.5 py-0.5 text-xs">{tag}</span>
                        ))}
                      </div>
                    )}
                    {customer.notes && !editingId && (
                      <p className="mt-1 text-xs text-muted-foreground italic">{customer.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === customer.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder={t('customers.notesPlaceholder')}
                          className="w-48"
                        />
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={editBanned}
                            onChange={(e) => setEditBanned(e.target.checked)}
                          />
                          {t('customers.banned')}
                        </label>
                        <Button size="sm" onClick={() => saveEdit(customer)} disabled={updateCustomer.isPending}>
                          {t('common.save')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(customer)}>
                        {t('common.edit')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && customers && customers.length > 0 && (
        <Pagination page={page} totalCount={totalCount} resultsPerPage={25} onPageChange={setPage} />
      )}

      {!isLoading && (!customers || customers.length === 0) && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('customers.noCustomersTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('customers.noCustomersDesc')}</p>
        </div>
      )}
    </>
  )
}
