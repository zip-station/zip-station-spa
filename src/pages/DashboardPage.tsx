import { Inbox, AlertTriangle, Clock, Timer, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

interface CapacityWarning {
  projectId: string
  projectName: string
  currentCount: number
  maxCapacity: number
  remaining: number
  usagePercent: number
}

interface TicketStats {
  open: number
  pending: number
  resolved: number
  closed: number
  total: number
  capacityWarnings?: CapacityWarning[]
}

interface ResponseTimeStats {
  avgResponseMinutes: number
  medianResponseMinutes: number
  totalTicketsAnalyzed: number
  totalWithResponses: number
  agents: { agentId: string; agentName: string; ticketsHandled: number; avgResponseMinutes: number }[]
}

function formatResponseTime(minutes: number): string {
  if (minutes <= 0) return '--'
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  const days = Math.floor(minutes / 1440)
  const hours = Math.round((minutes % 1440) / 60)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

const STATUS_COLORS = ['#3b82f6', '#eab308', '#22c55e', '#6b7280']

export function DashboardPage() {
  const { user } = useAuth()
  const { companyId } = useCurrentUser()
  const { selectedProjectId } = useSelectedProject()
  const { t } = useTranslation()

  const { data: stats } = useQuery({
    queryKey: ['ticketStats', companyId, selectedProjectId],
    queryFn: () => {
      const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : ''
      return api.get<TicketStats>(`/api/v1/companies/${companyId}/tickets/stats${projectParam}`)
    },
    enabled: !!companyId,
  })

  const { data: responseStats } = useQuery({
    queryKey: ['responseStats', companyId, selectedProjectId],
    queryFn: () => {
      const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : ''
      return api.get<ResponseTimeStats>(`/api/v1/companies/${companyId}/tickets/response-times${projectParam}`)
    },
    enabled: !!companyId,
  })

  const cards = [
    { title: t('dashboard.openTickets'), value: stats?.open ?? 0, desc: t('dashboard.awaitingResponse'), color: 'text-blue-600' },
    { title: t('dashboard.pending'), value: stats?.pending ?? 0, desc: t('dashboard.customerReplied'), color: 'text-yellow-600' },
    { title: t('dashboard.resolvedToday'), value: stats?.resolved ?? 0, desc: t('dashboard.closedTickets'), color: 'text-green-600' },
    { title: t('dashboard.avgResponse'), value: stats?.total ?? 0, desc: t('dashboard.allTickets'), color: 'text-foreground' },
  ]

  const pieData = stats && stats.total > 0 ? [
    { name: t('dashboard.open'), value: stats.open },
    { name: t('dashboard.pending'), value: stats.pending },
    { name: t('dashboard.resolved'), value: stats.resolved },
    { name: t('dashboard.closed'), value: stats.closed },
  ].filter(d => d.value > 0) : []

  const barData = stats ? [
    { name: t('dashboard.open'), count: stats.open, fill: '#3b82f6' },
    { name: t('dashboard.pending'), count: stats.pending, fill: '#eab308' },
    { name: t('dashboard.resolved'), count: stats.resolved, fill: '#22c55e' },
    { name: t('dashboard.closed'), count: stats.closed, fill: '#6b7280' },
  ] : []

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboard.title')}</h2>
        <p className="mt-1 text-muted-foreground">
          {t('dashboard.welcomeBack', { name: user?.displayName || user?.email?.split('@')[0] })}
        </p>
      </div>

      {/* Capacity warnings */}
      {stats?.capacityWarnings && stats.capacityWarnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {stats.capacityWarnings.map((w) => (
            <div key={w.projectId} className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t('dashboard.capacityWarning', { name: w.projectName })}</p>
                <p>{t('dashboard.capacityWarningDetail', { percent: w.usagePercent, current: w.currentCount.toLocaleString(), max: w.maxCapacity.toLocaleString(), remaining: w.remaining.toLocaleString() })}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {stats && stats.total > 0 && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Pie chart */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">{t('dashboard.ticketsByStatus')}</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar chart */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">{t('dashboard.ticketsByStatus')}</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Response Time Analytics */}
      {responseStats && responseStats.totalWithResponses > 0 && (
        <div className="mt-8 space-y-6">
          <h3 className="text-lg font-semibold">{t('dashboard.responseTimeTitle')}</h3>

          {/* Response time cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t('dashboard.avgResponseTime')}
              </div>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {formatResponseTime(responseStats.avgResponseMinutes)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('dashboard.acrossTickets', { count: responseStats.totalWithResponses })}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Timer className="h-4 w-4" />
                {t('dashboard.medianResponseTime')}
              </div>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {formatResponseTime(responseStats.medianResponseMinutes)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('dashboard.medianDesc')}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                {t('dashboard.ticketsAnalyzed')}
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {responseStats.totalTicketsAnalyzed}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('dashboard.withResponses', { count: responseStats.totalWithResponses })}
              </p>
            </div>
          </div>

          {/* Agent response time table */}
          {responseStats.agents.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="border-b px-6 py-4">
                <h4 className="text-sm font-semibold">{t('dashboard.agentResponseTimes')}</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-6 py-3 font-medium">{t('dashboard.agent')}</th>
                      <th className="px-6 py-3 font-medium text-right">{t('dashboard.avgTime')}</th>
                      <th className="px-6 py-3 font-medium text-right">{t('dashboard.ticketsHandled')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responseStats.agents.map((agent) => (
                      <tr key={agent.agentId} className="border-b last:border-b-0">
                        <td className="px-6 py-3 font-medium">{agent.agentName}</td>
                        <td className="px-6 py-3 text-right">{formatResponseTime(agent.avgResponseMinutes)}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground">{agent.ticketsHandled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {(!stats || stats.total === 0) && (
        <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('dashboard.noTicketsTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('dashboard.noTicketsDesc')}
          </p>
        </div>
      )}
    </>
  )
}
