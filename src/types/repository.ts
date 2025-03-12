export interface TimeFilter {
  startDate: string
  endDate: string
}

export interface Repository {
  id: string | number
  name: string
  description: string | null
  default_branch: string
  visibility: string
  last_activity_at?: string
  updated_at?: string
  lastCommitDate?: string
}

export interface Commit {
  id: string
  message: string
  author_name: string
  author_email: string
  created_at: string
  code_added: number
  code_removed: number
  web_url?: string
  html_url?: string
}

export type PipelineStatus =
  // Success states
  | 'success'
  | 'succeeded'
  // Failure states
  | 'failed'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  // In-progress states
  | 'pending'
  | 'running'
  | 'in_progress'
  | 'created'
  | 'waiting_for_resource'
  | 'preparing'
  | 'scheduled'
  // Other states
  | 'unknown'

export interface Pipeline {
  id: number
  status: PipelineStatus
  ref: string
  sha: string
  conclusion?: PipelineStatus
  web_url?: string
  html_url?: string
  created_at: string
  updated_at: string
}

export interface Contributor {
  id: number
  name: string
  email: string
  commits: number
  additions: number
  deletions: number
  avatar_url?: string
}

export interface RepositoryFile {
  path: string
  type: string
  size: number
  last_modified: string
}

export interface Branch {
  name: string
  lastCommitDate: string
  lastCommitSha: string
  lastCommitMessage?: string
  lastCommitAuthor?: string
  protected?: boolean
}

/**
 * Represents a pull request in a repository
 */
export interface PullRequest {
  id: number | string
  title: string
  description: string
  state: 'open' | 'closed' | 'merged'
  createdAt: string
  updatedAt: string
  mergedAt?: string
  closedAt?: string
  author: {
    id: number | string
    name: string
    username: string
  }
  reviewers?: Array<{
    id: number | string
    name: string
    username: string
  }>
  sourceBranch: string
  targetBranch: string
  isDraft: boolean
  comments: number
  reviewCount: number
  additions: number
  deletions: number
  changedFiles: number
  labels: string[]
  timeToMerge?: number // in hours
  timeToFirstReview?: number // in hours
}
