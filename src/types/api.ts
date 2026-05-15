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

export type MaxInstructionContext = 'enrichment' | 'reply' | 'code' | 'chat' | 'all'

export interface MaxSettings {
  enabled: boolean
  apiKeySet: boolean
  model: string
  projectContext?: string
  toneGuide?: string
  toneAvoid?: string
  autoSendEnabled: boolean
  autoSendThreshold: number
  autoSendCategories: string[]
}

export interface MaxInstructionResponse {
  id: string
  companyId: string
  projectId: string
  instruction: string
  contexts: string[]
  source: string
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface MaxInstructionRequest {
  instruction: string
  contexts: string[]
}

export interface MaxExampleReplyResponse {
  id: string
  companyId: string
  projectId: string
  replyText: string
  sourceTicketId?: string
  notes?: string
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface MaxExampleReplyRequest {
  replyText: string
  sourceTicketId?: string
  notes?: string
}

export interface MaxTestConnectionRequest {
  apiKey?: string
  model?: string
}

export interface MaxTestConnectionResponse {
  success: boolean
  message: string
}

export interface SetMaxApiKeyRequest {
  apiKey: string
}

export type MaxCategory = 'how_to' | 'bug' | 'feature_request' | 'billing' | 'account' | 'feedback' | 'spam' | 'unsure'
export type MaxActionType = 'draft_reply' | 'investigate' | 'merge_duplicate' | 'add_to_backlog' | 'no_action' | 'escalated' | 'flagged_question'
export type MaxTaskStatus = 'pending' | 'approved' | 'rejected' | 'auto_executed' | 'failed'

export interface MaxTicketEnrichmentResponse {
  id: string
  ticketId: string
  status: string
  category: string
  summary: string
  confidence: number
  duplicateOfTicketId?: string
  relatedTicketIds: string[]
  platform: string
  tags: string[]
  suggestedActionType: string
  suggestedDraft?: string
  suggestedNotes?: string
  reasoning?: string
  flaggedQuestion: boolean
  questionId?: string
  model: string
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface MaxTaskDetailsResponse {
  draft?: string
  notes?: string
  duplicateOfTicketId?: string
  suggestedTitle?: string
  suggestedKanbanType?: string
  questionId?: string
  linkToStoryCardNumber?: number
  linkToStoryTitle?: string
}

export interface MaxTaskResponse {
  id: string
  ticketId: string
  type: string
  status: string
  confidence: number
  details: MaxTaskDetailsResponse
  createdOnDateTime: number
  resolvedOnDateTime?: number
}

export interface MaxQuestionResponse {
  id: string
  sourceTicketId?: string
  question: string
  contextExcerpt?: string
  status: string
  answer?: string
  promotedToContext: boolean
  createdOnDateTime: number
  answeredOnDateTime?: number
}

export interface TicketMaxResponse {
  enrichment: MaxTicketEnrichmentResponse | null
  tasks: MaxTaskResponse[]
  questions: MaxQuestionResponse[]
}

export interface MaxTaskWithTicketResponse {
  task: MaxTaskResponse
  ticketNumber: number
  ticketSubject: string
  customerName?: string
  customerEmail?: string
}

export interface MaxToneAnalyzerResponse {
  toneGuide?: string
  toneAvoid?: string
  recommendedExampleIndices: number[]
  replies: string[]
}

export interface MaxToneAnalyzerRequest {
  replyCount?: number
}
