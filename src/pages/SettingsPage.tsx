import { useState } from 'react'
import { Globe, Check, Sun, Moon, Monitor, Users, Plus, Loader2, Mail, Shield, Trash2, Ban, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '@/i18n'
import { useThemeStore } from '@/store/themeStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
  const [inviteRole, setInviteRole] = useState<'Owner' | 'Admin' | 'Member'>('Member')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null)
  const [disableTarget, setDisableTarget] = useState<UserResponse | null>(null)

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['companyMembers', companyId],
    queryFn: () => api.get<UserResponse[]>(`/api/v1/users/company/${companyId}`),
    enabled: !!companyId,
  })

  const inviteUser = useMutation({
    mutationFn: (data: { email: string; displayName?: string; companyRole: string }) =>
      api.post<UserResponse>(`/api/v1/users/invite?companyId=${companyId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyMembers', companyId] })
      setShowInvite(false)
      setInviteEmail('')
      setInviteDisplayName('')
      setInviteRole('Member')
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

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    inviteUser.mutate({
      email: inviteEmail,
      displayName: inviteDisplayName || undefined,
      companyRole: inviteRole,
    })
  }

  const roleColors: Record<string, string> = {
    Owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    Admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    Member: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
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
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t('common.role')}</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'Owner' | 'Admin' | 'Member')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Member">{t('settings.roleMember')}</option>
                    <option value="Admin">{t('settings.roleAdmin')}</option>
                    <option value="Owner">{t('settings.roleOwner')}</option>
                  </select>
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
              const membership = member.companyMemberships?.find((m) => m.companyId === companyId)
              const role = membership?.role ?? 'Member'
              const isCurrentUser = currentUser?.id === member.id
              const currentRole = currentUser?.companyMemberships?.find((m) => m.companyId === companyId)?.role
              const canManage = !isCurrentUser && (
                currentRole === 'Owner' ||
                (currentRole === 'Admin' && role === 'Member')
              )
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
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {t('settings.pendingSignup')}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[role] ?? roleColors.Member}`}>
                      <Shield className="h-3 w-3" />
                      {role}
                    </span>
                    {canManage && (
                      <>
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
    </>
  )
}
