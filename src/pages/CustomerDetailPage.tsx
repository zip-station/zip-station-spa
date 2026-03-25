import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, Save, Plus, Trash2, Ban } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toast } from '@/components/ui/Toast'
import { Pagination } from '@/components/ui/Pagination'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

interface CustomerResponse {
  id: string
  companyId: string
  projectId: string
  email: string
  name: string
  tags: string[]
  notes?: string
  isBanned: boolean
  properties: Record<string, string>
  openTicketCount: number
  closedTicketCount: number
  totalTicketCount: number
  createdOnDateTime: number
  updatedOnDateTime: number
}

interface TicketResponse {
  id: string
  subject: string
  status: string
  priority: string
  createdOnDateTime: number
}

const statusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-100 text-gray-800',
  Merged: 'bg-purple-100 text-purple-800',
  Abandoned: 'bg-slate-100 text-slate-800',
}

export function CustomerDetailPage() {
  const { customerId } = useParams({ strict: false }) as { customerId: string }
  const { companyId } = useCurrentUser()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [isBanned, setIsBanned] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [properties, setProperties] = useState<{ key: string; value: string }[]>([])
  const [saved, setSaved] = useState(false)
  const [page, setPage] = useState(1)

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', companyId, customerId],
    queryFn: () => api.get<CustomerResponse>(`/api/v1/companies/${companyId}/customers/${customerId}`),
    enabled: !!companyId && !!customerId,
  })

  const { data: ticketsData } = useQuery({
    queryKey: ['customerTickets', companyId, customer?.email, page],
    queryFn: () =>
      api.get<{ totalResultCount: number; results: TicketResponse[] }>(
        `/api/v1/companies/${companyId}/tickets?query=${encodeURIComponent(customer!.email)}&page=${page}&resultsPerPage=10`
      ),
    enabled: !!companyId && !!customer?.email,
  })

  useEffect(() => {
    if (customer) {
      setName(customer.name)
      setNotes(customer.notes || '')
      setIsBanned(customer.isBanned)
      setTags(customer.tags)
      setProperties(
        Object.entries(customer.properties || {}).map(([key, value]) => ({ key, value }))
      )
    }
  }, [customer])

  const updateCustomer = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put<CustomerResponse>(`/api/v1/companies/${companyId}/customers/${customerId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', companyId, customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const propsObj: Record<string, string> = {}
    properties.forEach((p) => {
      if (p.key.trim()) propsObj[p.key.trim()] = p.value
    })
    updateCustomer.mutate({
      name,
      notes: notes || undefined,
      isBanned,
      tags,
      properties: propsObj,
      // Keep required fields
      email: customer?.email,
      companyId: customer?.companyId,
      projectId: customer?.projectId,
    })
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))
  const addProperty = () => setProperties([...properties, { key: '', value: '' }])
  const removeProperty = (idx: number) => setProperties(properties.filter((_, i) => i !== idx))
  const updateProperty = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...properties]
    updated[idx] = { ...updated[idx], [field]: val }
    setProperties(updated)
  }

  const formatDate = (ts: number) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!customer) {
    return <p className="py-12 text-center text-muted-foreground">{t('customerDetail.customerNotFound')}</p>
  }

  return (
    <>
      {saved && <Toast message={t('customerDetail.customerUpdated')} type="success" onClose={() => setSaved(false)} />}

      <div className="mb-6">
        <Link to="/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('customerDetail.backToCustomers')}
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{customer.name || customer.email}</h2>
          {customer.isBanned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
              <Ban className="h-3 w-3" /> {t('customerDetail.banned')}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
        <p className="text-xs text-muted-foreground">
          {t('customerDetail.ticketSummary', { open: customer.openTicketCount, total: customer.totalTicketCount })} &middot; {t('customerDetail.since', { date: formatDate(customer.createdOnDateTime) })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        {hasPermission('Customers.Edit') && (
          <div className="lg:col-span-1">
            <form onSubmit={handleSave} className="rounded-lg border bg-card p-4 space-y-4">
              <h3 className="text-sm font-semibold">{t('customerDetail.customerInfo')}</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('customerDetail.name')}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('customerDetail.email')}</label>
                <Input value={customer.email} disabled className="opacity-60" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('customerDetail.notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="banned" checked={isBanned} onChange={(e) => setIsBanned(e.target.checked)} />
                <label htmlFor="banned" className="text-sm font-medium">{t('customerDetail.banned')}</label>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('customerDetail.tags')}</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder={t('customerDetail.addTagPlaceholder')}
                    className="h-8 text-xs"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addTag} className="h-8">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Custom Properties */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('customerDetail.customProperties')}</label>
                  <button type="button" onClick={addProperty} className="text-xs text-primary hover:underline">
                    <Plus className="inline h-3 w-3" /> {t('common.add')}
                  </button>
                </div>
                {properties.map((prop, idx) => (
                  <div key={idx} className="flex gap-1">
                    <Input
                      value={prop.key}
                      onChange={(e) => updateProperty(idx, 'key', e.target.value)}
                      placeholder={t('customerDetail.keyPlaceholder')}
                      className="h-8 text-xs flex-1"
                    />
                    <Input
                      value={prop.value}
                      onChange={(e) => updateProperty(idx, 'value', e.target.value)}
                      placeholder={t('customerDetail.valuePlaceholder')}
                      className="h-8 text-xs flex-1"
                    />
                    <button type="button" onClick={() => removeProperty(idx)} className="text-muted-foreground hover:text-red-600 p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <Button type="submit" size="sm" disabled={updateCustomer.isPending}>
                {updateCustomer.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                {t('common.save')}
              </Button>
            </form>
          </div>
        )}

        {/* Tickets */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">{t('customerDetail.tickets')}</h3>
          {ticketsData?.results && ticketsData.results.length > 0 ? (
            <>
              <div className="rounded-lg border">
                <div className="divide-y">
                  {ticketsData.results.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to="/tickets/$ticketId"
                      params={{ ticketId: ticket.id }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(ticket.createdOnDateTime)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status] ?? ''}`}>
                          {ticket.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <Pagination page={page} totalCount={ticketsData.totalResultCount} resultsPerPage={10} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('customerDetail.noTickets')}</p>
          )}
        </div>
      </div>
    </>
  )
}
