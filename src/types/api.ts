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

/** The four always-available built-in story types. */
export type BuiltInCardType = 'Feature' | 'Bug' | 'Improvement' | 'TechDebt'
export const BUILTIN_CARD_TYPES: BuiltInCardType[] = ['Feature', 'Bug', 'Improvement', 'TechDebt']

/**
 * A card's story type: either a built-in name (e.g. 'Feature') or the id of a project-specific
 * custom type defined on the board (`KanbanBoardResponse.customCardTypes`).
 */
export type KanbanCardType = string
export type KanbanPriority = 'Low' | 'Normal' | 'High' | 'Urgent'
export type KanbanCommentType = 'User' | 'System'

export interface KanbanColumnResponse {
  id: string
  name: string
  color?: string
  position: number
}

/** A project-specific story type, in addition to the built-ins. */
export interface KanbanCardTypeResponse {
  id: string
  label: string
  color?: string
}

export interface KanbanBoardResponse {
  id: string
  companyId: string
  projectId: string
  columns: KanbanColumnResponse[]
  resolvedColumnId: string
  customCardTypes: KanbanCardTypeResponse[]
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
  linkedStoryIds: string[]
  resolvedOnDateTime: number
  createdOnDateTime: number
  updatedOnDateTime: number
  createdByUserId?: string
  updatedByUserId?: string
  externalSources: KanbanCardExternalSourceResponse[]
}

export type ExternalSourceType = 'Discord' | 'Link'

export interface KanbanCardExternalSourceResponse {
  type: ExternalSourceType
  url: string
  guildId?: string
  channelId?: string
  threadId?: string
  messageId?: string
  threadTitle?: string
  forumTags: string[]
  authorName?: string
  authorExternalId?: string
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
  linkedStories: KanbanStorySummaryResponse[]
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
  /** Custom story types to persist. Omit to leave the board's existing custom types unchanged. */
  cardTypes?: Array<{ id?: string; label: string; color?: string }>
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
  duplicateOfStoryId?: string
  duplicateOfStoryCardNumber?: number
  duplicateOfStoryTitle?: string
}

export interface MaxTaskResponse {
  id: string
  ticketId: string
  storyId?: string
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
  sourceStoryId?: string
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
  // Populated when task.storyId is null/empty — task targets a ticket.
  ticketNumber?: number
  ticketSubject?: string
  customerName?: string
  customerEmail?: string
  // Populated when task.storyId is set — task targets a kanban story.
  storyCardNumber?: number
  storyTitle?: string
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

export interface MaxQuestionWithSourceResponse {
  question: MaxQuestionResponse
  sourceType: 'ticket' | 'story'
  ticketNumber?: number
  ticketSubject?: string
  customerName?: string
  storyCardNumber?: number
  storyTitle?: string
}

export interface MaxQuestionAnswerRequest {
  answer: string
  promoteToContext: boolean
}

export interface PersonalAccessTokenResponse {
  id: string
  userId: string
  companyId: string
  name: string
  tokenPrefix: string
  isRevoked: boolean
  createdOnDateTime: number
  lastUsedOnDateTime: number
  expiresOnDateTime?: number
}

export interface PersonalAccessTokenCreatedResponse extends PersonalAccessTokenResponse {
  fullToken: string
}

export interface CreatePersonalAccessTokenRequest {
  name: string
  expiresOnDateTime?: number
}

// Discord intake — per-project bot + N (guild, channel) sources.
export interface DiscordSettings {
  enabled: boolean
  botTokenSet: boolean
  sources: DiscordSourceResponse[]
}

export interface DiscordSourceResponse {
  id: string
  name: string
  guildId: string
  channelId: string
  isForum: boolean
  /// null = "Auto — let Max decide"
  defaultCardType: KanbanCardType | null
  enabled: boolean
}

export interface DiscordSourceRequest {
  name: string
  guildId: string
  channelId: string
  isForum: boolean
  /// null = "Auto — let Max decide"
  defaultCardType: KanbanCardType | null
  enabled: boolean
}

export interface SetDiscordBotTokenRequest {
  botToken: string
}

export interface SetDiscordEnabledRequest {
  enabled: boolean
}

export interface DiscordGuildSummaryResponse {
  id: string
  name: string
  iconUrl?: string
}

export interface DiscordChannelSummaryResponse {
  id: string
  name: string
  type: number
  parentId?: string
  isForum: boolean
}

// Story-side Max — parallel to MaxTicketEnrichmentResponse but for kanban cards.
export interface MaxStoryEnrichmentResponse {
  id: string
  storyId: string
  status: 'processing' | 'complete' | 'failed'
  category: 'bug' | 'feature' | 'improvement' | 'tech_debt' | 'unclear'
  summary: string
  confidence: number
  duplicateOfStoryId?: string
  relatedStoryIds: string[]
  tags: string[]
  suggestedActionType: 'merge_story_duplicate' | 'investigate' | 'escalated' | 'no_action'
  suggestedNotes?: string
  reasoning?: string
  flaggedQuestion: boolean
  questionId?: string
  model: string
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface StoryMaxResponse {
  enrichment?: MaxStoryEnrichmentResponse
  tasks: MaxTaskResponse[]
  questions: MaxQuestionResponse[]
}
