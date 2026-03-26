import { useState } from 'react'
import { FileText, Plus, Loader2, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

type ReportFrequency = 'Daily' | 'Weekly' | 'Monthly'

interface ReportResponse {
  id: string
  companyId: string
  projectId?: string
  name: string
  frequency: ReportFrequency
  recipientEmails: string[]
  includeTicketSummary: boolean
  includeResponseTimes: boolean
  includeAgentPerformance: boolean
  includeCustomerActivity: boolean
  isEnabled: boolean
  lastSentOn: number
  createdByUserId?: string
  createdOnDateTime: number
  updatedOnDateTime: number
}

const frequencies: ReportFrequency[] = ['Daily', 'Weekly', 'Monthly']

const frequencyColors: Record<ReportFrequency, string> = {
  Daily: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Weekly: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Monthly: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

export function ReportsPage() {
  const { companyId } = useCurrentUser()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<ReportFrequency>('Weekly')
  const [recipientEmails, setRecipientEmails] = useState('')
  const [includeTicketSummary, setIncludeTicketSummary] = useState(true)
  const [includeResponseTimes, setIncludeResponseTimes] = useState(true)
  const [includeAgentPerformance, setIncludeAgentPerformance] = useState(true)
  const [includeCustomerActivity, setIncludeCustomerActivity] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editFrequency, setEditFrequency] = useState<ReportFrequency>('Weekly')
  const [editRecipientEmails, setEditRecipientEmails] = useState('')
  const [editIncludeTicketSummary, setEditIncludeTicketSummary] = useState(true)
  const [editIncludeResponseTimes, setEditIncludeResponseTimes] = useState(true)
  const [editIncludeAgentPerformance, setEditIncludeAgentPerformance] = useState(true)
  const [editIncludeCustomerActivity, setEditIncludeCustomerActivity] = useState(false)
  const [editIsEnabled, setEditIsEnabled] = useState(true)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', companyId],
    queryFn: () =>
      api.get<ReportResponse[]>(`/api/v1/companies/${companyId}/reports`),
    enabled: !!companyId,
  })

  const createReport = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<ReportResponse>(`/api/v1/companies/${companyId}/reports`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setShowCreate(false)
      setName('')
      setFrequency('Weekly')
      setRecipientEmails('')
      setIncludeTicketSummary(true)
      setIncludeResponseTimes(true)
      setIncludeAgentPerformance(true)
      setIncludeCustomerActivity(false)
      setIsEnabled(true)
    },
  })

  const updateReport = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<ReportResponse>(`/api/v1/companies/${companyId}/reports/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setEditingId(null)
    },
  })

  const deleteReport = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/companies/${companyId}/reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setDeleteId(null)
    },
  })

  const parseEmails = (value: string): string[] =>
    value.split(',').map((e) => e.trim()).filter(Boolean)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createReport.mutate({
      name,
      frequency,
      recipientEmails: parseEmails(recipientEmails),
      includeTicketSummary,
      includeResponseTimes,
      includeAgentPerformance,
      includeCustomerActivity,
      isEnabled,
    })
  }

  const startEdit = (r: ReportResponse) => {
    setEditingId(r.id)
    setEditName(r.name)
    setEditFrequency(r.frequency)
    setEditRecipientEmails(r.recipientEmails.join(', '))
    setEditIncludeTicketSummary(r.includeTicketSummary)
    setEditIncludeResponseTimes(r.includeResponseTimes)
    setEditIncludeAgentPerformance(r.includeAgentPerformance)
    setEditIncludeCustomerActivity(r.includeCustomerActivity)
    setEditIsEnabled(r.isEnabled)
  }

  const saveEdit = (id: string) => {
    updateReport.mutate({
      id,
      data: {
        name: editName,
        frequency: editFrequency,
        recipientEmails: parseEmails(editRecipientEmails),
        includeTicketSummary: editIncludeTicketSummary,
        includeResponseTimes: editIncludeResponseTimes,
        includeAgentPerformance: editIncludeAgentPerformance,
        includeCustomerActivity: editIncludeCustomerActivity,
        isEnabled: editIsEnabled,
      },
    })
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('reports.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
        {hasPermission('Reports.Create') && (
          <Button onClick={() => setShowCreate(true)} disabled={showCreate || editingId !== null}>
            <Plus className="mr-2 h-4 w-4" /> {t('reports.newReport')}
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('reports.createReport')}</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('reports.reportName')}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('reports.namePlaceholder')} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('reports.frequency')}</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as ReportFrequency)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {frequencies.map((f) => (
                    <option key={f} value={f}>{t(`reports.frequencies.${f}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('reports.recipientEmails')}</label>
              <Input
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                placeholder={t('reports.recipientEmailsPlaceholder')}
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">{t('reports.includeSections')}</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-ticket-summary"
                    checked={includeTicketSummary}
                    onChange={(e) => setIncludeTicketSummary(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="create-ticket-summary" className="text-sm">{t('reports.ticketSummary')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-response-times"
                    checked={includeResponseTimes}
                    onChange={(e) => setIncludeResponseTimes(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="create-response-times" className="text-sm">{t('reports.responseTimes')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-agent-performance"
                    checked={includeAgentPerformance}
                    onChange={(e) => setIncludeAgentPerformance(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="create-agent-performance" className="text-sm">{t('reports.agentPerformance')}</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-customer-activity"
                    checked={includeCustomerActivity}
                    onChange={(e) => setIncludeCustomerActivity(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="create-customer-activity" className="text-sm">{t('reports.customerActivity')}</label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-enabled"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="create-enabled" className="text-sm font-medium">{t('reports.enabled')}</label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createReport.isPending}>
                {createReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('reports.createBtn')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {!showCreate && isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!showCreate && !isLoading && reports && reports.length > 0 && (
        <div className="space-y-3">
          {reports.filter((r) => editingId === null || editingId === r.id).map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-4">
              {editingId === r.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t('reports.reportName')} />
                    <select
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value as ReportFrequency)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {frequencies.map((f) => (
                        <option key={f} value={f}>{t(`reports.frequencies.${f}`)}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    value={editRecipientEmails}
                    onChange={(e) => setEditRecipientEmails(e.target.value)}
                    placeholder={t('reports.recipientEmails')}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edit-ticket-summary-${r.id}`}
                        checked={editIncludeTicketSummary}
                        onChange={(e) => setEditIncludeTicketSummary(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <label htmlFor={`edit-ticket-summary-${r.id}`} className="text-sm">{t('reports.ticketSummary')}</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edit-response-times-${r.id}`}
                        checked={editIncludeResponseTimes}
                        onChange={(e) => setEditIncludeResponseTimes(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <label htmlFor={`edit-response-times-${r.id}`} className="text-sm">{t('reports.responseTimes')}</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edit-agent-performance-${r.id}`}
                        checked={editIncludeAgentPerformance}
                        onChange={(e) => setEditIncludeAgentPerformance(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <label htmlFor={`edit-agent-performance-${r.id}`} className="text-sm">{t('reports.agentPerformance')}</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edit-customer-activity-${r.id}`}
                        checked={editIncludeCustomerActivity}
                        onChange={(e) => setEditIncludeCustomerActivity(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <label htmlFor={`edit-customer-activity-${r.id}`} className="text-sm">{t('reports.customerActivity')}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`edit-enabled-${r.id}`}
                      checked={editIsEnabled}
                      onChange={(e) => setEditIsEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <label htmlFor={`edit-enabled-${r.id}`} className="text-sm font-medium">{t('reports.enabled')}</label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(r.id)} disabled={updateReport.isPending}>
                      {t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{r.name}</h4>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${frequencyColors[r.frequency]}`}>
                        {t(`reports.frequencies.${r.frequency}`)}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${r.isEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {r.isEnabled ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.recipientEmails.join(', ')}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {hasPermission('Reports.Edit') && (
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                        {t('common.edit')}
                      </Button>
                    )}
                    {hasPermission('Reports.Delete') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!reports || reports.length === 0) && !showCreate && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('reports.noReportsTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('reports.noReportsDesc')}</p>
          {hasPermission('Reports.Create') && (
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t('reports.createFirst')}
            </Button>
          )}
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          title={t('reports.deleteTitle')}
          message={t('reports.deleteConfirm')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => deleteReport.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
