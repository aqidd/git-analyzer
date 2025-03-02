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

export interface Pipeline {
  id: number
  status: string
  ref: string
  sha: string
  conclusion?: string
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
