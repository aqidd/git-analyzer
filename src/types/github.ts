export interface GithubAuth {
  token: string
  isAuthenticated: boolean
}

export interface Repository {
  id: number
  name: string
  description: string
  html_url: string
  default_branch: string
  visibility: string
  updated_at: string
  owner: {
    avatar_url: string
  }
  stargazers_count: number
  forks_count: number
}

export interface RepositoryList {
  repositories: Repository[]
  loading: boolean
  error: string | null
}
