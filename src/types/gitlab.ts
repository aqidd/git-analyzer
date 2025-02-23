export interface GitlabAuth {
  token: string
  url: string
  isAuthenticated: boolean
}

export interface Repository {
  id: number
  name: string
  description: string
  web_url: string
  default_branch: string
  visibility: string
  last_activity_at: string
  avatar_url?: string
  star_count: number
  forks_count: number
}

export interface RepositoryList {
  repositories: Repository[]
  loading: boolean
  error: string | null
}
