import type { Repository as BaseRepository } from './repository'

export interface GithubAuth {
  token: string
  isAuthenticated: boolean
}

export interface Repository extends BaseRepository {
  html_url: string
  owner: {
    login: string
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
