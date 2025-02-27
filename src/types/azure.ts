export interface AzureAuth {
  token: string
  organization: string
  isAuthenticated: boolean
}

export interface Repository {
  id: string
  name: string
  description: string | null
  url: string
  defaultBranch: string
  size: number
  visibility: string
  lastCommitDate: string
  project: {
    id: string
    name: string
  }
}
