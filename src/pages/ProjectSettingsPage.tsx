import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, Save, AlertTriangle, Key, Copy, Trash2, Plus, Users, Shield, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { copyToClipboard } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Toast } from '@/components/ui/Toast'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

interface ProjectDetailResponse {
  id: string
  companyId: string
  name: string
  slug: string
  description?: string
  supportEmailAddress: string
  settings: {
    assignmentMode: 'Manual' | 'AutoRoundRobin' | 'Unassigned'
    defaultLanguage?: string
    allowUserLanguageOverride: boolean
    staleTicketDays?: number
    smtp?: {
      host: string
      port: number
      username: string
      useSsl: boolean
      fromName?: string
      fromEmail?: string
      hasPassword?: boolean
    }
    imap?: {
      host: string
      port: number
      username: string
      useSsl: boolean
      hasPassword?: boolean
    }
    ticketId: {
      prefix: string
      minLength: number
      maxLength: number
      format: 'Numeric' | 'Alphanumeric' | 'DateNumeric'
      subjectTemplate: string
      startingNumber?: number
      useRandomNumbers?: boolean
    }
    spam?: {
      autoDenyThreshold: number
      flagThreshold: number
      autoDenyEnabled: boolean
    }
    autoReply?: {
      enabled: boolean
      subjectTemplate: string
      bodyTemplate: string
    }
    contactForm?: {
      enabled: boolean
      systemSenderEmails: string[]
      emailLabel: string
      nameLabel: string
      messageLabel: string
      subjectLabel?: string
    }
    emailSignature?: {
      enabled: boolean
      signatureHtml: string
      allowUserOverride: boolean
    }
  }
}

function getMaxCapacity(format: string, maxLength: number): number {
  if (format === 'Alphanumeric') return Math.pow(34, maxLength) // 0-9 + A-Z minus I,O
  if (format === 'DateNumeric') return Math.pow(10, Math.max(maxLength - 6, 2)) * 365 * 100 // rough estimate
  return Math.pow(10, maxLength) // Numeric
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function ProjectSettingsPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string }
  const { companyId } = useCurrentUser()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', companyId, projectId],
    queryFn: () => api.get<ProjectDetailResponse>(`/api/v1/companies/${companyId}/projects/${projectId}`),
    enabled: !!companyId && !!projectId,
  })

  // Ticket ID settings
  const [prefix, setPrefix] = useState('')
  const [minLength, setMinLength] = useState(3)
  const [maxLength, setMaxLength] = useState(6)
  const [format, setFormat] = useState<string>('Numeric')
  const [subjectTemplate, setSubjectTemplate] = useState('{ProjectName} - Ticket {TicketId}')
  const [startingNumber, setStartingNumber] = useState(0)
  const [useRandomNumbers, setUseRandomNumbers] = useState(false)

  // SMTP settings (outgoing)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(465)
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpUseSsl, setSmtpUseSsl] = useState(true)
  const [smtpFromName, setSmtpFromName] = useState('')
  const [smtpFromEmail, setSmtpFromEmail] = useState('')

  // Stale ticket threshold
  const [staleTicketDays, setStaleTicketDays] = useState(5)

  // IMAP settings (incoming)
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState(993)
  const [imapUsername, setImapUsername] = useState('')
  const [imapPassword, setImapPassword] = useState('')
  const [imapUseSsl, setImapUseSsl] = useState(true)

  // Contact form parser
  const [cfEnabled, setCfEnabled] = useState(false)
  const [cfSenderEmails, setCfSenderEmails] = useState('')
  const [cfEmailLabel, setCfEmailLabel] = useState('Email')
  const [cfNameLabel, setCfNameLabel] = useState('Name')
  const [cfMessageLabel, setCfMessageLabel] = useState('Message')
  const [cfSubjectLabel, setCfSubjectLabel] = useState('')

  // Email Signature
  const [sigEnabled, setSigEnabled] = useState(false)
  const [sigHtml, setSigHtml] = useState('')
  const [sigAllowUserOverride, setSigAllowUserOverride] = useState(true)

  // Spam settings
  const [spamAutoDenyEnabled, setSpamAutoDenyEnabled] = useState(false)
  const [spamAutoDenyThreshold, setSpamAutoDenyThreshold] = useState(80)
  const [spamFlagThreshold, setSpamFlagThreshold] = useState(50)

  // Auto-reply
  const [arEnabled, setArEnabled] = useState(false)
  const [arSubject, setArSubject] = useState('Re: {TicketSubject}')
  const [arBody, setArBody] = useState('<p>Hi {CustomerName},</p><p>We\'ve received your message and created ticket <strong>{TicketId}</strong>. Our team will get back to you shortly.</p><p>Thanks,<br/>{ProjectName} Support</p>')

  // Assignment
  const [assignmentMode, setAssignmentMode] = useState<string>('Manual')

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Connection test state
  const [imapTestResult, setImapTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [imapTesting, setImapTesting] = useState(false)
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [smtpTesting, setSmtpTesting] = useState(false)

  useEffect(() => {
    if (project) {
      const s = project.settings
      setAssignmentMode(s.assignmentMode)
      setPrefix(s.ticketId.prefix)
      setMinLength(s.ticketId.minLength)
      setMaxLength(s.ticketId.maxLength)
      setFormat(s.ticketId.format)
      setSubjectTemplate(s.ticketId.subjectTemplate)
      setStartingNumber(s.ticketId.startingNumber || 0)
      setUseRandomNumbers(s.ticketId.useRandomNumbers || false)
      if (s.smtp) {
        setSmtpHost(s.smtp.host)
        setSmtpPort(s.smtp.port)
        setSmtpUsername(s.smtp.username)
        setSmtpUseSsl(s.smtp.useSsl)
        setSmtpFromName(s.smtp.fromName || '')
        setSmtpFromEmail(s.smtp.fromEmail || '')
      }
      if (s.imap) {
        setImapHost(s.imap.host)
        setImapPort(s.imap.port)
        setImapUsername(s.imap.username)
        setImapUseSsl(s.imap.useSsl)
      }
      if (s.staleTicketDays) setStaleTicketDays(s.staleTicketDays)
      if (s.spam) {
        setSpamAutoDenyEnabled(s.spam.autoDenyEnabled)
        setSpamAutoDenyThreshold(s.spam.autoDenyThreshold)
        setSpamFlagThreshold(s.spam.flagThreshold)
      }
      if (s.autoReply) {
        setArEnabled(s.autoReply.enabled)
        setArSubject(s.autoReply.subjectTemplate)
        setArBody(s.autoReply.bodyTemplate)
      }
      if (s.contactForm) {
        setCfEnabled(s.contactForm.enabled)
        setCfSenderEmails(s.contactForm.systemSenderEmails.join(', '))
        setCfEmailLabel(s.contactForm.emailLabel)
        setCfNameLabel(s.contactForm.nameLabel)
        setCfMessageLabel(s.contactForm.messageLabel)
        setCfSubjectLabel(s.contactForm.subjectLabel || '')
      }
      if (s.emailSignature) {
        setSigEnabled(s.emailSignature.enabled)
        setSigHtml(s.emailSignature.signatureHtml)
        setSigAllowUserOverride(s.emailSignature.allowUserOverride)
      }
    }
  }, [project])

  const updateSettings = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch<ProjectDetailResponse>(`/api/v1/companies/${companyId}/projects/${projectId}/settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSaved(true)
      setError(null)
      // Trigger email poll if email settings were changed
      if (imapHost || smtpHost) {
        api.post('/api/v1/system/trigger-poll').catch(() => {})
      }
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (minLength < 3) {
      setError(t('projectSettings.errorMinLength'))
      return
    }
    if (maxLength < minLength) {
      setError(t('projectSettings.errorMaxLength'))
      return
    }

    const data: Record<string, unknown> = {
      assignmentMode,
      ticketId: { prefix, minLength, maxLength, format, subjectTemplate, startingNumber, useRandomNumbers },
    }

    // Only send SMTP if host is filled
    if (smtpHost) {
      data.smtp = {
        host: smtpHost,
        port: smtpPort,
        username: smtpUsername,
        password: smtpPassword,
        useSsl: smtpUseSsl,
        fromName: smtpFromName || undefined,
        fromEmail: smtpFromEmail || undefined,
      }
    }

    // Only send IMAP if host is filled
    if (imapHost) {
      data.imap = {
        host: imapHost,
        port: imapPort,
        username: imapUsername,
        password: imapPassword,
        useSsl: imapUseSsl,
      }
    }

    // Contact form settings
    data.spam = {
      autoDenyEnabled: spamAutoDenyEnabled,
      autoDenyThreshold: spamAutoDenyThreshold,
      flagThreshold: spamFlagThreshold,
    }

    data.autoReply = {
      enabled: arEnabled,
      subjectTemplate: arSubject,
      bodyTemplate: arBody,
    }

    data.contactForm = {
      enabled: cfEnabled,
      systemSenderEmails: cfSenderEmails.split(',').map((e: string) => e.trim()).filter(Boolean),
      emailLabel: cfEmailLabel,
      nameLabel: cfNameLabel,
      messageLabel: cfMessageLabel,
      subjectLabel: cfSubjectLabel || undefined,
    }

    data.staleTicketDays = staleTicketDays

    data.emailSignature = {
      enabled: sigEnabled,
      signatureHtml: sigHtml,
      allowUserOverride: sigAllowUserOverride,
    }

    updateSettings.mutate(data)
  }

  const handleTestImap = async () => {
    setImapTesting(true)
    setImapTestResult(null)
    try {
      const result = await api.post<{ success: boolean; message: string }>(
        `/api/v1/companies/${companyId}/projects/${projectId}/test-imap`,
        { host: imapHost, port: imapPort, username: imapUsername, password: imapPassword, useSsl: imapUseSsl }
      )
      setImapTestResult(result)
    } catch (err: unknown) {
      setImapTestResult({ success: false, message: err instanceof Error ? err.message : t('projectSettings.testFailed') })
    } finally {
      setImapTesting(false)
    }
  }

  const handleTestSmtp = async () => {
    setSmtpTesting(true)
    setSmtpTestResult(null)
    try {
      const result = await api.post<{ success: boolean; message: string }>(
        `/api/v1/companies/${companyId}/projects/${projectId}/test-smtp`,
        { host: smtpHost, port: smtpPort, username: smtpUsername, password: smtpPassword, useSsl: smtpUseSsl }
      )
      setSmtpTestResult(result)
    } catch (err: unknown) {
      setSmtpTestResult({ success: false, message: err instanceof Error ? err.message : t('projectSettings.testFailed') })
    } finally {
      setSmtpTesting(false)
    }
  }

  const capacity = getMaxCapacity(format, maxLength)
  const isLowCapacity = format === 'Numeric' && minLength === maxLength && maxLength <= 3

  // Example preview
  const exampleId = (() => {
    if (format === 'Alphanumeric') {
      // Show a realistic alphanumeric example like "A7K" or "B2M4"
      const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
      let sample = ''
      const seed = [10, 7, 20, 4, 28, 15] // A, 7, K, 4, S, F
      for (let i = 0; i < minLength; i++) {
        sample += chars[seed[i % seed.length]]
      }
      return prefix ? `${prefix}-${sample}` : sample
    }
    if (format === 'DateNumeric') {
      const now = new Date()
      const yy = String(now.getFullYear()).slice(2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const numPart = '01'.padStart(Math.max(minLength - 6, 2), '0')
      return prefix ? `${prefix}-${yy}${mm}${dd}-${numPart}` : `${yy}${mm}${dd}-${numPart}`
    }
    // Numeric
    if (useRandomNumbers) {
      const min = startingNumber || Math.pow(10, minLength - 1)
      const sample = String(min + Math.floor(Math.random() * 100)).padStart(minLength, '0')
      return prefix ? `${prefix}-${sample}` : sample
    }
    const nextNum = startingNumber > 0 ? startingNumber : 1
    const padded = String(nextNum).padStart(minLength, '0')
    return prefix ? `${prefix}-${padded}` : padded
  })()

  const exampleSubject = subjectTemplate
    .replace('{ProjectName}', project?.name || 'My Project')
    .replace('{TicketId}', exampleId)
    .replace('{TicketNumber}', '1')

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return <p className="text-muted-foreground">{t('projectSettings.projectNotFound')}</p>
  }

  if (!hasPermission('Projects.Settings')) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold mb-2">{t('common.noPermission', 'Access Denied')}</h2>
        <p className="text-muted-foreground">{t('common.noPermissionDesc', 'You do not have permission to access project settings.')}</p>
        <Link to="/projects" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t('projectSettings.backToProjects')}
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <Link to="/projects" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('projectSettings.backToProjects')}
        </Link>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('projectSettings.title')}</h2>
        <p className="mt-1 text-muted-foreground">{project.name}</p>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
      {saved && <Toast message={t('projectSettings.saved')} type="success" onClose={() => setSaved(false)} />}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Ticket ID Configuration */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('projectSettings.ticketIdConfig')}</h3>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('projectSettings.ticketIdPrefix')}</label>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="SUP"
                />
                <p className="text-xs text-muted-foreground">{t('projectSettings.ticketIdPrefixHelp')}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('projectSettings.format')}</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Numeric">{t('projectSettings.formatNumeric')}</option>
                  <option value="Alphanumeric">{t('projectSettings.formatAlphanumeric')}</option>
                  <option value="DateNumeric">{t('projectSettings.formatDateNumeric')}</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('projectSettings.ticketIdMinLength')}</label>
                <Input
                  type="number"
                  min={3}
                  max={12}
                  value={minLength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 3
                    setMinLength(Math.max(3, val))
                    if (val > maxLength) setMaxLength(val)
                  }}
                />
                <p className="text-xs text-muted-foreground">{t('projectSettings.ticketIdMinLengthHelp')}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('projectSettings.ticketIdMaxLength')}</label>
                <Input
                  type="number"
                  min={minLength}
                  max={12}
                  value={maxLength}
                  onChange={(e) => setMaxLength(Math.max(minLength, parseInt(e.target.value) || minLength))}
                />
                <p className="text-xs text-muted-foreground">{t('projectSettings.ticketIdMaxLengthHelp', { capacity: formatNumber(capacity) })}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {format === 'Numeric' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Starting Number</label>
                <Input
                  type="number"
                  min={0}
                  value={startingNumber}
                  onChange={(e) => setStartingNumber(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <p className="text-xs text-muted-foreground">New tickets will never have a number below this value. Leave at 0 to start from 1.</p>
              </div>
              )}
              {format === 'Numeric' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Number Assignment</label>
                <div className="flex items-center gap-3 h-10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRandomNumbers}
                      onChange={(e) => setUseRandomNumbers(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">Use random ticket numbers</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {useRandomNumbers
                    ? `Random numbers between ${startingNumber || Math.pow(10, minLength - 1)} and ${'9'.repeat(maxLength)}`
                    : 'Sequential numbers (1, 2, 3, ...)'}
                </p>
              </div>
              )}
            </div>

            {/* Capacity warning */}
            {isLowCapacity && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{t('projectSettings.lowCapacityWarning')}</p>
                  <p>{t('projectSettings.lowCapacityWarningDetail', { length: maxLength, capacity: formatNumber(capacity) })}</p>
                </div>
              </div>
            )}

            {/* Subject template */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('projectSettings.subjectTemplate')}</label>
              <Input
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                placeholder="{ProjectName} - Ticket {TicketId}"
              />
              <p className="text-xs text-muted-foreground">
                {t('projectSettings.availableVariables')} <code className="rounded bg-muted px-1">{'{ProjectName}'}</code> <code className="rounded bg-muted px-1">{'{TicketId}'}</code> <code className="rounded bg-muted px-1">{'{TicketNumber}'}</code>
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('projectSettings.preview')}</p>
              <p className="text-sm">{t('projectSettings.previewTicketId')} <span className="font-mono font-medium">{exampleId}</span></p>
              <p className="text-sm">{t('projectSettings.previewSubject')} <span className="font-medium">{exampleSubject}</span></p>
            </div>
          </div>
        </div>

        {/* Assignment Mode */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('projectSettings.assignmentMode')}</h3>
          <div className="space-y-3">
            {[
              { value: 'Manual', label: t('projectSettings.assignmentManual'), desc: t('projectSettings.assignmentManualDesc') },
              { value: 'AutoRoundRobin', label: t('projectSettings.assignmentAutoRoundRobin'), desc: t('projectSettings.assignmentAutoRoundRobinDesc') },
              { value: 'Unassigned', label: t('projectSettings.assignmentUnassigned'), desc: t('projectSettings.assignmentUnassignedDesc') },
            ].map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50">
                <input
                  type="radio"
                  name="assignmentMode"
                  value={opt.value}
                  checked={assignmentMode === opt.value}
                  onChange={(e) => setAssignmentMode(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">{t('projectSettings.staleTicketThreshold')}</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={90}
                value={staleTicketDays}
                onChange={(e) => setStaleTicketDays(Math.max(1, parseInt(e.target.value) || 5))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">{t('projectSettings.staleTicketDays')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('projectSettings.staleTicketDesc')}</p>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('projectSettings.email')}</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('projectSettings.emailDesc')}
          </p>

          {/* IMAP - Incoming */}
          <div className="mb-6">
            <h4 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-5 shrink-0 items-center justify-center rounded bg-blue-100 px-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('projectSettings.imapIncomingBadge')}</span>
              {t('projectSettings.imapIncoming')}
            </h4>
            <div className="space-y-3 pl-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.imapHost')}</label>
                  <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="mail.mxrouting.net" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.imapPort')}</label>
                  <Input type="number" value={imapPort} onChange={(e) => setImapPort(parseInt(e.target.value) || 993)} />
                  <p className="text-xs text-muted-foreground">{t('projectSettings.imapPortHelp')}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.smtpUsername')}</label>
                  <Input value={imapUsername} onChange={(e) => setImapUsername(e.target.value)} placeholder="support@yourdomain.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.smtpPassword')}</label>
                  <PasswordInput value={imapPassword} onChange={(e) => setImapPassword(e.target.value)} placeholder={project?.settings?.imap?.hasPassword ? t('projectSettings.passwordSavedPlaceholder') : t('projectSettings.enterPassword')} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="imapSsl" checked={imapUseSsl} onChange={(e) => setImapUseSsl(e.target.checked)} />
                  <label htmlFor="imapSsl" className="text-sm font-medium">{t('projectSettings.smtpUseSsl')}</label>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleTestImap} disabled={imapTesting || !imapHost}>
                  {imapTesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  {t('projectSettings.testConnection')}
                </Button>
              </div>
              {imapTestResult && (
                <p className={`text-xs ${imapTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {imapTestResult.message}
                </p>
              )}
            </div>
          </div>

          {/* SMTP - Outgoing */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-5 shrink-0 items-center justify-center rounded bg-green-100 px-1.5 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('projectSettings.smtpOutgoingBadge')}</span>
              {t('projectSettings.smtpOutgoing')}
            </h4>
            <div className="space-y-3 pl-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.smtpHost')}</label>
                  <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="mail.mxrouting.net" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.smtpPort')}</label>
                  <Input type="number" value={smtpPort} onChange={(e) => setSmtpPort(parseInt(e.target.value) || 465)} />
                  <p className="text-xs text-muted-foreground">{t('projectSettings.smtpPortHelp')}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.smtpUsername')}</label>
                  <Input value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="support@yourdomain.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.smtpPassword')}</label>
                  <PasswordInput value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={project?.settings?.smtp?.hasPassword ? t('projectSettings.passwordSavedPlaceholder') : t('projectSettings.enterPassword')} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="smtpSsl" checked={smtpUseSsl} onChange={(e) => setSmtpUseSsl(e.target.checked)} />
                  <label htmlFor="smtpSsl" className="text-sm font-medium">{t('projectSettings.smtpUseSsl')}</label>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleTestSmtp} disabled={smtpTesting || !smtpHost}>
                  {smtpTesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  {t('projectSettings.testConnection')}
                </Button>
              </div>
              {smtpTestResult && (
                <p className={`text-xs ${smtpTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {smtpTestResult.message}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.smtpFromNameOptional')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></label>
                  <Input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} placeholder={t('projectSettings.smtpFromNamePlaceholder')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('projectSettings.smtpFromEmailOptional')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></label>
                  <Input value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} placeholder={t('projectSettings.smtpFromEmailPlaceholder')} />
                  <p className="text-xs text-muted-foreground">{t('projectSettings.smtpFromEmailHelp')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spam Settings */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Spam Protection</h3>
              <p className="text-sm text-muted-foreground">
                Configure how spam emails are handled. Emails are scored 0-100 based on heuristic analysis.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={spamAutoDenyEnabled} onChange={(e) => setSpamAutoDenyEnabled(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm font-medium">Auto-deny spam</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Flag Threshold</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={spamFlagThreshold}
                onChange={(e) => setSpamFlagThreshold(parseInt(e.target.value) || 50)}
              />
              <p className="text-xs text-muted-foreground">Emails with a score at or above this are flagged with a warning indicator.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Auto-Deny Threshold</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={spamAutoDenyThreshold}
                onChange={(e) => setSpamAutoDenyThreshold(parseInt(e.target.value) || 80)}
                disabled={!spamAutoDenyEnabled}
              />
              <p className="text-xs text-muted-foreground">Emails with a score at or above this are automatically denied (requires auto-deny enabled).</p>
            </div>
          </div>
        </div>

        {/* Email Signature */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Email Signature</h3>
              <p className="text-sm text-muted-foreground">
                Automatically appended to all outgoing email replies.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sigEnabled} onChange={(e) => setSigEnabled(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm font-medium">{sigEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {sigEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Signature HTML</label>
                <textarea
                  value={sigHtml}
                  onChange={(e) => setSigHtml(e.target.value)}
                  rows={4}
                  placeholder="<p>Best regards,<br/>The Support Team</p>"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  HTML is supported. This signature will be appended after a "—" separator in every outgoing email.
                </p>
              </div>

              {sigHtml && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sigHtml }} />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="sigAllowOverride" checked={sigAllowUserOverride} onChange={(e) => setSigAllowUserOverride(e.target.checked)} />
                <label htmlFor="sigAllowOverride" className="text-sm font-medium">Allow users to override with their own signature</label>
              </div>
            </div>
          )}
        </div>

        {/* Auto-Reply */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Auto-Reply</h3>
              <p className="text-sm text-muted-foreground">
                Automatically send an acknowledgment email to customers when a ticket is created.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={arEnabled} onChange={(e) => setArEnabled(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm font-medium">{arEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {arEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject Template</label>
                <Input
                  value={arSubject}
                  onChange={(e) => setArSubject(e.target.value)}
                  placeholder="Re: {TicketSubject}"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: <code className="rounded bg-muted px-1">{'{TicketSubject}'}</code> <code className="rounded bg-muted px-1">{'{TicketId}'}</code> <code className="rounded bg-muted px-1">{'{ProjectName}'}</code>
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Body Template (HTML)</label>
                <textarea
                  value={arBody}
                  onChange={(e) => setArBody(e.target.value)}
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: <code className="rounded bg-muted px-1">{'{CustomerName}'}</code> <code className="rounded bg-muted px-1">{'{CustomerEmail}'}</code> <code className="rounded bg-muted px-1">{'{TicketId}'}</code> <code className="rounded bg-muted px-1">{'{TicketSubject}'}</code> <code className="rounded bg-muted px-1">{'{ProjectName}'}</code>
                </p>
              </div>
              {arBody && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: arBody.replace('{CustomerName}', 'Jane').replace('{TicketId}', '00001').replace('{TicketSubject}', 'Example Ticket').replace('{ProjectName}', project?.name || 'Project').replace('{CustomerEmail}', 'jane@example.com') }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact Form Parser */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('projectSettings.contactFormParser')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('projectSettings.contactFormParserDesc')}
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfEnabled} onChange={(e) => setCfEnabled(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm font-medium">{cfEnabled ? t('common.enabled') : t('common.disabled')}</span>
            </label>
          </div>

          {cfEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('projectSettings.contactFormSenderEmails')}</label>
                <Input
                  value={cfSenderEmails}
                  onChange={(e) => setCfSenderEmails(e.target.value)}
                  placeholder={t('projectSettings.contactFormSenderEmailsPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('projectSettings.contactFormSenderEmailsHelp')}
                </p>
              </div>

              <div className="rounded-md border bg-muted/50 p-4">
                <p className="mb-3 text-sm font-medium">{t('projectSettings.contactFormFieldLabels')}</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t('projectSettings.contactFormFieldLabelsDesc')}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('projectSettings.contactFormEmailLabel')}</label>
                    <Input value={cfEmailLabel} onChange={(e) => setCfEmailLabel(e.target.value)} placeholder="Email" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('projectSettings.contactFormNameLabel')}</label>
                    <Input value={cfNameLabel} onChange={(e) => setCfNameLabel(e.target.value)} placeholder="Name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('projectSettings.contactFormMessageLabel')}</label>
                    <Input value={cfMessageLabel} onChange={(e) => setCfMessageLabel(e.target.value)} placeholder="Message" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('projectSettings.contactFormSubjectLabel')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></label>
                    <Input value={cfSubjectLabel} onChange={(e) => setCfSubjectLabel(e.target.value)} placeholder="Subject" />
                  </div>
                </div>
              </div>

              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('projectSettings.contactFormExampleTitle')}</p>
                <pre className="text-xs font-mono whitespace-pre-wrap">
{`${cfEmailLabel}: customer@example.com
${cfNameLabel}: Jane Doe${cfSubjectLabel ? `\n${cfSubjectLabel}: Help with my account` : ''}
${cfMessageLabel}: I'm having trouble logging in to my account.`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex gap-2">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('projectSettings.saveSettings')}
          </Button>
        </div>
      </form>

      {/* Project Members */}
      {hasPermission('Members.View') && (
        <ProjectMembersSection companyId={companyId!} projectId={projectId} canManage={hasPermission('Members.Edit')} />
      )}

      {/* API Keys */}
      <ApiKeysSection companyId={companyId!} projectId={projectId} />
    </>
  )
}

function ProjectMembersSection({ companyId, projectId, canManage }: { companyId: string; projectId: string; canManage: boolean }) {
  const queryClient = useQueryClient()

  interface ProjectMemberRole { roleId: string; roleName: string; isCompanyWide: boolean }
  interface ProjectMember { userId: string; email: string; displayName: string; avatarUrl?: string; isOwner: boolean; roles: ProjectMemberRole[] }

  const { data: members, isLoading } = useQuery({
    queryKey: ['projectMembers', companyId, projectId],
    queryFn: () => api.get<ProjectMember[]>(`/api/v1/companies/${companyId}/projects/${projectId}/members`),
    enabled: !!companyId && !!projectId,
  })

  const { data: companyMembers } = useQuery({
    queryKey: ['companyMembers', companyId],
    queryFn: () => api.get<{ id: string; email: string; displayName: string }[]>(`/api/v1/users/company/${companyId}`),
    enabled: !!companyId && canManage,
  })

  const { data: roles } = useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => api.get<{ id: string; name: string }[]>(`/api/v1/companies/${companyId}/roles`),
    enabled: !!companyId && canManage,
  })

  const addMember = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/v1/users/${userId}/role-assignments?companyId=${companyId}`, { roleId: '', projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', companyId, projectId] })
    },
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/v1/users/${userId}/role-assignments?companyId=${companyId}&projectId=${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', companyId, projectId] })
      queryClient.invalidateQueries({ queryKey: ['companyMembers', companyId] })
    },
  })

  const removeProjectRole = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      api.delete(`/api/v1/users/${userId}/role-assignments?companyId=${companyId}&roleId=${roleId}&projectId=${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', companyId, projectId] })
    },
  })

  const assignProjectRole = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      api.post(`/api/v1/users/${userId}/role-assignments?companyId=${companyId}`, { roleId, projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', companyId, projectId] })
    },
  })

  const memberIds = new Set(members?.map(m => m.userId) ?? [])
  const availableMembers = companyMembers?.filter(m => !memberIds.has(m.id)) ?? []

  return (
    <div className="mt-8 rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Project Members</h3>
            <p className="text-sm text-muted-foreground">Users with access to this project</p>
          </div>
        </div>
        {canManage && availableMembers.length > 0 && (
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) addMember.mutate(e.target.value)
              e.target.value = ''
            }}
          >
            <option value="">+ Add Member</option>
            {availableMembers.map(m => (
              <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

      {!isLoading && members && members.length > 0 && (
        <div className="divide-y rounded-md border">
          {members.map(member => (
            <div key={member.userId} className="px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{member.displayName || member.email}</p>
                    {member.isOwner && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        <Shield className="h-3 w-3" /> Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {canManage && !member.isOwner && roles && roles.length > 0 && (
                    <select
                      className="h-6 rounded border border-input bg-background px-1 text-xs"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) assignProjectRole.mutate({ userId: member.userId, roleId: e.target.value })
                        e.target.value = ''
                      }}
                    >
                      <option value="">+ Role</option>
                      {roles.filter(r => !member.roles.some(mr => mr.roleId === r.id)).map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  )}
                  {canManage && !member.isOwner && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 text-red-600"
                      title="Remove from project"
                      onClick={() => removeMember.mutate(member.userId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {member.roles.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-0">
                  {member.roles.map(r => (
                    <span key={r.roleId} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${r.isCompanyWide ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {r.roleName}
                      {r.isCompanyWide && <span className="opacity-60">(company)</span>}
                      {canManage && !member.isOwner && !r.isCompanyWide && (
                        <button
                          onClick={() => removeProjectRole.mutate({ userId: member.userId, roleId: r.roleId })}
                          className="ml-0.5 hover:text-red-600"
                          title={`Remove ${r.roleName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!members || members.length === 0) && (
        <p className="text-sm text-muted-foreground">No members assigned to this project yet.</p>
      )}
    </div>
  )
}

// Separate component to keep the main component clean
function ApiKeysSection({ companyId, projectId }: { companyId: string; projectId: string }) {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  interface ApiKeyResponse {
    id: string; name: string; keyPrefix: string; isRevoked: boolean; createdOnDateTime: number
  }

  const { data: keys } = useQuery({
    queryKey: ['apiKeys', companyId, projectId],
    queryFn: () => api.get<ApiKeyResponse[]>(`/api/v1/companies/${companyId}/projects/${projectId}/api-keys`),
    enabled: !!companyId && !!projectId,
  })

  const createKey = useMutation({
    mutationFn: (name: string) =>
      api.post<ApiKeyResponse & { fullKey: string }>(`/api/v1/companies/${companyId}/projects/${projectId}/api-keys`, { name }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
      setNewKey(data.fullKey)
      setShowCreate(false)
      setKeyName('')
    },
  })

  const revokeKey = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/companies/${companyId}/projects/${projectId}/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
    },
  })

  const copyKey = () => {
    if (newKey) {
      copyToClipboard(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (ts: number) => ts ? new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <div className="mt-8 rounded-lg border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Generate API keys to submit tickets directly via the API instead of email.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} disabled={showCreate}>
          <Plus className="mr-1 h-3 w-3" /> Create Key
        </Button>
      </div>

      {/* New key display (shown once after creation) */}
      {newKey && (
        <div className="mb-4 rounded-md border border-green-500/50 bg-green-50 dark:bg-green-900/10 p-4">
          <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
            API key created! Copy it now — it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono border select-all">{newKey}</code>
            <Button size="sm" variant="outline" onClick={copyKey}>
              <Copy className="mr-1 h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Use this key in the <code className="rounded bg-muted px-1">X-Api-Key</code> header when calling <code className="rounded bg-muted px-1">POST /api/v1/public/intake</code>
          </p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setNewKey(null)}>Dismiss</Button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 flex items-center gap-2">
          <Input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name (e.g. Production, Staging)"
            className="flex-1"
            autoFocus
          />
          <Button size="sm" onClick={() => createKey.mutate(keyName)} disabled={!keyName.trim() || createKey.isPending}>
            {createKey.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Generate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
        </div>
      )}

      {/* Keys list */}
      {keys && keys.length > 0 ? (
        <div className="divide-y rounded-md border">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{k.name}</span>
                  {k.isRevoked && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">Revoked</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  <code className="font-mono">{k.keyPrefix}...</code> &middot; Created {formatDate(k.createdOnDateTime)}
                </p>
              </div>
              {!k.isRevoked && (
                <Button
                  size="sm" variant="outline" className="text-red-600 h-7"
                  onClick={() => revokeKey.mutate(k.id)}
                  disabled={revokeKey.isPending}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : !showCreate && (
        <p className="text-sm text-muted-foreground">No API keys yet. Create one to enable direct ticket submission via API.</p>
      )}

      {/* Usage example */}
      {keys && keys.length > 0 && (
        <div className="mt-4 rounded-md border bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Usage example:</p>
          <pre className="text-xs font-mono whitespace-pre-wrap">{`curl -X POST http://localhost:5100/api/v1/public/intake \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_KEY" \\
  -d '{"email":"customer@example.com","name":"Jane","message":"Help!"}'`}</pre>
        </div>
      )}
    </div>
  )
}
