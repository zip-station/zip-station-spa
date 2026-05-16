import { useState } from 'react'
import { Key, Plus, Copy, CheckCircle, Loader2, Trash2, AlertTriangle, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  usePersonalAccessTokens,
  useCreatePersonalAccessToken,
  useRevokePersonalAccessToken,
} from '@/hooks/usePersonalAccessTokens'
import type { PersonalAccessTokenResponse } from '@/types/api'

const EXPIRY_OPTIONS = [
  { labelKey: 'pat.expiry.never', days: null as number | null },
  { labelKey: 'pat.expiry.30d', days: 30 },
  { labelKey: 'pat.expiry.90d', days: 90 },
  { labelKey: 'pat.expiry.1y', days: 365 },
]

function formatTimestamp(ts: number | undefined | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function PersonalAccessTokensSection({
  companyId,
  dashboardUrl,
}: {
  companyId: string | null
  dashboardUrl?: string
}) {
  const { t } = useTranslation()
  const { data: tokens, isLoading } = usePersonalAccessTokens(companyId)
  const createMutation = useCreatePersonalAccessToken(companyId)
  const revokeMutation = useRevokePersonalAccessToken(companyId)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newExpiryDays, setNewExpiryDays] = useState<number | null>(90)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [commandCopied, setCommandCopied] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<PersonalAccessTokenResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mcpUrl = (() => {
    const base = dashboardUrl?.trim().replace(/\/+$/, '')
    if (base) return `${base}/mcp`
    return 'https://your-zip-station.example.com/mcp'
  })()
  const mcpCommand = (token: string) =>
    `claude mcp add --transport http --scope user zip-station ${mcpUrl} --header "Authorization: Bearer ${token}"`

  const handleCreate = async () => {
    setError(null)
    if (!newName.trim()) {
      setError(t('pat.nameRequired', 'Name is required'))
      return
    }
    try {
      const expiresOnDateTime = newExpiryDays != null
        ? Date.now() + newExpiryDays * 24 * 60 * 60 * 1000
        : undefined
      const created = await createMutation.mutateAsync({ name: newName.trim(), expiresOnDateTime })
      setCreatedToken(created.fullToken)
      setNewName('')
      setNewExpiryDays(90)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create token')
    }
  }

  const handleCopy = async () => {
    if (!createdToken) return
    await navigator.clipboard.writeText(createdToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyCommand = async () => {
    if (!createdToken) return
    await navigator.clipboard.writeText(mcpCommand(createdToken))
    setCommandCopied(true)
    setTimeout(() => setCommandCopied(false), 2000)
  }

  const handleDismissCreated = () => {
    setCreatedToken(null)
    setShowCreate(false)
    setCopied(false)
    setCommandCopied(false)
  }

  return (
    <div className="mb-8 rounded-lg border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{t('pat.title', 'Personal Access Tokens')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('pat.subtitle', 'Use these to authenticate the MCP server and other API clients. They inherit your permissions.')}
            </p>
          </div>
        </div>
        {!showCreate && !createdToken && (
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            {t('pat.create', 'New token')}
          </Button>
        )}
      </div>

      {createdToken && (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950">
          <div className="mb-2 flex items-center gap-2 text-yellow-900 dark:text-yellow-200">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">{t('pat.savePrompt', 'Copy this token now — it will not be shown again.')}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-sm">{createdToken}</code>
            <Button onClick={handleCopy} size="sm" variant="outline">
              {copied ? <CheckCircle className="mr-1 h-4 w-4 text-green-600" /> : <Copy className="mr-1 h-4 w-4" />}
              {copied ? t('pat.copied', 'Copied') : t('pat.copy', 'Copy')}
            </Button>
          </div>

          <div className="mt-4 border-t border-yellow-300 pt-3 dark:border-yellow-700">
            <div className="mb-2 flex items-center gap-2 text-sm text-yellow-900 dark:text-yellow-200">
              <Terminal className="h-4 w-4" />
              <span className="font-semibold">{t('pat.mcpCommandTitle', 'Connect Claude Code')}</span>
            </div>
            <p className="mb-2 text-xs text-yellow-900/80 dark:text-yellow-200/80">
              {t('pat.mcpCommandHelp', 'Run this in your terminal. Change the URL if your Zip Station is not on this machine.')}
            </p>
            <div className="flex items-start gap-2">
              <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-xs">{mcpCommand(createdToken)}</code>
              <Button onClick={handleCopyCommand} size="sm" variant="outline">
                {commandCopied ? <CheckCircle className="mr-1 h-4 w-4 text-green-600" /> : <Copy className="mr-1 h-4 w-4" />}
                {commandCopied ? t('pat.copied', 'Copied') : t('pat.copyCommand', 'Copy command')}
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <Button onClick={handleDismissCreated} size="sm">
              {t('pat.dismiss', "I've saved it")}
            </Button>
          </div>
        </div>
      )}

      {showCreate && !createdToken && (
        <div className="mb-4 rounded-md border bg-muted/40 p-4">
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">{t('pat.name', 'Name')}</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('pat.namePlaceholder', 'e.g. Laptop MCP, CI pipeline')}
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">{t('pat.expiry.label', 'Expires')}</label>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.labelKey}
                  type="button"
                  onClick={() => setNewExpiryDays(opt.days)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    newExpiryDays === opt.days
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent'
                  }`}
                >
                  {t(opt.labelKey, opt.days ? `${opt.days} days` : 'Never')}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={createMutation.isPending} size="sm">
              {createMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {t('pat.create', 'Create token')}
            </Button>
            <Button
              onClick={() => { setShowCreate(false); setError(null); setNewName('') }}
              variant="outline"
              size="sm"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('common.loading')}
        </div>
      ) : !tokens || tokens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t('pat.empty', 'No tokens yet.')}
        </p>
      ) : (
        <div className="space-y-2">
          {tokens.map((tok) => {
            const expired = tok.expiresOnDateTime != null && tok.expiresOnDateTime < Date.now()
            const dead = tok.isRevoked || expired
            return (
              <div
                key={tok.id}
                className={`flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 ${dead ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{tok.name}</span>
                    {tok.isRevoked && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                        {t('pat.revoked', 'Revoked')}
                      </span>
                    )}
                    {!tok.isRevoked && expired && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {t('pat.expired', 'Expired')}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{tok.tokenPrefix}…</span>
                    <span>{t('pat.created', 'Created')}: {formatTimestamp(tok.createdOnDateTime)}</span>
                    <span>{t('pat.lastUsed', 'Last used')}: {tok.lastUsedOnDateTime ? formatTimestamp(tok.lastUsedOnDateTime) : t('pat.never', 'Never')}</span>
                    {tok.expiresOnDateTime && (
                      <span>{t('pat.expires', 'Expires')}: {formatTimestamp(tok.expiresOnDateTime)}</span>
                    )}
                  </div>
                </div>
                {!tok.isRevoked && (
                  <Button
                    onClick={() => setRevokeTarget(tok)}
                    variant="ghost"
                    size="sm"
                    title={t('pat.revoke', 'Revoke')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {revokeTarget && (
        <ConfirmModal
          title={t('pat.revokeTitle', 'Revoke this token?')}
          message={t('pat.revokeMessage', `"${revokeTarget.name}" will stop working immediately. Anything using this token will lose access.`)}
          confirmLabel={t('pat.revoke', 'Revoke')}
          cancelLabel={t('common.cancel')}
          destructive
          onConfirm={async () => {
            await revokeMutation.mutateAsync(revokeTarget.id)
            setRevokeTarget(null)
          }}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  )
}
