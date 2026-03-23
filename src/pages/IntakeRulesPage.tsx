import { useState } from 'react'
import { Shield, Plus, Loader2, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProjects } from '@/hooks/useProjects'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ProjectResponse } from '@/types/api'

interface IntakeRuleResponse {
  id: string
  companyId: string
  projectId: string
  name: string
  conditionType: 'FromEmail' | 'FromDomain' | 'SubjectContains' | 'BodyContains'
  conditionValue: string
  action: 'AutoApprove' | 'AutoDeny' | 'AutoDenyPermanent'
  priority: number
  isEnabled: boolean
  createdOnDateTime: number
}

const conditionLabels: Record<string, string> = {
  FromEmail: 'From Email',
  FromDomain: 'From Domain',
  SubjectContains: 'Subject Contains',
  BodyContains: 'Body Contains',
}

const actionColors: Record<string, string> = {
  AutoApprove: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  AutoDeny: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  AutoDenyPermanent: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300',
}

export function IntakeRulesPage() {
  const { companyId } = useCurrentUser()
  const { data: projects } = useProjects(companyId)
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [conditionType, setConditionType] = useState('FromEmail')
  const [conditionValue, setConditionValue] = useState('')
  const [action, setAction] = useState('AutoApprove')
  const [priority, setPriority] = useState(0)

  const projectId = selectedProjectId || projects?.[0]?.id || ''

  const { data: rules, isLoading } = useQuery({
    queryKey: ['intakeRules', companyId, projectId],
    queryFn: () =>
      api.get<IntakeRuleResponse[]>(`/api/v1/companies/${companyId}/projects/${projectId}/intake-rules`),
    enabled: !!companyId && !!projectId,
  })

  const createRule = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<IntakeRuleResponse>(`/api/v1/companies/${companyId}/projects/${projectId}/intake-rules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intakeRules'] })
      setShowCreate(false)
      setName('')
      setConditionValue('')
    },
  })

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) =>
      api.delete(`/api/v1/companies/${companyId}/projects/${projectId}/intake-rules/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intakeRules'] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createRule.mutate({ name, conditionType, conditionValue, action, priority, isEnabled: true })
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('intakeRules.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('intakeRules.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={showCreate || !projectId}>
          <Plus className="mr-2 h-4 w-4" /> {t('intakeRules.newRule')}
        </Button>
      </div>

      {/* Project selector */}
      {projects && projects.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {projects.map((p: ProjectResponse) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('intakeRules.createRule')}</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('intakeRules.ruleName')}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('intakeRules.ruleNamePlaceholder')} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('intakeRules.condition')}</label>
                <select
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="FromEmail">{conditionLabels.FromEmail}</option>
                  <option value="FromDomain">{conditionLabels.FromDomain}</option>
                  <option value="SubjectContains">{conditionLabels.SubjectContains}</option>
                  <option value="BodyContains">{conditionLabels.BodyContains}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('intakeRules.value')}</label>
                <Input value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} placeholder={t('intakeRules.valuePlaceholder')} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('intakeRules.action')}</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="AutoApprove">{t('intakeRules.autoApprove')}</option>
                  <option value="AutoDeny">{t('intakeRules.autoDeny')}</option>
                  <option value="AutoDenyPermanent">{t('intakeRules.autoDenyPermanent')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('intakeRules.priority')}</label>
                <Input type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createRule.isPending}>
                {createRule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('intakeRules.createRuleBtn')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rules && rules.length > 0 && (
        <div className="rounded-lg border">
          <div className="divide-y">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{rule.name}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[rule.action] ?? ''}`}>
                      {rule.action}
                    </span>
                    {!rule.isEnabled && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {t('common.disabled')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {conditionLabels[rule.conditionType]}: <span className="font-mono">{rule.conditionValue}</span>
                    {rule.priority > 0 && <> &middot; Priority: {rule.priority}</>}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    if (confirm(t('intakeRules.deleteConfirm'))) {
                      deleteRule.mutate(rule.id)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && (!rules || rules.length === 0) && !showCreate && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('intakeRules.noRulesTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('intakeRules.noRulesDesc')}</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)} disabled={!projectId}>
            <Plus className="mr-2 h-4 w-4" /> {t('intakeRules.createFirst')}
          </Button>
        </div>
      )}
    </>
  )
}
