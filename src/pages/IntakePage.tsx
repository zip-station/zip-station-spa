import { useState, useEffect, useCallback } from 'react'
import { Mail, Loader2, Check, X, AlertTriangle, Shield, Plus, Trash2, RefreshCw, Pencil, Download, CheckSquare, Square, Play } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProjects } from '@/hooks/useProjects'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ProjectResponse } from '@/types/api'

interface IntakeEmailResponse {
  id: string
  companyId: string
  projectId: string
  fromEmail: string
  fromName: string
  subject: string
  bodyText: string
  bodyHtml?: string
  receivedOn: number
  status: 'Pending' | 'Approved' | 'Denied'
  spamScore: number
  deniedPermanently: boolean
  ticketId?: string
  createdOnDateTime: number
}

interface IntakeRuleCondition {
  type: 'FromEmail' | 'FromDomain' | 'SubjectContains' | 'BodyContains'
  value: string
}

interface IntakeRuleResponse {
  id: string
  companyId: string
  projectId: string
  name: string
  conditions: IntakeRuleCondition[]
  action: 'AutoApprove' | 'AutoDeny'
  priority: number
  isEnabled: boolean
  createdOnDateTime: number
}

type StatusFilter = 'all' | 'Pending' | 'Approved' | 'Denied'

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const conditionLabelKeys: Record<string, string> = {
  FromEmail: 'intakeRules.conditionFromEmail',
  FromDomain: 'intakeRules.conditionFromDomain',
  SubjectContains: 'intakeRules.conditionSubjectContains',
  BodyContains: 'intakeRules.conditionBodyContains',
}

const actionColors: Record<string, string> = {
  AutoApprove: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  AutoDeny: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function IntakePage() {
  const { companyId } = useCurrentUser()
  const { data: projects } = useProjects(companyId)
  const { selectedProjectId: globalSelectedProjectId } = useSelectedProject()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Tab state
  const [activeTab, setActiveTab] = useState<'emails' | 'rules'>('emails')

  // Intake emails state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pending')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Rules state
  const [showCreateRule, setShowCreateRule] = useState(false)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)
  const [runRuleResult, setRunRuleResult] = useState<{ matched: number; total: number } | null>(null)
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null)
  const [runRuleError, setRunRuleError] = useState<string | null>(null)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleName, setRuleName] = useState('')
  const [ruleConditions, setRuleConditions] = useState<{ type: string; value: string }[]>([{ type: 'FromEmail', value: '' }])
  const [ruleAction, setRuleAction] = useState('AutoApprove')
  const [rulePriority, setRulePriority] = useState(0)

  const projectId = globalSelectedProjectId || projects?.[0]?.id || ''

  useEffect(() => { setPage(1) }, [statusFilter])

  // Intake emails query
  const { data, isLoading } = useQuery({
    queryKey: ['intake', companyId, statusFilter, globalSelectedProjectId, page],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}&page=${page}&resultsPerPage=25` : `?page=${page}&resultsPerPage=25`
      const projectParam = globalSelectedProjectId ? `&projectId=${globalSelectedProjectId}` : ''
      return api.get<{ totalResultCount: number; results: IntakeEmailResponse[] }>(`/api/v1/companies/${companyId}/intake${params}${projectParam}`)
    },
    enabled: !!companyId,
  })

  const intakeEmails = data?.results
  const totalCount = data?.totalResultCount ?? 0

  // Rules query
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['intakeRules', companyId, projectId],
    queryFn: () =>
      api.get<IntakeRuleResponse[]>(`/api/v1/companies/${companyId}/projects/${projectId}/intake-rules`),
    enabled: !!companyId && !!projectId,
  })

  // Intake mutations
  const approveIntake = useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/v1/companies/${companyId}/intake/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] })
    },
  })

  const denyIntake = useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
      api.post(`/api/v1/companies/${companyId}/intake/${id}/deny?permanent=${permanent}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intake'] })
      if (variables.permanent) {
        queryClient.invalidateQueries({ queryKey: ['intakeRules'] })
      }
    },
  })

  // Rule mutations
  const createRule = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<IntakeRuleResponse>(`/api/v1/companies/${companyId}/projects/${projectId}/intake-rules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intakeRules'] })
      setShowCreateRule(false)
      setRuleName('')
      setRuleConditions([{ type: 'FromEmail', value: '' }])
      setRuleError(null)
    },
    onError: (err: Error) => {
      setRuleError(err.message)
    },
  })

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) =>
      api.delete(`/api/v1/companies/${companyId}/projects/${projectId}/intake-rules/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intakeRules'] })
      setDeleteRuleId(null)
    },
  })

  const runRule = useMutation({
    mutationFn: (ruleId: string) => {
      setRunningRuleId(ruleId)
      return api.post<{ matched: number; total: number }>(`/api/v1/companies/${companyId}/projects/${projectId}/intake-rules/${ruleId}/run`)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['intake'] })
      queryClient.invalidateQueries({ queryKey: ['intakePendingCount'] })
      setRunRuleResult(data)
      setRunningRuleId(null)
    },
    onError: (err: Error) => {
      setRunRuleError(err.message || 'Failed to run rule')
      setRunningRuleId(null)
    },
  })

  const updateRule = useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: Record<string, unknown> }) =>
      api.put<IntakeRuleResponse>(`/api/v1/companies/${companyId}/projects/${projectId}/intake-rules/${ruleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intakeRules'] })
      setEditingRuleId(null)
      setRuleName('')
      setRuleConditions([{ type: 'FromEmail', value: '' }])
      setRuleAction('AutoApprove')
      setRulePriority(0)
      setRuleError(null)
    },
    onError: (err: Error) => {
      setRuleError(err.message)
    },
  })

  const getProjectName = (pid: string) =>
    projects?.find((p: ProjectResponse) => p.id === pid)?.name ?? pid

  const formatDate = (ts: number) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  // Poll status & trigger
  const { data: pollStatus } = useQuery({
    queryKey: ['pollStatus'],
    queryFn: () => api.get<{ pending: boolean; lastPollTime: number; pollIntervalSeconds: number }>('/api/v1/system/poll-status'),
    refetchInterval: 5000,
    enabled: !!companyId,
  })

  const [waitingForPoll, setWaitingForPoll] = useState(false)
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [selectedIntakeIds, setSelectedIntakeIds] = useState<Set<string>>(new Set())
  const [lastKnownPollTime, setLastKnownPollTime] = useState(0)

  const triggerPoll = useMutation({
    mutationFn: () => api.post('/api/v1/system/trigger-poll'),
    onSuccess: () => {
      setWaitingForPoll(true)
      queryClient.invalidateQueries({ queryKey: ['pollStatus'] })
    },
  })

  // When poll completes (lastPollTime changes), refetch intake data
  useEffect(() => {
    if (!pollStatus?.lastPollTime) return
    if (lastKnownPollTime > 0 && pollStatus.lastPollTime > lastKnownPollTime) {
      // Poll just completed — refetch intake
      queryClient.invalidateQueries({ queryKey: ['intake'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setWaitingForPoll(false)
    }
    setLastKnownPollTime(pollStatus.lastPollTime)
  }, [pollStatus?.lastPollTime, lastKnownPollTime, queryClient])

  // Countdown timer
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!pollStatus?.lastPollTime) return
    const interval = setInterval(() => {
      const elapsed = Date.now() - pollStatus.lastPollTime
      const remaining = Math.max(0, (pollStatus.pollIntervalSeconds * 1000) - elapsed)
      if (remaining <= 0 || waitingForPoll) {
        setCountdown('Checking...')
      } else {
        const mins = Math.floor(remaining / 60000)
        const secs = Math.floor((remaining % 60000) / 1000)
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [pollStatus?.lastPollTime, pollStatus?.pollIntervalSeconds, waitingForPoll])

  const handleCheckNow = useCallback(() => {
    triggerPoll.mutate()
  }, [triggerPoll])

  const importHistory = useMutation({
    mutationFn: () => api.post('/api/v1/system/import-history'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake'] })
    },
  })

  // Bulk actions
  const bulkIntakeAction = useMutation({
    mutationFn: (data: { intakeIds: string[]; action: string }) =>
      api.post(`/api/v1/companies/${companyId}/intake/bulk`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] })
      queryClient.invalidateQueries({ queryKey: ['intakePendingCount'] })
      setSelectedIntakeIds(new Set())
    },
  })

  const toggleIntakeSelection = (id: string) => {
    setSelectedIntakeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAllIntake = () => {
    if (!intakeEmails) return
    if (selectedIntakeIds.size === intakeEmails.length) {
      setSelectedIntakeIds(new Set())
    } else {
      setSelectedIntakeIds(new Set(intakeEmails.map(e => e.id)))
    }
  }

  const handleImportHistory = useCallback(() => {
    importHistory.mutate()
  }, [importHistory])

  const startEdit = (rule: IntakeRuleResponse) => {
    setEditingRuleId(rule.id)
    setRuleName(rule.name)
    setRuleConditions(rule.conditions.map(c => ({ type: c.type, value: c.value })))
    setRuleAction(rule.action)
    setRulePriority(rule.priority)
    setShowCreateRule(false)
  }

  const cancelEdit = () => {
    setEditingRuleId(null)
    setShowCreateRule(false)
    setRuleName('')
    setRuleConditions([{ type: 'FromEmail', value: '' }])
    setRuleAction('AutoApprove')
    setRulePriority(0)
  }

  const [ruleError, setRuleError] = useState<string | null>(null)

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault()
    setRuleError(null)
    const conditions = ruleConditions.filter(c => c.value.trim()).map(c => ({ type: c.type, value: c.value }))
    if (conditions.length === 0) {
      setRuleError(t('intakeRules.errorNoConditions'))
      return
    }

    // Validate email format for FromEmail conditions
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const c of conditions) {
      if (c.type === 'FromEmail' && !emailRegex.test(c.value)) {
        setRuleError(t('intakeRules.errorInvalidEmail'))
        return
      }
    }
    if (editingRuleId) {
      updateRule.mutate({ ruleId: editingRuleId, data: { name: ruleName, conditions, action: ruleAction, priority: rulePriority, isEnabled: true } })
    } else {
      createRule.mutate({ name: ruleName, conditions, action: ruleAction, priority: rulePriority, isEnabled: true })
    }
  }

  const addCondition = () => setRuleConditions([...ruleConditions, { type: 'FromEmail', value: '' }])
  const removeCondition = (index: number) => setRuleConditions(ruleConditions.filter((_, i) => i !== index))
  const updateCondition = (index: number, field: 'type' | 'value', val: string) => {
    const updated = [...ruleConditions]
    updated[index] = { ...updated[index], [field]: val }
    setRuleConditions(updated)
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('intake.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('intake.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {countdown && (
            <span className="text-xs text-muted-foreground">
              {pollStatus?.pending ? t('intake.checking') : t('intake.nextCheck', { countdown })}
            </span>
          )}
          {hasPermission('Intake.ImportHistory') && (
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImportOptions(!showImportOptions)}
              disabled={importHistory.isPending}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {importHistory.isPending ? 'Importing...' : 'Import History'}
            </Button>
            {showImportOptions && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border bg-card shadow-lg p-2">
                <p className="text-xs text-muted-foreground mb-2 px-2">Import previously read emails from your inbox. This may take a while for large mailboxes.</p>
                {[3, 5, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => { handleImportHistory(); setShowImportOptions(false) }}
                    className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    Past {days} days
                  </button>
                ))}
                <button
                  onClick={() => { handleImportHistory(); setShowImportOptions(false) }}
                  className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent text-muted-foreground"
                >
                  All emails
                </button>
              </div>
            )}
          </div>
          )}
          {hasPermission('Intake.CheckNow') && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckNow}
            disabled={triggerPoll.isPending || waitingForPoll}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${waitingForPoll ? 'animate-spin' : ''}`} />
            {waitingForPoll ? t('intake.checking') : t('intake.checkNow')}
          </Button>
          )}
        </div>
      </div>

      {/* Tabs: Emails | Rules */}
      <div className="mb-4 flex gap-1 rounded-lg border bg-muted p-1 w-fit">
        <button
          onClick={() => setActiveTab('emails')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'emails'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-3.5 w-3.5" /> {t('intake.tabEmails')}
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'rules'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="h-3.5 w-3.5" /> {t('intake.tabRules')}
          {rules && rules.length > 0 && (
            <span className="rounded-full bg-muted-foreground/20 px-1.5 text-xs">{rules.length}</span>
          )}
        </button>
      </div>

      {/* Delete confirmation modal */}
      {deleteRuleId && (
        <ConfirmModal
          title={t('common.delete')}
          message={t('intakeRules.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => deleteRule.mutate(deleteRuleId)}
          onCancel={() => setDeleteRuleId(null)}
        />
      )}

      {/* Run rule result modal */}
      {runRuleResult && (
        <ConfirmModal
          title={runRuleResult.matched > 0 ? 'Rule Applied' : 'No Matches'}
          message={runRuleResult.matched > 0
            ? `${runRuleResult.matched} of ${runRuleResult.total} pending items matched and were processed.`
            : `No matches found out of ${runRuleResult.total} pending items.`}
          confirmLabel="OK"
          onConfirm={() => setRunRuleResult(null)}
          onCancel={() => setRunRuleResult(null)}
        />
      )}

      {/* Run rule error modal */}
      {runRuleError && (
        <ConfirmModal
          title="Error"
          message={`Failed to run rule: ${runRuleError}`}
          confirmLabel="OK"
          onConfirm={() => setRunRuleError(null)}
          onCancel={() => setRunRuleError(null)}
        />
      )}

      {/* === RULES TAB === */}
      {activeTab === 'rules' && (
        <div>
          <div className="mb-4 flex justify-end">
            {hasPermission('IntakeRules.Create') && (
              <Button size="sm" onClick={() => setShowCreateRule(!showCreateRule)} disabled={showCreateRule || !!editingRuleId || !projectId}>
                <Plus className="mr-1 h-3 w-3" /> {t('intakeRules.newRule')}
              </Button>
            )}
          </div>

          {/* Create/Edit rule form */}
          {(showCreateRule || editingRuleId) && (
            <form onSubmit={handleCreateRule} className="mb-4 space-y-3 rounded-md border bg-muted/50 p-3">
              {ruleError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {ruleError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('intakeRules.ruleName')}</label>
                <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder={t('intakeRules.ruleNamePlaceholder')} required />
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('intakeRules.conditions')} <span className="text-muted-foreground font-normal">({t('intakeRules.conditionsAllMustMatch')})</span></label>
                  <button type="button" onClick={addCondition} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus className="h-3 w-3" /> {t('intakeRules.addCondition')}
                  </button>
                </div>
                {ruleConditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={cond.type}
                      onChange={(e) => updateCondition(idx, 'type', e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                      <option value="FromEmail">{t('intakeRules.conditionFromEmail')}</option>
                      <option value="FromDomain">{t('intakeRules.conditionFromDomain')}</option>
                      <option value="SubjectContains">{t('intakeRules.conditionSubjectContains')}</option>
                      <option value="BodyContains">{t('intakeRules.conditionBodyContains')}</option>
                    </select>
                    <Input
                      value={cond.value}
                      onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                      placeholder={t('intakeRules.valuePlaceholder')}
                      className="h-9 flex-1"
                    />
                    {ruleConditions.length > 1 && (
                      <button type="button" onClick={() => removeCondition(idx)} className="text-muted-foreground hover:text-red-600 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('intakeRules.action')}</label>
                  <select
                    value={ruleAction}
                    onChange={(e) => setRuleAction(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="AutoApprove">{t('intakeRules.autoApprove')}</option>
                    <option value="AutoDeny">{t('intakeRules.autoDeny')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('intakeRules.priority')}</label>
                  <Input type="number" value={rulePriority} onChange={(e) => setRulePriority(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={editingRuleId ? updateRule.isPending : createRule.isPending}>
                  {(editingRuleId ? updateRule.isPending : createRule.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRuleId ? t('common.save') : t('intakeRules.createRuleBtn')}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          )}

          {/* Rules list — hidden during create/edit */}
          {!showCreateRule && !editingRuleId && rulesLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {!showCreateRule && !editingRuleId && !rulesLoading && rules && rules.length > 0 && (
            <div className="divide-y rounded-md border">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rule.name}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[rule.action] ?? ''}`}>
                        {rule.action}
                      </span>
                      {!rule.isEnabled && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {t('common.disabled')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rule.conditions.map((c, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-1 text-muted-foreground/50">{t('intakeRules.and')}</span>}
                          {t(conditionLabelKeys[c.type])}: <span className="font-mono">{c.value}</span>
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      title="Run against pending items"
                      onClick={() => runRule.mutate(rule.id)}
                      disabled={runningRuleId !== null}
                    >
                      {runningRuleId === rule.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    {hasPermission('IntakeRules.Edit') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => startEdit(rule)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {hasPermission('IntakeRules.Delete') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 h-7 w-7 p-0"
                        onClick={() => setDeleteRuleId(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!showCreateRule && !editingRuleId && !rulesLoading && (!rules || rules.length === 0) && (
            <p className="text-sm text-muted-foreground">{t('intakeRules.noRulesDesc')}</p>
          )}
        </div>
      )}

      {/* === EMAILS TAB === */}
      {activeTab === 'emails' && <>
      {/* Status filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border bg-muted p-1">
        {(['Pending', 'Approved', 'Denied', 'all'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`intake.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIntakeIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selectedIntakeIds.size} selected</span>
          {hasPermission('Intake.Approve') && (
            <Button size="sm" onClick={() => bulkIntakeAction.mutate({ intakeIds: Array.from(selectedIntakeIds), action: 'approve' })} disabled={bulkIntakeAction.isPending}>
              <Check className="mr-1 h-3 w-3" /> Approve All
            </Button>
          )}
          {hasPermission('Intake.Deny') && (
            <Button size="sm" variant="outline" onClick={() => bulkIntakeAction.mutate({ intakeIds: Array.from(selectedIntakeIds), action: 'deny' })} disabled={bulkIntakeAction.isPending}>
              <X className="mr-1 h-3 w-3" /> Deny All
            </Button>
          )}
          {hasPermission('Intake.Deny') && (
            <Button size="sm" variant="outline" className="text-red-600" onClick={() => bulkIntakeAction.mutate({ intakeIds: Array.from(selectedIntakeIds), action: 'delete' })} disabled={bulkIntakeAction.isPending}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete All
            </Button>
          )}
          <button onClick={() => setSelectedIntakeIds(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {!isLoading && intakeEmails && intakeEmails.length > 0 && (
        <div className="rounded-lg border">
          {/* Select all header */}
          <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/30">
            <button onClick={toggleSelectAllIntake} className="text-muted-foreground hover:text-foreground">
              {selectedIntakeIds.size === intakeEmails.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </button>
            <span className="text-xs text-muted-foreground">{selectedIntakeIds.size > 0 ? `${selectedIntakeIds.size} selected` : 'Select all'}</span>
          </div>
          <div className="divide-y">
            {intakeEmails.map((email) => (
              <div key={email.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button onClick={(e) => { e.stopPropagation(); toggleIntakeSelection(email.id) }} className="text-muted-foreground hover:text-foreground shrink-0">
                      {selectedIntakeIds.has(email.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{email.subject}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[email.status] ?? ''}`}>
                        {email.status}
                      </span>
                      {email.spamScore > 50 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          <AlertTriangle className="h-3 w-3" /> {t('intake.spam')} {email.spamScore}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{email.fromName} &lt;{email.fromEmail}&gt;</span>
                      <span>{getProjectName(email.projectId)}</span>
                      <span>{formatDate(email.receivedOn || email.createdOnDateTime)}</span>
                    </div>
                  </div>
                  {email.status === 'Pending' && (
                    <div className="flex items-center gap-2">
                      {hasPermission('Intake.Approve') && (
                        <Button
                          size="sm"
                          onClick={() => approveIntake.mutate(email.id)}
                          disabled={approveIntake.isPending}
                        >
                          <Check className="mr-1 h-3 w-3" /> {t('intake.approve')}
                        </Button>
                      )}
                      {hasPermission('Intake.Deny') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => denyIntake.mutate({ id: email.id, permanent: false })}
                            disabled={denyIntake.isPending}
                          >
                            <X className="mr-1 h-3 w-3" /> {t('intake.deny')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => denyIntake.mutate({ id: email.id, permanent: true })}
                            disabled={denyIntake.isPending}
                          >
                            {t('intake.denyPermanent')}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                </div>

                {/* Expanded body */}
                {expandedId === email.id && (
                  <div className="mt-3 rounded-md border bg-muted/50 p-3">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {email.bodyHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
                      ) : (
                        <pre className="whitespace-pre-wrap text-sm">{email.bodyText}</pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && intakeEmails && intakeEmails.length > 0 && (
        <Pagination page={page} totalCount={totalCount} resultsPerPage={25} onPageChange={setPage} />
      )}

      {!isLoading && (!intakeEmails || intakeEmails.length === 0) && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('intake.noEmailsTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('intake.noEmailsDesc')}</p>
        </div>
      )}
      </>}
    </>
  )
}
