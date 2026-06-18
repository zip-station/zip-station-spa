import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, KeyRound, Plus, Trash2, AlertTriangle, RefreshCw, MessageSquare, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Toast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  useDiscordSettings,
  useSetDiscordBotToken,
  useSetDiscordEnabled,
  useAddDiscordSource,
  useUpdateDiscordSource,
  useDeleteDiscordSource,
  useTriggerDiscordSync,
  useDiscordGuilds,
  useDiscordChannels,
} from '@/hooks/useDiscord'
import { useKanbanBoard } from '@/hooks/useKanbanBoard'
import { cardTypeOptions, getCardTypeLabel } from '@/components/Kanban/kanbanStyles'
import type { DiscordSourceRequest, DiscordSourceResponse, KanbanCardType } from '@/types/api'

// Sentinel for the dropdown — null in storage means "Auto, let Max decide".
const AUTO_TYPE = '__auto__' as const

interface DiscordSettingsTabProps {
  companyId: string
  projectId: string
  canEdit: boolean
}

export function DiscordSettingsTab({ companyId, projectId, canEdit }: DiscordSettingsTabProps) {
  const { data: settings, isLoading } = useDiscordSettings(companyId, projectId)
  const setEnabled = useSetDiscordEnabled(companyId, projectId)
  const triggerSync = useTriggerDiscordSync(companyId, projectId)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apiKeySet = settings?.botTokenSet ?? false
  const enabled = settings?.enabled ?? false

  if (isLoading || !settings) {
    return (
      <div className="mt-6 flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleToggleEnabled = (next: boolean) => {
    if (next && !apiKeySet) {
      setError('Set a bot token before enabling Discord intake.')
      return
    }
    setEnabled.mutate({ enabled: next }, {
      onError: (e: Error) => setError(e.message),
    })
  }

  const handleSync = () => {
    triggerSync.mutate(undefined, {
      onSuccess: () => setToast({ message: 'Sync queued. New Discord posts will appear as kanban stories within a minute.', type: 'success' }),
      onError: (e: Error) => setError(e.message),
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
            <MessageSquare className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold">Discord intake</h3>
              <p className="text-sm text-muted-foreground">
                Watches forum channels and turns each new post into a kanban story. One bot, many servers / channels.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!canEdit || !apiKeySet}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm font-medium">Enable Discord intake</span>
          </label>
        </div>
        {!apiKeySet && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Add a Discord bot token below before enabling.</span>
          </div>
        )}
      </div>

      <BotTokenCard companyId={companyId} projectId={projectId} canEdit={canEdit} botTokenSet={apiKeySet} onError={setError} />

      <SourcesSection
        companyId={companyId}
        projectId={projectId}
        canEdit={canEdit}
        sources={settings.sources}
        botTokenSet={apiKeySet}
      />

      {enabled && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleSync} disabled={triggerSync.isPending}>
            {triggerSync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync now
          </Button>
          <p className="text-xs text-muted-foreground">
            Discord posts auto-sync every 60 seconds. Use this for a manual nudge.
          </p>
        </div>
      )}
    </div>
  )
}

function BotTokenCard({
  companyId,
  projectId,
  canEdit,
  botTokenSet,
  onError,
}: {
  companyId: string
  projectId: string
  canEdit: boolean
  botTokenSet: boolean
  onError: (msg: string | null) => void
}) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState('')
  const setBotToken = useSetDiscordBotToken(companyId, projectId)
  const [confirmClear, setConfirmClear] = useState(false)
  // Verify is on-demand only — toggled by a button so it doesn't fire when the user
  // first lands on the tab. Hitting Refresh re-runs it.
  const [verifyEnabled, setVerifyEnabled] = useState(false)
  const guilds = useDiscordGuilds(companyId, projectId, { enabled: verifyEnabled && botTokenSet })

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-start gap-3">
        <KeyRound className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Bot token</h3>
          <p className="text-sm text-muted-foreground">
            Create a Discord application + bot, invite it to your server, paste the token. Stored encrypted.
          </p>
        </div>
        {botTokenSet && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Configured
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <PasswordInput
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={!canEdit}
          placeholder={botTokenSet ? 'Enter a new token to replace the current one' : 'MTI…'}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={() =>
            setBotToken.mutate(
              { botToken: token },
              {
                onSuccess: () => {
                  setToken('')
                  // A new token means the guild/channel lists need a fresh fetch.
                  queryClient.invalidateQueries({ queryKey: ['discord', 'guilds'] })
                  queryClient.invalidateQueries({ queryKey: ['discord', 'channels'] })
                },
              }
            )
          }
          disabled={!canEdit || !token || setBotToken.isPending}
        >
          {setBotToken.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Save token
        </Button>
        {botTokenSet && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-red-600"
            onClick={() => setConfirmClear(true)}
            disabled={!canEdit || setBotToken.isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {botTokenSet && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setVerifyEnabled(true)
              // Force a refetch even if we'd previously verified — the user might have re-invited the bot.
              queryClient.invalidateQueries({ queryKey: ['discord', 'guilds', companyId, projectId] })
              onError(null)
            }}
            disabled={guilds.isFetching}
          >
            {guilds.isFetching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
            Verify bot access
          </Button>
          {verifyEnabled && guilds.isSuccess && (
            <span className="text-xs text-green-700 dark:text-green-400">
              ✓ Bot is in {guilds.data.length} server{guilds.data.length === 1 ? '' : 's'}.
            </span>
          )}
          {verifyEnabled && guilds.isError && (
            <span className="text-xs text-red-600">
              {(guilds.error as Error)?.message ?? 'Verification failed.'}
            </span>
          )}
        </div>
      )}

      {confirmClear && (
        <ConfirmModal
          title="Clear Discord bot token?"
          message="The bot will stop polling all sources for this project. You can paste a new token any time."
          confirmLabel="Clear token"
          cancelLabel="Cancel"
          onConfirm={() => {
            setBotToken.mutate({ botToken: '' })
            setConfirmClear(false)
          }}
          onCancel={() => setConfirmClear(false)}
          destructive
        />
      )}
    </div>
  )
}

function SourcesSection({
  companyId,
  projectId,
  canEdit,
  sources,
  botTokenSet,
}: {
  companyId: string
  projectId: string
  canEdit: boolean
  sources: DiscordSourceResponse[]
  botTokenSet: boolean
}) {
  const create = useAddDiscordSource(companyId, projectId)
  const update = useUpdateDiscordSource(companyId, projectId)
  const remove = useDeleteDiscordSource(companyId, projectId)
  const { data: board } = useKanbanBoard(companyId, projectId)

  const customCardTypes = board?.customCardTypes ?? []
  const typeOptions = cardTypeOptions(customCardTypes)

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DiscordSourceRequest>(blankSource())
  // Manual ID entry as a fallback for power users, debugging, or when the bot can't list
  // a guild/channel for some permissions reason. Default to picker; remember the user's
  // choice across an add/edit session.
  const [manualMode, setManualMode] = useState(false)

  // Picker data — only fetched when the editor is open and a token is saved.
  const editorOpen = adding || !!editingId
  const guilds = useDiscordGuilds(companyId, projectId, { enabled: editorOpen && botTokenSet && !manualMode })
  const channels = useDiscordChannels(
    companyId,
    projectId,
    !manualMode && editorOpen && draft.guildId ? draft.guildId : null,
    { forumOnly: draft.isForum },
  )

  const reset = () => {
    setAdding(false)
    setEditingId(null)
    setDraft(blankSource())
    setManualMode(false)
  }

  const startEdit = (s: DiscordSourceResponse) => {
    setEditingId(s.id)
    setAdding(false)
    setDraft({
      name: s.name,
      guildId: s.guildId,
      channelId: s.channelId,
      isForum: s.isForum,
      defaultCardType: s.defaultCardType,
      enabled: s.enabled,
    })
  }

  const handleSave = () => {
    if (!draft.guildId.trim() || !draft.channelId.trim()) return
    if (editingId) {
      update.mutate({ id: editingId, data: draft }, { onSuccess: reset })
    } else {
      create.mutate(draft, { onSuccess: reset })
    }
  }

  const selectedGuildName = guilds.data?.find(g => g.id === draft.guildId)?.name
  const selectedChannelName = channels.data?.find(c => c.id === draft.channelId)?.name

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sources</h3>
          <p className="text-sm text-muted-foreground">
            Each entry is one Discord channel. New posts there become stories.
          </p>
        </div>
        {canEdit && !adding && !editingId && (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)} disabled={!botTokenSet}>
            <Plus className="mr-1 h-3 w-3" /> Add source
          </Button>
        )}
      </div>

      {!botTokenSet && (
        <p className="text-xs text-muted-foreground">Save a bot token above before adding sources.</p>
      )}

      {(adding || editingId) && (
        <div className="rounded-md border p-3 space-y-3 bg-muted/30">
          {!manualMode ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Server">
                <select
                  value={draft.guildId}
                  onChange={(e) => {
                    const guildId = e.target.value
                    const guildName = guilds.data?.find(g => g.id === guildId)?.name ?? ''
                    setDraft({ ...draft, guildId, channelId: '', name: guildName ? `${guildName}` : draft.name })
                  }}
                  disabled={guilds.isLoading || !guilds.data}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">
                    {guilds.isLoading ? 'Loading…' : guilds.isError ? '— failed to load —' : 'Pick a server…'}
                  </option>
                  {guilds.data?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                {guilds.isError && (
                  <p className="text-xs text-red-600 mt-1">{(guilds.error as Error)?.message ?? 'Could not list servers.'}</p>
                )}
              </Field>
              <Field label={draft.isForum ? 'Forum channel' : 'Channel'}>
                <select
                  value={draft.channelId}
                  onChange={(e) => {
                    const channelId = e.target.value
                    const channelName = channels.data?.find(c => c.id === channelId)?.name
                    const guildName = guilds.data?.find(g => g.id === draft.guildId)?.name
                    const computedLabel = (guildName && channelName) ? `${guildName} / #${channelName}` : draft.name
                    setDraft({ ...draft, channelId, name: computedLabel })
                  }}
                  disabled={!draft.guildId || channels.isLoading || !channels.data}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">
                    {!draft.guildId
                      ? 'Pick a server first'
                      : channels.isLoading
                        ? 'Loading…'
                        : channels.isError
                          ? '— failed to load —'
                          : (channels.data?.length ?? 0) === 0
                            ? (draft.isForum ? 'No forum channels in this server' : 'No channels found')
                            : 'Pick a channel…'}
                  </option>
                  {channels.data?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                </select>
                {channels.isError && (
                  <p className="text-xs text-red-600 mt-1">{(channels.error as Error)?.message ?? 'Could not list channels.'}</p>
                )}
              </Field>
              <Field label="Label">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder={selectedGuildName && selectedChannelName ? `${selectedGuildName} / #${selectedChannelName}` : 'Main server / #bugs'}
                />
              </Field>
              <Field label="Default card type">
                <select
                  value={draft.defaultCardType ?? AUTO_TYPE}
                  onChange={(e) => {
                    const v = e.target.value
                    setDraft({ ...draft, defaultCardType: v === AUTO_TYPE ? null : (v as KanbanCardType) })
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={AUTO_TYPE}>Auto — let Max decide</option>
                  {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Label">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Main server / #bugs"
                />
              </Field>
              <Field label="Default card type">
                <select
                  value={draft.defaultCardType ?? AUTO_TYPE}
                  onChange={(e) => {
                    const v = e.target.value
                    setDraft({ ...draft, defaultCardType: v === AUTO_TYPE ? null : (v as KanbanCardType) })
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={AUTO_TYPE}>Auto — let Max decide</option>
                  {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Guild (server) ID">
                <Input
                  value={draft.guildId}
                  onChange={(e) => setDraft({ ...draft, guildId: e.target.value.trim() })}
                  placeholder="123456789012345678"
                />
              </Field>
              <Field label="Channel ID">
                <Input
                  value={draft.channelId}
                  onChange={(e) => setDraft({ ...draft, channelId: e.target.value.trim() })}
                  placeholder="123456789012345678"
                />
              </Field>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isForum}
                onChange={(e) => setDraft({ ...draft, isForum: e.target.checked })}
              />
              Forum channel (recommended)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              Enabled
            </label>
          </div>

          <button
            type="button"
            onClick={() => setManualMode(m => !m)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {manualMode ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {manualMode ? 'Use the server picker' : 'Advanced: paste IDs manually'}
          </button>

          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={!draft.guildId || !draft.channelId || create.isPending || update.isPending}>
              {(create.isPending || update.isPending) ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {editingId ? 'Save' : 'Add source'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={reset}>Cancel</Button>
          </div>
        </div>
      )}

      {sources.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground italic">No sources yet. Add a Discord channel to start importing posts.</p>
      )}

      <div className="divide-y rounded-md border">
        {sources.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{s.name || `Channel ${s.channelId}`}</p>
                {!s.enabled && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Paused</span>}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{s.isForum ? 'Forum' : 'Text'}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {!s.defaultCardType ? 'Auto type' : getCardTypeLabel(s.defaultCardType, customCardTypes)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                guild {s.guildId} / channel {s.channelId}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(s)}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => remove.mutate(s.id)}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </label>
  )
}

function blankSource(): DiscordSourceRequest {
  return {
    name: '',
    guildId: '',
    channelId: '',
    isForum: true,
    defaultCardType: null, // Auto — let Max decide is the right default when Max is the headline feature
    enabled: true,
  }
}
