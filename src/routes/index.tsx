import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router'
import { AppLayout } from '@/components/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { TicketsPage } from '@/pages/TicketsPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { IntakePage } from '@/pages/IntakePage'
import { CannedResponsesPage } from '@/pages/CannedResponsesPage'
import { AuditLogPage } from '@/pages/AuditLogPage'
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage'
import { CustomerDetailPage } from '@/pages/CustomerDetailPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { RolesPage } from '@/pages/RolesPage'
import { KanbanPage } from '@/pages/KanbanPage'
import { KanbanCardDetailPage } from '@/pages/KanbanCardDetailPage'

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const ticketsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tickets',
  component: TicketsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as string) || undefined,
    assigned: (search.assigned as string) || undefined,
    priority: (search.priority as string) || undefined,
    query: (search.query as string) || undefined,
    page: Number(search.page) || undefined,
  }),
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsPage,
})

const ticketDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tickets/$ticketId',
  component: TicketDetailPage,
})

const customersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customers',
  component: CustomersPage,
})

const intakeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/intake',
  component: IntakePage,
})

const cannedResponsesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/canned-responses',
  component: CannedResponsesPage,
})

const auditLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit-log',
  component: AuditLogPage,
})

const projectSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/settings',
  component: ProjectSettingsPage,
})

const customerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customers/$customerId',
  component: CustomerDetailPage,
})

const alertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/alerts',
  component: AlertsPage,
})

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
})

const rolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roles',
  component: RolesPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const kanbanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kanban',
  component: KanbanPage,
})

const kanbanCardDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kanban/stories/$storyNumber',
  component: KanbanCardDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    fromTicket: typeof search.fromTicket === 'string' ? search.fromTicket : undefined,
  }),
})

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  ticketsRoute,
  ticketDetailRoute,
  projectsRoute,
  customersRoute,
  customerDetailRoute,
  intakeRoute,
  cannedResponsesRoute,
  auditLogRoute,
  alertsRoute,
  rolesRoute,
  reportsRoute,
  projectSettingsRoute,
  settingsRoute,
  kanbanRoute,
  kanbanCardDetailRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
