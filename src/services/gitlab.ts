import type { Repository } from '@/types/gitlab'
import type { TimeFilter, Commit, Pipeline, Contributor, RepositoryFile } from '@/types/repository'

export class GitlabService {
  private token: string = ''
  private baseUrl: string = ''

  constructor(baseUrl: string = 'https://gitlab.com') {
    this.setBaseUrl(baseUrl)
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '')
  }

  setToken(token: string) {
    this.token = token
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}/api/v4${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': this.token,
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`)
    }

    return response.json()
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.request('/user')
      return true
    } catch {
      return false
    }
  }

  async getRepositories(): Promise<Repository[]> {
    const data = await this.request('/projects?membership=true&order_by=last_activity_at&per_page=100')
    return data
  }

  async getCommits(projectId: number, timeFilter: TimeFilter): Promise<Commit[]> {
    const { startDate, endDate } = timeFilter
    const data = await this.request(
      `/projects/${projectId}/repository/commits?since=${startDate}&until=${endDate}&per_page=100`
    )
    return data.map((commit: any) => ({
      id: commit.id,
      message: commit.message,
      author_name: commit.author_name,
      author_email: commit.author_email,
      created_at: commit.created_at,
      web_url: commit.web_url
    }))
  }

  async getPipelines(projectId: number, timeFilter: TimeFilter): Promise<Pipeline[]> {
    const { startDate, endDate } = timeFilter
    const data = await this.request(
      `/projects/${projectId}/pipelines?updated_after=${startDate}&updated_before=${endDate}&per_page=100`
    )
    return data.map((pipeline: any) => ({
      id: pipeline.id,
      status: pipeline.status,
      ref: pipeline.ref,
      sha: pipeline.sha,
      web_url: pipeline.web_url,
      created_at: pipeline.created_at,
      updated_at: pipeline.updated_at
    }))
  }

  async getContributors(projectId: number, timeFilter: TimeFilter): Promise<Contributor[]> {
    const commits = await this.getCommits(projectId, timeFilter)
    const contributors = new Map<string, Contributor>()

    for (const commit of commits) {
      const key = `${commit.author_name}:${commit.author_email}`
      const current = contributors.get(key) || {
        id: contributors.size + 1,
        name: commit.author_name,
        email: commit.author_email,
        commits: 0,
        additions: 0,
        deletions: 0
      }

      current.commits++
      contributors.set(key, current)
    }

    return Array.from(contributors.values())
  }

  async getFiles(projectId: number, path: string = ''): Promise<RepositoryFile[]> {
    const data = await this.request(`/projects/${projectId}/repository/tree?path=${path}&per_page=100`)
    return data.map((file: any) => ({
      path: file.path,
      type: file.type,
      size: file.size || 0,
      last_modified: file.last_commit_at
    }))
  }
}
