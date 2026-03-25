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
