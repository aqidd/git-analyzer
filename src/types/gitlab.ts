import type { Repository as BaseRepository } from './repository'

export interface GitlabAuth {
  token: string
  url: string
  isAuthenticated: boolean
}

export interface Repository extends BaseRepository {
  web_url: string
  avatar_url?: string
  star_count: number
  forks_count: number
}

export interface RepositoryList {
  repositories: Repository[]
  loading: boolean
  error: string | null
}
