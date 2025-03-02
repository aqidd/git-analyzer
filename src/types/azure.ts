import type { Repository as BaseRepository } from './repository'

export interface AzureAuth {
  token: string
  organization: string
  isAuthenticated: boolean
}

export interface Project {
  id: string
  name: string
  description: string | null
  url: string
  state: string
  visibility: string
  lastUpdateTime: string
  revision: number
}

export interface Repository extends BaseRepository {
  url: string
  size: number
  project: {
    id: string
    name: string
  }
  stats: {
    commitCount: number
    branchCount: number
    contributorCount: number
    pullRequestCount: number
  }
}

export interface BranchStats {
  name: string
  aheadCount: number
  behindCount: number
  commit: {
    commitId: string
    committer: {
      name: string
      email: string
      date: string
    }
  }
}

export interface RepositoryPolicy {
  id: string
  type: string
  isEnabled: boolean
  isBlocking: boolean
  settings: Record<string, unknown>
}

export interface PullRequest {
  id: number
  title: string
  description: string | null
  status: string
  createdBy: string
  creationDate: string
  lastUpdateTime: string
  sourceRef: string
  targetRef: string
  mergeStatus: string
  isDraft: boolean
  reviewers: Array<{
    displayName: string
    vote: number
    isRequired: boolean
  }>
}

export interface WorkItem {
  id: number
  title: string
  type: string
  state: string
  assignedTo?: string
  createdDate: string
  changedDate: string
  priority?: number
  severity?: string
}

export interface RepositoryAnalytics {
  date: string
  commits: number
  activeUsers: number
  pullRequests: number
  workItems: number
}
