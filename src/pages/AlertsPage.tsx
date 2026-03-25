import { useState } from 'react'
import { Bell, Plus, Loader2, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

type AlertTriggerType =
  | 'NewTicket'
  | 'TicketStatusChange'
  | 'HighSpamScore'
  | 'KeywordInSubject'
  | 'KeywordInBody'
  | 'CustomerContact'

type AlertChannelType = 'Slack' | 'Discord' | 'GenericWebhook'

interface AlertResponse {
  id: string
  companyId: string
  projectId: string
  name: string
  triggerType: AlertTriggerType
  triggerValue?: string
  channelType: AlertChannelType
  webhookUrl: string
  customPayloadTemplate?: string
  isEnabled: boolean
  createdOnDateTime: number
  updatedOnDateTime: number
}

const triggerTypes: AlertTriggerType[] = [
  'NewTicket',
  'TicketStatusChange',
  'HighSpamScore',
  'KeywordInSubject',
  'KeywordInBody',
  'CustomerContact',
]

const channelTypes: AlertChannelType[] = ['Slack', 'Discord', 'GenericWebhook']

const triggerTypesRequiringValue: AlertTriggerType[] = [
  'KeywordInSubject',
  'KeywordInBody',
  'CustomerContact',
]

const channelColors: Record<AlertChannelType, string> = {
  Slack: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Discord: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  GenericWebhook: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

export function AlertsPage() {
  const { companyId } = useCurrentUser()
  const { selectedProjectId: globalSelectedProjectId, projects: allProjects } = useSelectedProject()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState<AlertTriggerType>('NewTicket')
  const [triggerValue, setTriggerValue] = useState('')
  const [channelType, setChannelType] = useState<AlertChannelType>('Slack')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isEnabled, setIsEnabled] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTriggerType, setEditTriggerType] = useState<AlertTriggerType>('NewTicket')
  const [editTriggerValue, setEditTriggerValue] = useState('')
  const [editChannelType, setEditChannelType] = useState<AlertChannelType>('Slack')
  const [editWebhookUrl, setEditWebhookUrl] = useState('')
  const [editIsEnabled, setEditIsEnabled] = useState(true)

  const projectId = globalSelectedProjectId || allProjects?.[0]?.id || ''

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', companyId, projectId],
    queryFn: () =>
      api.get<AlertResponse[]>(`/api/v1/companies/${companyId}/projects/${projectId}/alerts`),
    enabled: !!companyId && !!projectId,
  })

  const createAlert = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<AlertResponse>(`/api/v1/companies/${companyId}/projects/${projectId}/alerts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      setShowCreate(false)
      setName('')
      setTriggerType('NewTicket')
      setTriggerValue('')
      setChannelType('Slack')
      setWebhookUrl('')
      setIsEnabled(true)
    },
  })

  const updateAlert = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<AlertResponse>(`/api/v1/companies/${companyId}/projects/${projectId}/alerts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      setEditingId(null)
    },
  })

  const deleteAlert = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/companies/${companyId}/projects/${projectId}/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createAlert.mutate({
      name,
      triggerType,
      triggerValue: triggerTypesRequiringValue.includes(triggerType) ? triggerValue : undefined,
      channelType,
      webhookUrl,
      isEnabled,
    })
  }

  const startEdit = (a: AlertResponse) => {
    setEditingId(a.id)
    setEditName(a.name)
    setEditTriggerType(a.triggerType)
    setEditTriggerValue(a.triggerValue || '')
    setEditChannelType(a.channelType)
    setEditWebhookUrl(a.webhookUrl)
    setEditIsEnabled(a.isEnabled)
  }

  const saveEdit = (id: string) => {
    updateAlert.mutate({
      id,
      data: {
        name: editName,
        triggerType: editTriggerType,
        triggerValue: triggerTypesRequiringValue.includes(editTriggerType) ? editTriggerValue : undefined,
        channelType: editChannelType,
        webhookUrl: editWebhookUrl,
        isEnabled: editIsEnabled,
      },
    })
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('alerts.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('alerts.subtitle')}</p>
        </div>
        {hasPermission('Alerts.Create') && (
          <Button onClick={() => setShowCreate(true)} disabled={showCreate || editingId !== null || !projectId}>
            <Plus className="mr-2 h-4 w-4" /> {t('alerts.newAlert')}
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('alerts.createAlert')}</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('alerts.alertName')}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('alerts.namePlaceholder')} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('alerts.triggerType')}</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as AlertTriggerType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {triggerTypes.map((tt) => (
                    <option key={tt} value={tt}>{t(`alerts.triggerTypes.${tt}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            {triggerTypesRequiringValue.includes(triggerType) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('alerts.triggerValue')}</label>
                <Input
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder={t('alerts.triggerValuePlaceholder')}
                  required
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('alerts.channelType')}</label>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value as AlertChannelType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {channelTypes.map((ct) => (
                    <option key={ct} value={ct}>{t(`alerts.channelTypes.${ct}`)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('alerts.webhookUrl')}</label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder={t('alerts.webhookUrlPlaceholder')}
                  type="url"
                  required
                />
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
              <label htmlFor="create-enabled" className="text-sm font-medium">{t('alerts.enabled')}</label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createAlert.isPending}>
                {createAlert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('alerts.createBtn')}
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

      {!showCreate && !isLoading && alerts && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.filter((a) => editingId === null || editingId === a.id).map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-4">
              {editingId === a.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t('alerts.alertName')} />
                    <select
                      value={editTriggerType}
                      onChange={(e) => setEditTriggerType(e.target.value as AlertTriggerType)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {triggerTypes.map((tt) => (
                        <option key={tt} value={tt}>{t(`alerts.triggerTypes.${tt}`)}</option>
                      ))}
                    </select>
                  </div>
                  {triggerTypesRequiringValue.includes(editTriggerType) && (
                    <Input
                      value={editTriggerValue}
                      onChange={(e) => setEditTriggerValue(e.target.value)}
                      placeholder={t('alerts.triggerValue')}
                    />
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={editChannelType}
                      onChange={(e) => setEditChannelType(e.target.value as AlertChannelType)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {channelTypes.map((ct) => (
                        <option key={ct} value={ct}>{t(`alerts.channelTypes.${ct}`)}</option>
                      ))}
                    </select>
                    <Input value={editWebhookUrl} onChange={(e) => setEditWebhookUrl(e.target.value)} placeholder={t('alerts.webhookUrl')} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`edit-enabled-${a.id}`}
                      checked={editIsEnabled}
                      onChange={(e) => setEditIsEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <label htmlFor={`edit-enabled-${a.id}`} className="text-sm font-medium">{t('alerts.enabled')}</label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(a.id)} disabled={updateAlert.isPending}>
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
                      <h4 className="font-medium">{a.name}</h4>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${channelColors[a.channelType]}`}>
                        {t(`alerts.channelTypes.${a.channelType}`)}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${a.isEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {a.isEnabled ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(`alerts.triggerTypes.${a.triggerType}`)}
                      {a.triggerValue && <span className="ml-1 font-mono text-xs">({a.triggerValue})</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.webhookUrl}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {hasPermission('Alerts.Edit') && (
                      <Button size="sm" variant="outline" onClick={() => startEdit(a)}>
                        {t('common.edit')}
                      </Button>
                    )}
                    {hasPermission('Alerts.Delete') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => {
                          if (confirm(t('alerts.deleteConfirm'))) {
                            deleteAlert.mutate(a.id)
                          }
                        }}
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

      {!isLoading && (!alerts || alerts.length === 0) && !showCreate && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('alerts.noAlertsTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('alerts.noAlertsDesc')}</p>
          {hasPermission('Alerts.Create') && (
            <Button className="mt-4" onClick={() => setShowCreate(true)} disabled={!projectId}>
              <Plus className="mr-2 h-4 w-4" /> {t('alerts.createFirst')}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
