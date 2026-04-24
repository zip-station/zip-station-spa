export interface UserResponse {
  id: string
  firebaseUserId: string
  email: string
  displayName: string
  avatarUrl?: string
  roleAssignments: RoleAssignmentResponse[]
  isOwner: boolean
  isDisabled: boolean
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface RoleAssignmentResponse {
  companyId: string
  roleId: string
  roleName?: string
  projectId?: string
}

export interface ProjectResponse {
  id: string
  companyId: string
  name: string
  slug: string
  description?: string
  logoUrl?: string
  supportEmailAddress: string
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface CreateProjectRequest {
  name: string
  slug: string
  description?: string
  supportEmailAddress: string
}

export type KanbanCardType = 'Feature' | 'Bug' | 'Improvement' | 'TechDebt'
export type KanbanPriority = 'Low' | 'Normal' | 'High' | 'Urgent'
export type KanbanCommentType = 'User' | 'System'

export interface KanbanColumnResponse {
  id: string
  name: string
  color?: string
  position: number
}

export interface KanbanBoardResponse {
  id: string
  companyId: string
  projectId: string
  columns: KanbanColumnResponse[]
  resolvedColumnId: string
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface KanbanCardResponse {
  id: string
  companyId: string
  projectId: string
  boardId: string
  cardNumber: number
  columnId: string
  position: number
  title: string
  descriptionHtml?: string
  type: KanbanCardType
  priority: KanbanPriority
  tags: string[]
  assignedToUserId?: string
  linkedTicketIds: string[]
  resolvedOnDateTime: number
  createdOnDateTime: number
  updatedOnDateTime: number
  createdByUserId?: string
  updatedByUserId?: string
}

export interface KanbanCardCommentResponse {
  id: string
  cardId: string
  type: KanbanCommentType
  authorUserId?: string
  authorName?: string
  bodyHtml: string
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface TicketSummaryResponse {
  id: string
  ticketNumber: number
  subject: string
  status: string
  priority: string
  assignedToUserId?: string
  customerName?: string
  customerEmail?: string
}

export interface KanbanCardDetailResponse {
  card: KanbanCardResponse
  comments: KanbanCardCommentResponse[]
  linkedTickets: TicketSummaryResponse[]
}

export interface KanbanStorySummaryResponse {
  id: string
  projectId: string
  projectName?: string
  cardNumber: number
  title: string
  type: KanbanCardType
  priority: KanbanPriority
  columnId: string
  columnName?: string
  assignedToUserId?: string
}

export interface CreateKanbanCardRequest {
  columnId: string
  title: string
  descriptionHtml?: string
  type: KanbanCardType
  priority: KanbanPriority
  tags?: string[]
  assignedToUserId?: string
  linkedTicketIds?: string[]
}

export interface UpdateKanbanCardRequest {
  title?: string
  descriptionHtml?: string
  type?: KanbanCardType
  priority?: KanbanPriority
  tags?: string[]
  assignedToUserId?: string | null
  clearAssignee?: boolean
  columnId?: string
  position?: number
}

export interface UpdateKanbanColumnsRequest {
  columns: Array<{ id?: string; name: string; color?: string }>
  resolvedColumnId: string
}
