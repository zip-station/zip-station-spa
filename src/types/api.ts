export interface UserResponse {
  id: string
  firebaseUserId: string
  email: string
  displayName: string
  avatarUrl?: string
  companyMemberships: CompanyMembershipResponse[]
  projectMemberships: ProjectMembershipResponse[]
  isDisabled: boolean
  createdOnDateTime: number
  updatedOnDateTime: number
}

export interface CompanyMembershipResponse {
  companyId: string
  role: 'Owner' | 'Admin' | 'Member'
}

export interface ProjectMembershipResponse {
  companyId: string
  projectId: string
  role: 'Owner' | 'Admin' | 'Member'
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
