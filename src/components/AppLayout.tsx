import { useState, type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Inbox, FolderOpen, Settings, Menu, X, LayoutDashboard, LogOut, Users, Mail, MessageSquare, ClipboardList, Bell, FileText, ChevronDown, HelpCircle, Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

const navItemDefs = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', href: '/', permission: 'Dashboard.View' as const },
  { icon: Inbox, labelKey: 'nav.tickets', href: '/tickets', permission: 'Tickets.View' as const },
  { icon: Mail, labelKey: 'nav.intake', href: '/intake', permission: 'Intake.View' as const },
  { icon: Users, labelKey: 'nav.customers', href: '/customers', permission: 'Customers.View' as const },
  { icon: FolderOpen, labelKey: 'nav.projects', href: '/projects', permission: 'Projects.View' as const },
  { icon: MessageSquare, labelKey: 'nav.cannedResponses', href: '/canned-responses', permission: 'CannedResponses.View' as const },
  { icon: Bell, labelKey: 'nav.alerts', href: '/alerts', permission: 'Alerts.View' as const },
  { icon: FileText, labelKey: 'nav.reports', href: '/reports', permission: 'Reports.View' as const },
  { icon: Shield, labelKey: 'nav.roles', href: '/roles', permission: 'Roles.View' as const },
  { icon: ClipboardList, labelKey: 'nav.auditLog', href: '/audit-log', permission: 'AuditLog.View' as const },
  { icon: Settings, labelKey: 'nav.settings', href: '/settings', permission: null },
] as const

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { companyId } = useCurrentUser()
  const { selectedProjectId, setSelectedProjectId, projects, hasMultipleProjects } = useSelectedProject()
  useKeyboardShortcuts()
  const { hasPermission } = usePermissions()

  const navItems = navItemDefs.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  )

  // Pending intake count for badge (filtered by project)
  const { data: pendingIntake } = useQuery({
    queryKey: ['intakePendingCount', companyId, selectedProjectId],
    queryFn: () => {
      const projectParam = selectedProjectId ? `&projectId=${selectedProjectId}` : ''
      return api.get<{ totalResultCount: number }>(`/api/v1/companies/${companyId}/intake?status=Pending&page=1&resultsPerPage=1${projectParam}`)
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  })
  const pendingIntakeCount = pendingIntake?.totalResultCount ?? 0

  // Open+Pending ticket count for badge (filtered by project)
  const { data: ticketCounts } = useQuery({
    queryKey: ['ticketBadgeCount', companyId, selectedProjectId],
    queryFn: () => {
      const projectParam = selectedProjectId ? `&projectId=${selectedProjectId}` : ''
      return api.get<{ totalResultCount: number }>(`/api/v1/companies/${companyId}/tickets?status=Open&status=Pending&page=1&resultsPerPage=1${projectParam}`)
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  })
  const openTicketCount = ticketCounts?.totalResultCount ?? 0

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md p-2 hover:bg-accent"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <h1 className="text-lg font-semibold">Zip Station</h1>
        <button onClick={signOut} className="rounded-md p-2 hover:bg-accent">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <div className="flex h-[calc(100vh-0px)] lg:h-screen">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r bg-background transition-transform duration-200 ease-in-out
            lg:relative lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="hidden items-center gap-2 border-b px-6 py-4 lg:flex">
            <Inbox className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Zip Station</span>
          </div>

          {/* Project selector */}
          {hasMultipleProjects && (
            <div className="border-b px-3 py-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('nav.project')}</label>
              <div className="relative">
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(e) => setSelectedProjectId(e.target.value || null)}
                  className="flex h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 py-1 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('nav.allProjects')}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}

          <nav className="mt-4 space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = item.href === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  {...(item.href === '/tickets' ? { search: {} } : {})}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.labelKey)}
                  {item.href === '/tickets' && openTicketCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-bold text-white">
                      {openTicketCount > 99 ? '99+' : openTicketCount}
                    </span>
                  )}
                  {item.href === '/intake' && pendingIntakeCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
                      {pendingIntakeCount > 99 ? '99+' : pendingIntakeCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          {user && (
            <div className="absolute bottom-0 left-0 right-0 border-t p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {user.displayName || user.email}
                  </p>
                  {user.displayName && (
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  )}
                </div>
                <button
                  onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
                  className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  title="Keyboard shortcuts (?)"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={signOut}
                  className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  title={t('common.signOut')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
