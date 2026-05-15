import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Sparkles, Loader2, Save, KeyRound, Plus, Trash2, Edit2, X, Check, AlertTriangle, MessageSquareText, FlaskConical, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Toast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ToneAnalyzerModal } from './ToneAnalyzerModal'
import { api } from '@/lib/api'
import type {
  MaxSettings,
  MaxInstructionResponse,
  MaxExampleReplyResponse,
  MaxInstructionRequest,
  MaxExampleReplyRequest,
} from '@/types/api'
import {
  useMaxInstructions,
  useCreateMaxInstruction,
  useUpdateMaxInstruction,
  useDeleteMaxInstruction,
  useMaxExampleReplies,
  useCreateMaxExampleReply,
  useUpdateMaxExampleReply,
  useDeleteMaxExampleReply,
  useSetMaxApiKey,
  useTestMaxConnection,
  useResetMax,
} from '@/hooks/useMax'

const ALL_CONTEXTS: { id: string; label: string; description: string }[] = [
  { id: 'enrichment', label: 'Enrichment', description: 'Triage, categorize, summarize incoming tickets' },
  { id: 'reply', label: 'Reply drafting', description: 'Drafting responses to customers' },
  { id: 'chat', label: 'Chat', description: 'Conversations with you about Max itself' },
  { id: 'code', label: 'Code', description: 'PR drafting and code suggestions' },
  { id: 'all', label: 'All', description: 'Applies to every Max prompt' },
]

const ALL_AUTO_SEND_CATEGORIES = [
  'how_to', 'bug', 'feature_request', 'billing', 'account', 'feedback', 'spam', 'unsure',
]

interface MaxSettingsTabProps {
  companyId: string
  projectId: string
  maxSettings?: MaxSettings
  canEdit: boolean
}

export function MaxSettingsTab({ companyId, projectId, maxSettings, canEdit }: MaxSettingsTabProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const initial: MaxSettings = maxSettings ?? {
    enabled: false,
    apiKeySet: false,
    model: 'claude-sonnet-4-6',
    projectContext: '',
    toneGuide: '',
    toneAvoid: '',
    autoSendEnabled: false,
    autoSendThreshold: 0.95,
    autoSendCategories: ['billing'],
  }

  // Local editable copies
  const [enabled, setEnabled] = useState(initial.enabled)
  const [model, setModel] = useState(initial.model)
  const [projectContext, setProjectContext] = useState(initial.projectContext ?? '')
  const [toneGuide, setToneGuide] = useState(initial.toneGuide ?? '')
  const [toneAvoid, setToneAvoid] = useState(initial.toneAvoid ?? '')
  const [autoSendEnabled, setAutoSendEnabled] = useState(initial.autoSendEnabled ?? false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [autoSendThreshold, setAutoSendThreshold] = useState(initial.autoSendThreshold)
  const [autoSendCategories, setAutoSendCategories] = useState<string[]>(initial.autoSendCategories ?? [])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const apiKeySet = maxSettings?.apiKeySet ?? false

  useEffect(() => {
    if (maxSettings) {
      setEnabled(maxSettings.enabled)
      setModel(maxSettings.model)
      setProjectContext(maxSettings.projectContext ?? '')
      setToneGuide(maxSettings.toneGuide ?? '')
      setToneAvoid(maxSettings.toneAvoid ?? '')
      setAutoSendEnabled(maxSettings.autoSendEnabled ?? false)
      setAutoSendThreshold(maxSettings.autoSendThreshold)
      setAutoSendCategories(maxSettings.autoSendCategories ?? [])
    }
  }, [maxSettings])

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Save the non-secret Max settings via the existing project settings PATCH
  const saveSettings = useMutation({
    mutationFn: (data: Partial<MaxSettings>) =>
      api.patch(`/api/v1/companies/${companyId}/projects/${projectId}/settings`, { max: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] })
      setToast({ message: t('max.savedSettings', 'Max settings saved'), type: 'success' })
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSaveAll = () => {
    if (enabled && !apiKeySet) {
      setError(t('max.errorEnableWithoutKey', 'Set an API key before enabling Max.'))
      return
    }
    saveSettings.mutate({
      enabled,
      model,
      projectContext,
      toneGuide,
      toneAvoid,
      autoSendEnabled,
      autoSendThreshold,
      autoSendCategories,
    })
  }

  return (
    <div className="mt-6 space-y-6">
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold">{t('max.title', 'Max — your AI assistant')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('max.tagline', 'Triages incoming tickets, drafts replies, and learns your voice. Off by default — turn on once you’ve added an API key.')}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!canEdit || !apiKeySet}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm font-medium">{t('max.enableToggle', 'Enable Max')}</span>
          </label>
        </div>
        {!apiKeySet && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{t('max.needsKey', 'Set an Anthropic API key below before enabling Max.')}</span>
          </div>
        )}
      </div>

      {/* API key */}
      <ApiKeyCard
        companyId={companyId}
        projectId={projectId}
        canEdit={canEdit}
        apiKeySet={apiKeySet}
        model={model}
      />

      {/* Project context */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <div>
          <h3 className="text-lg font-semibold">{t('max.projectContextTitle', 'Project context')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('max.projectContextDesc', 'Describe what this product is, who uses it, and the major features. Max reads this on every triage.')}
          </p>
        </div>
        <textarea
          value={projectContext}
          onChange={(e) => setProjectContext(e.target.value)}
          disabled={!canEdit}
          rows={10}
          placeholder={t('max.projectContextPlaceholder', '# About\n\nMyProduct is a reading-tracker app for mobile. Users start "reading sprints" — timed challenges to read a target number of chapters in 30 minutes.\n\n## Plans\n\n- Free: basic tracking\n- Premium ($4.99/mo): sprints, analytics, export\n\n## Common features\n\n- Library import (Goodreads, Wattpad)\n- Sync via iCloud (iOS) and Google Drive (Android)')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
      </div>

      {/* Tone */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('max.toneTitle', 'Tone configuration')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('max.toneDesc', 'Shapes how Max sounds when drafting replies.')}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setAnalyzerOpen(true)} disabled={!canEdit || !apiKeySet}>
            <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
            {t('max.analyzePastReplies', 'Analyze my past replies')}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('max.toneGuideLabel', 'Voice & tone')}</label>
          <p className="text-xs text-muted-foreground">
            {t('max.toneGuideHelp', 'Anything that shapes how Max writes — voice, sentence patterns, do\'s, don\'ts. Write the whole list however feels natural; no need to split positive vs negative.')}
          </p>
          <textarea
            value={toneGuide}
            onChange={(e) => setToneGuide(e.target.value)}
            disabled={!canEdit}
            rows={10}
            placeholder={t('max.toneGuidePlaceholder', '- Direct and matter-of-fact. First person singular ("I"). Short sentences.\n- No em-dashes\n- Don\'t apologize for bugs (use "I\'ll investigate" instead of "I\'m sorry")\n- No "kindly" or "please be advised"\n- Skip generic sign-offs like "Have a great day!"')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />
        </div>

        <ExampleRepliesSection
          companyId={companyId}
          projectId={projectId}
          canEdit={canEdit}
        />
      </div>

      {/* Instructions */}
      <InstructionsSection
        companyId={companyId}
        projectId={projectId}
        canEdit={canEdit}
      />

      {/* Advanced */}
      <div className="rounded-lg border bg-card">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div>
            <h3 className="text-lg font-semibold">{t('max.advancedTitle', 'Advanced')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('max.advancedDesc', 'Model, auto-send threshold, and which categories Max may auto-reply to.')}
            </p>
          </div>
          {advancedOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
        {advancedOpen && (
          <div className="px-6 pb-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('max.modelLabel', 'Model')}</label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} disabled={!canEdit} placeholder="claude-sonnet-4-6" />
              <p className="text-xs text-muted-foreground">
                {t('max.modelHelp', 'Default is Sonnet. Opus is overkill for triage; Haiku may not be smart enough.')}
              </p>
            </div>

            <div className="rounded-md border p-4 space-y-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendEnabled}
                  disabled={!canEdit}
                  onChange={(e) => setAutoSendEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <div>
                  <p className="text-sm font-medium">{t('max.autoSendEnabledLabel', 'Allow Max to auto-send replies')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('max.autoSendEnabledHelp', 'When off, every drafted reply waits for your approval. When on, Max may send replies on its own — but only for the categories below, and only when confidence is at or above the threshold.')}
                  </p>
                </div>
              </label>

              <div className={`space-y-2 ${autoSendEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                <label className="text-sm font-medium">
                  {t('max.autoSendThresholdLabel', 'Auto-send confidence threshold')}
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {(autoSendThreshold * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={autoSendThreshold}
                  onChange={(e) => setAutoSendThreshold(parseFloat(e.target.value))}
                  disabled={!canEdit || !autoSendEnabled}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t('max.autoSendThresholdHelp', 'Minimum confidence Max must have before sending without your approval.')}
                </p>
              </div>

              <div className={`space-y-2 ${autoSendEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                <label className="text-sm font-medium">{t('max.autoSendCategoriesLabel', 'Auto-send categories')}</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_AUTO_SEND_CATEGORIES.map((cat) => {
                    const checked = autoSendCategories.includes(cat)
                    return (
                      <label key={cat} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 cursor-pointer text-xs ${checked ? 'bg-primary/10 border-primary text-primary' : 'border-input'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEdit || !autoSendEnabled}
                          onChange={(e) => {
                            setAutoSendCategories((prev) =>
                              e.target.checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                            )
                          }}
                          className="h-3 w-3"
                        />
                        {cat}
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('max.autoSendCategoriesHelp', 'Only categories you trust. Default: billing only.')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex gap-2">
        <Button type="button" onClick={handleSaveAll} disabled={!canEdit || saveSettings.isPending}>
          {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t('max.saveSettings', 'Save Max settings')}
        </Button>
      </div>

      {/* Danger zone */}
      {canEdit && (
        <ResetMaxSection
          companyId={companyId}
          projectId={projectId}
          onReset={() => setToast({ message: t('max.resetDone', 'Max has been reset. Your API key is unchanged.'), type: 'success' })}
        />
      )}

      {analyzerOpen && (
        <ToneAnalyzerModal
          companyId={companyId}
          projectId={projectId}
          currentToneGuide={toneGuide}
          currentToneAvoid={toneAvoid}
          onClose={() => setAnalyzerOpen(false)}
          onApplied={() => setToast({ message: t('max.analyzerApplied', 'Tone settings updated from your past replies.'), type: 'success' })}
        />
      )}
    </div>
  )
}

function ResetMaxSection({ companyId, projectId, onReset }: { companyId: string; projectId: string; onReset: () => void }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const reset = useResetMax(companyId, projectId)

  const handleConfirm = () => {
    reset.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false)
        onReset()
      },
      onError: () => setConfirming(false),
    })
  }

  return (
    <>
      <div className="mt-10 rounded-lg border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
              {t('max.resetTitle', "Reset Max's learning")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('max.resetDesc', 'Clears project context, tone configuration, instructions, and example replies. Your API key, past ticket enrichments, and audit log are kept.')}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-red-600 border-red-500/40 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
            onClick={() => setConfirming(true)}
            disabled={reset.isPending}
          >
            {reset.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
            {t('max.resetButton', 'Reset Max')}
          </Button>
        </div>
      </div>
      {confirming && (
        <ConfirmModal
          title={t('max.resetConfirmTitle', 'Reset Max?')}
          message={t(
            'max.resetConfirmMessage',
            "This clears Max's project context, tone guide, tone avoid, all instructions, and all example replies for this project. Your API key, the enable toggle, past ticket enrichments, and the audit log are kept. This can't be undone."
          )}
          confirmLabel={t('max.resetConfirm', 'Yes, reset Max')}
          cancelLabel={t('max.cancel', 'Cancel')}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
          destructive
        />
      )}
    </>
  )
}

// ---------- API key sub-card ----------

function ApiKeyCard({ companyId, projectId, canEdit, apiKeySet, model }: {
  companyId: string; projectId: string; canEdit: boolean; apiKeySet: boolean; model: string
}) {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const setKey = useSetMaxApiKey(companyId, projectId)
  const test = useTestMaxConnection(companyId, projectId)

  const handleSaveKey = () => {
    setKey.mutate({ apiKey }, {
      onSuccess: () => {
        setApiKey('')
      },
    })
  }

  const handleClearKey = () => {
    setKey.mutate({ apiKey: '' }, {
      onSuccess: () => {
        setApiKey('')
        setTestResult(null)
      },
    })
  }

  const handleTest = () => {
    test.mutate(
      { apiKey: apiKey || undefined, model },
      {
        onSuccess: (r) => setTestResult(r),
        onError: (err: Error) => setTestResult({ success: false, message: err.message }),
      }
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-start gap-3">
        <KeyRound className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{t('max.apiKeyTitle', 'Anthropic API key')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('max.apiKeyDesc', 'Stored encrypted at rest. Never shown back to anyone, including you.')}
          </p>
        </div>
        {apiKeySet && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {t('max.apiKeyConfigured', 'Configured')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <PasswordInput
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={!canEdit}
          placeholder={apiKeySet ? t('max.apiKeyReplacePlaceholder', 'Enter a new key to replace the current one') : 'sk-ant-...'}
          className="flex-1"
        />
        <Button type="button" onClick={handleSaveKey} disabled={!canEdit || !apiKey || setKey.isPending}>
          {setKey.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {t('max.saveKey', 'Save key')}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={(!apiKey && !apiKeySet) || test.isPending}>
          {test.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="mr-1.5 h-3.5 w-3.5" />}
          {t('max.testConnection', 'Test connection')}
        </Button>
        {apiKeySet && (
          <Button type="button" variant="outline" size="sm" className="text-red-600" onClick={handleClearKey} disabled={!canEdit || setKey.isPending}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t('max.clearKey', 'Clear key')}
          </Button>
        )}
      </div>

      {testResult && (
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${testResult.success ? 'border-green-500/50 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400' : 'border-red-500/50 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'}`}>
          {testResult.success ? <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
          <span>{testResult.message}</span>
        </div>
      )}
    </div>
  )
}

// ---------- Example replies ----------

function ExampleRepliesSection({ companyId, projectId, canEdit }: { companyId: string; projectId: string; canEdit: boolean }) {
  const { t } = useTranslation()
  const { data: replies = [] } = useMaxExampleReplies(companyId, projectId)
  const create = useCreateMaxExampleReply(companyId, projectId)
  const update = useUpdateMaxExampleReply(companyId, projectId)
  const remove = useDeleteMaxExampleReply(companyId, projectId)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [draftNotes, setDraftNotes] = useState('')

  const reset = () => {
    setDraftText('')
    setDraftNotes('')
    setEditingId(null)
    setAdding(false)
  }

  const handleSave = () => {
    if (!draftText.trim()) return
    const data: MaxExampleReplyRequest = {
      replyText: draftText.trim(),
      notes: draftNotes.trim() || undefined,
    }
    if (editingId) {
      update.mutate({ id: editingId, data }, { onSuccess: reset })
    } else {
      create.mutate(data, { onSuccess: reset })
    }
  }

  const startEdit = (reply: MaxExampleReplyResponse) => {
    setEditingId(reply.id)
    setAdding(false)
    setDraftText(reply.replyText)
    setDraftNotes(reply.notes ?? '')
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">{t('max.examplesLabel', 'Example replies')}</label>
          <p className="text-xs text-muted-foreground">
            {t('max.examplesHelp', 'Real replies that capture your voice. Max matches their tone.')}
          </p>
        </div>
        {!adding && !editingId && canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(true); setDraftText(''); setDraftNotes('') }}>
            <Plus className="mr-1 h-3 w-3" /> {t('max.addExample', 'Add example')}
          </Button>
        )}
      </div>

      {(adding || editingId) && (
        <div className="rounded-md border p-3 space-y-2 bg-muted/30">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={5}
            placeholder={t('max.examplePlaceholder', 'Paste a real reply you sent. Signatures and quoted text can be left in or stripped.')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Input
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder={t('max.exampleNotesPlaceholder', 'Optional notes (e.g. "formal tone", "billing case")')}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={!draftText.trim() || create.isPending || update.isPending}>
              {(create.isPending || update.isPending) ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              {editingId ? t('max.save', 'Save') : t('max.addExample', 'Add example')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              {t('max.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      )}

      {replies.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic">{t('max.noExamples', 'No example replies yet.')}</p>
      )}

      <div className="space-y-2">
        {replies.map((r) => (
          <div key={r.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <pre className="flex-1 text-xs whitespace-pre-wrap font-sans">{r.replyText}</pre>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(r)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            {r.notes && <p className="mt-2 text-xs text-muted-foreground italic">{r.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Instructions ----------

function InstructionsSection({ companyId, projectId, canEdit }: { companyId: string; projectId: string; canEdit: boolean }) {
  const { t } = useTranslation()
  const { data: instructions = [] } = useMaxInstructions(companyId, projectId)
  const create = useCreateMaxInstruction(companyId, projectId)
  const update = useUpdateMaxInstruction(companyId, projectId)
  const remove = useDeleteMaxInstruction(companyId, projectId)

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [draftContexts, setDraftContexts] = useState<string[]>(['reply'])

  const reset = () => {
    setAdding(false)
    setEditingId(null)
    setDraftText('')
    setDraftContexts(['reply'])
  }

  const handleSave = () => {
    if (!draftText.trim() || draftContexts.length === 0) return
    const data: MaxInstructionRequest = { instruction: draftText.trim(), contexts: draftContexts }
    if (editingId) {
      update.mutate({ id: editingId, data }, { onSuccess: reset })
    } else {
      create.mutate(data, { onSuccess: reset })
    }
  }

  const startEdit = (i: MaxInstructionResponse) => {
    setEditingId(i.id)
    setAdding(false)
    setDraftText(i.instruction)
    setDraftContexts(i.contexts.length > 0 ? i.contexts : ['reply'])
  }

  const contextLookup = useMemo(() => Object.fromEntries(ALL_CONTEXTS.map((c) => [c.id, c.label])), [])

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <MessageSquareText className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold">{t('max.instructionsTitle', 'Max’s instructions')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('max.instructionsDesc', 'Permanent directives Max follows. Each is tagged with the prompts it applies to.')}
            </p>
          </div>
        </div>
        {!adding && !editingId && canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(true); setDraftText(''); setDraftContexts(['reply']) }}>
            <Plus className="mr-1 h-3 w-3" /> {t('max.addInstruction', 'Add instruction')}
          </Button>
        )}
      </div>

      {(adding || editingId) && (
        <div className="rounded-md border p-3 space-y-3 bg-muted/30">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={3}
            placeholder={t('max.instructionPlaceholder', 'e.g. "Never apologize for bugs. Say I’ll investigate instead."')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div>
            <p className="text-xs font-medium mb-1.5">{t('max.contextsLabel', 'Applies to')}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_CONTEXTS.map((c) => {
                const checked = draftContexts.includes(c.id)
                return (
                  <label key={c.id} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 cursor-pointer text-xs ${checked ? 'bg-primary/10 border-primary text-primary' : 'border-input'}`} title={c.description}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setDraftContexts((prev) =>
                          e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                        )
                      }}
                      className="h-3 w-3"
                    />
                    {c.label}
                  </label>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={!draftText.trim() || draftContexts.length === 0 || create.isPending || update.isPending}>
              {(create.isPending || update.isPending) ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              {editingId ? t('max.save', 'Save') : t('max.addInstruction', 'Add instruction')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              {t('max.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      )}

      {instructions.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground italic">{t('max.noInstructions', 'No instructions yet. Add directives that should apply across every triage or reply.')}</p>
      )}

      <div className="divide-y rounded-md border">
        {instructions.map((inst) => (
          <div key={inst.id} className="flex items-start justify-between gap-3 p-3">
            <div className="flex-1 space-y-1">
              <p className="text-sm line-clamp-1" title={inst.instruction}>{inst.instruction}</p>
              <div className="flex flex-wrap gap-1">
                {inst.contexts.map((c) => (
                  <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {contextLookup[c] ?? c}
                  </span>
                ))}
                <span className="rounded-full px-2 py-0.5 text-xs text-muted-foreground italic">
                  via {inst.source}
                </span>
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(inst)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => remove.mutate(inst.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
