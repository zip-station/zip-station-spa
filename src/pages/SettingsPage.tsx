import { useState, useEffect } from 'react'
import { Globe, Check, Sun, Moon, Monitor, Users, Plus, Loader2, Mail, Shield, Trash2, Ban, CheckCircle, Save, AlertTriangle, Crown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '@/i18n'
import { useThemeStore } from '@/store/themeStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Toast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { api } from '@/lib/api'
import type { UserResponse } from '@/types/api'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language?.split('-')[0] ?? 'en'
  const { theme, setTheme } = useThemeStore()
  const { companyId, user: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteDisplayName, setInviteDisplayName] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null)
  const [disableTarget, setDisableTarget] = useState<UserResponse | null>(null)
  const [transferTarget, setTransferTarget] = useState<UserResponse | null>(null)

  // Company settings
  const [baseUrl, setBaseUrl] = useState('')

  // Company SMTP settings
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(465)
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpUseSsl, setSmtpUseSsl] = useState(true)
  const [smtpFromName, setSmtpFromName] = useState('')
  const [smtpFromEmail, setSmtpFromEmail] = useState('')
  const [smtpSaved, setSmtpSaved] = useState(false)
  const [smtpError, setSmtpError] = useState<string | null>(null)
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [smtpTesting, setSmtpTesting] = useState(false)

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['companyMembers', companyId],
    queryFn: () => api.get<UserResponse[]>(`/api/v1/users/company/${companyId}`),
    enabled: !!companyId,
  })

  const { data: company } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => api.get<{ settings: { baseUrl?: string; smtp?: { host: string; port: number; username: string; useSsl: boolean; fromName?: string; fromEmail?: string; hasPassword?: boolean } } }>(`/api/v1/companies/${companyId}`),
    enabled: !!companyId,
  })

  useEffect(() => {
    if (company?.settings?.baseUrl) setBaseUrl(company.settings.baseUrl)
    if (company?.settings?.smtp) {
      const s = company.settings.smtp
      setSmtpHost(s.host)
      setSmtpPort(s.port)
      setSmtpUsername(s.username)
      setSmtpUseSsl(s.useSsl)
      setSmtpFromName(s.fromName || '')
      setSmtpFromEmail(s.fromEmail || '')
    }
  }, [company])

  const saveSmtp = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/api/v1/companies/${companyId}/settings`, { baseUrl, smtp: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      setSmtpSaved(true)
      setSmtpError(null)
    },
    onError: (err: Error) => setSmtpError(err.message),
  })

  const handleSmtpSave = (e: React.FormEvent) => {
    e.preventDefault()
    saveSmtp.mutate({
      host: smtpHost, port: smtpPort, username: smtpUsername,
      password: smtpPassword, useSsl: smtpUseSsl,
      fromName: smtpFromName || undefined, fromEmail: smtpFromEmail || undefined,
    })
  }

  const testSmtp = async () => {
    setSmtpTesting(true)
    setSmtpTestResult(null)
    try {
      const result = await api.post<{ success: boolean; message: string }>(
        `/api/v1/companies/${companyId}/test-smtp`,
        { host: smtpHost, port: smtpPort, username: smtpUsername, password: smtpPassword, useSsl: smtpUseSsl }
      )
      setSmtpTestResult(result)
    } catch (err: unknown) {
      setSmtpTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' })
    } finally {
      setSmtpTesting(false)
    }
  }

  const resendInvite = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/v1/users/${userId}/resend-invite?companyId=${companyId}`),
  })

  const inviteUser = useMutation({
    mutationFn: (data: { email: string; displayName?: string }) =>
      api.post<UserResponse>(`/api/v1/users/invite?companyId=${companyId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyMembers', companyId] })
      setShowInvite(false)
      setInviteEmail('')
      setInviteDisplayName('')
      setInviteError(null)
    },
    onError: (err: Error) => {
      setInviteError(err.message)
    },
  })

  const deleteMember = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/v1/users/${userId}?companyId=${companyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyMembers', companyId] })
      setDeleteTarget(null)
    },
  })

  const toggleDisableMember = useMutation({
    mutationFn: (userId: string) =>
      api.patch<UserResponse>(`/api/v1/users/${userId}/toggle-disable?companyId=${companyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyMembers', companyId] })
      setDisableTarget(null)
    },
  })

  const transferOwnership = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/v1/users/${userId}/transfer-ownership?companyId=${companyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyMembers', companyId] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      setTransferTarget(null)
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    inviteUser.mutate({
      email: inviteEmail,
      displayName: inviteDisplayName || undefined,
    })
  }

  const roleColors: Record<string, string> = {
    Owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'No Role': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code)
  }

  const themes = [
    { value: 'light' as const, labelKey: 'settings.themeLight', icon: Sun },
    { value: 'dark' as const, labelKey: 'settings.themeDark', icon: Moon },
    { value: 'system' as const, labelKey: 'settings.themeSystem', icon: Monitor },
  ]

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('settings.title')}</h2>
        <p className="mt-1 text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Theme selector */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{t('settings.theme')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.themeDesc')}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {themes.map((themeOpt) => (
            <button
              key={themeOpt.value}
              onClick={() => setTheme(themeOpt.value)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                theme === themeOpt.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <themeOpt.icon className="h-4 w-4" />
              <span className="flex-1">{t(themeOpt.labelKey)}</span>
              {theme === themeOpt.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Language selector */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{t('settings.language')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                currentLang === lang.code
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1">{lang.label}</span>
              {currentLang === lang.code && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard URL */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Dashboard URL</h3>
            <p className="text-sm text-muted-foreground">The public URL where your Zip Station dashboard is hosted. Used in invitation emails.</p>
          </div>
        </div>
        <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://zip.yourdomain.com" />
      </div>

      {/* Company SMTP (Outgoing Email) */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Outgoing Email (SMTP)</h3>
            <p className="text-sm text-muted-foreground">Configure SMTP to send invitation emails and system notifications.</p>
          </div>
        </div>

        {smtpSaved && <Toast message="SMTP settings saved" type="success" onClose={() => setSmtpSaved(false)} />}
        {smtpError && <Toast message={smtpError} type="error" onClose={() => setSmtpError(null)} />}

        <form onSubmit={handleSmtpSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">SMTP Host</label>
              <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Port</label>
              <Input type="number" value={smtpPort} onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)} />
              <p className="text-xs text-muted-foreground">Common: 465 (SSL) or 587 (TLS)</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="noreply@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <PasswordInput value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={company?.settings?.smtp?.hasPassword ? '••••••••' : 'Enter password'} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Name <span className="text-muted-foreground">(optional)</span></label>
              <Input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} placeholder="Zip Station" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From Email <span className="text-muted-foreground">(optional)</span></label>
              <Input value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} placeholder="noreply@example.com" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={smtpUseSsl} onChange={(e) => setSmtpUseSsl(e.target.checked)} className="h-4 w-4 rounded border-input" />
              Use SSL
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={!smtpHost || smtpTesting} onClick={testSmtp}>
                {smtpTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Test Connection
              </Button>
              <Button type="submit" disabled={!smtpHost || saveSmtp.isPending}>
                {saveSmtp.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
          {smtpTestResult && (
            <div className={`mt-2 rounded-md px-3 py-2 text-sm ${smtpTestResult.success ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
              {smtpTestResult.success ? 'Connection successful!' : `Connection failed: ${smtpTestResult.message}`}
            </div>
          )}
        </form>
      </div>

      {/* Team Members */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">{t('settings.teamMembers')}</h3>
              <p className="text-sm text-muted-foreground">{t('settings.teamMembersDesc')}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowInvite(!showInvite)} disabled={showInvite}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('settings.inviteMember')}
          </Button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="mb-4 rounded-lg border bg-accent/30 p-4">
            <h4 className="mb-3 text-sm font-semibold">{t('settings.inviteNewMember')}</h4>
            {!company?.settings?.baseUrl && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Dashboard URL is not configured. Invited members will not receive a signup link in their invitation email. Set it in the <strong>Dashboard URL</strong> section above.</span>
              </div>
            )}
            {inviteError && (
              <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {inviteError}
              </div>
            )}
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('auth.email')}</label>
                  <Input
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    {t('settings.displayName')} <span className="text-muted-foreground">({t('common.optional')})</span>
                  </label>
                  <Input
                    placeholder={t('setup.namePlaceholder')}
                    value={inviteDisplayName}
                    onChange={(e) => setInviteDisplayName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={inviteUser.isPending}>
                  {inviteUser.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {t('settings.sendInvite')}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowInvite(false); setInviteError(null) }}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Members list */}
        {membersLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!membersLoading && members && members.length > 0 && (
          <div className="divide-y rounded-lg border">
            {members.map((member) => {
              const isCurrentUser = currentUser?.id === member.id
              const isOwner = member.isOwner
              const role = isOwner ? 'Owner' : (member.roleAssignments?.find(ra => ra.companyId === companyId)?.roleName || 'No Role')
              const currentUserIsOwner = currentUser?.isOwner ?? false
              const canManage = !isCurrentUser && currentUserIsOwner
              return (
                <div key={member.id} className="flex items-center gap-4 px-4 py-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium ${member.isDisabled ? 'opacity-40' : ''}`}>
                    {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className={`min-w-0 flex-1 ${member.isDisabled ? 'opacity-40' : ''}`}>
                    <p className="truncate text-sm font-medium">
                      {member.displayName || t('settings.noName')}
                      {member.isDisabled && (
                        <span className="ml-2 text-xs text-muted-foreground">({t('settings.disabled', 'Disabled')})</span>
                      )}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!member.firebaseUserId && (
                      <>
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          {t('settings.pendingSignup')}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => resendInvite.mutate(member.id)}
                          disabled={resendInvite.isPending}
                        >
                          {resendInvite.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Mail className="mr-1 h-3 w-3" />}
                          Resend
                        </Button>
                      </>
                    )}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[role] ?? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      <Shield className="h-3 w-3" />
                      {role}
                    </span>
                    {canManage && (
                      <>
                        {!isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            title="Transfer Ownership"
                            onClick={() => setTransferTarget(member)}
                          >
                            <Crown className="h-3.5 w-3.5 text-purple-600" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          title={member.isDisabled ? t('settings.enableMember', 'Enable') : t('settings.disableMember', 'Disable')}
                          onClick={() => setDisableTarget(member)}
                        >
                          {member.isDisabled ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <Ban className="h-3.5 w-3.5 text-yellow-600" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          title={t('settings.removeMember', 'Remove')}
                          onClick={() => setDeleteTarget(member)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!membersLoading && (!members || members.length === 0) && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('settings.noMembers')}
          </p>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title={t('settings.removeMemberTitle', 'Remove Team Member')}
          message={t('settings.removeMemberMessage', `Are you sure you want to remove ${deleteTarget.displayName || deleteTarget.email} from this company? This action cannot be undone.`)}
          confirmLabel={t('common.remove', 'Remove')}
          cancelLabel={t('common.cancel')}
          destructive
          onConfirm={() => deleteMember.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {disableTarget && (
        <ConfirmModal
          title={disableTarget.isDisabled
            ? t('settings.enableMemberTitle', 'Enable Team Member')
            : t('settings.disableMemberTitle', 'Disable Team Member')
          }
          message={disableTarget.isDisabled
            ? t('settings.enableMemberMessage', `Are you sure you want to re-enable ${disableTarget.displayName || disableTarget.email}?`)
            : t('settings.disableMemberMessage', `Are you sure you want to disable ${disableTarget.displayName || disableTarget.email}? They will not be able to access the system.`)
          }
          confirmLabel={disableTarget.isDisabled
            ? t('settings.enableMember', 'Enable')
            : t('settings.disableMember', 'Disable')
          }
          cancelLabel={t('common.cancel')}
          destructive={!disableTarget.isDisabled}
          onConfirm={() => toggleDisableMember.mutate(disableTarget.id)}
          onCancel={() => setDisableTarget(null)}
        />
      )}

      {transferTarget && (
        <ConfirmModal
          title="Transfer Ownership"
          message={`Are you sure you want to transfer ownership to ${transferTarget.displayName || transferTarget.email}? You will lose owner privileges and this cannot be undone without the new owner transferring back.`}
          confirmLabel="Transfer Ownership"
          cancelLabel={t('common.cancel')}
          destructive
          onConfirm={() => transferOwnership.mutate(transferTarget.id)}
          onCancel={() => setTransferTarget(null)}
        />
      )}
    </>
  )
}
