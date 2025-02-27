import type { Repository } from '@/types/azure'
import type { Commit, Pipeline, Contributor, RepositoryFile, TimeFilter } from '@/types/repository'

export class AzureService {
  private token: string = ''
  private organization: string = ''
  private baseUrl: string = 'https://dev.azure.com'
  private apiVersion: string = '7.1'

  setToken(token: string) {
    this.token = token
  }

  setOrganization(organization: string) {
    this.organization = organization
  }

  private getHeaders() {
    return {
      Authorization: `Basic ${btoa(`:${this.token}`)}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  private async request<T>(path: string): Promise<T> {
    const separator = path.includes('?') ? '&' : '?'
    const response = await fetch(`${this.baseUrl}/${this.organization}/_apis/${path}${separator}api-version=${this.apiVersion}`, {
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Azure DevOps API request failed: ${response.statusText}`)
    }

    return response.json()
  }

  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.organization}/_apis/projects?api-version=${this.apiVersion}`, {
        headers: this.getHeaders()
      })
      return response.ok
    } catch {
      return false
    }
  }

  async getRepositories(): Promise<Repository[]> {
    const data = await this.request<{ value: any[] }>('git/repositories')
    return data.value.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description,
      url: repo.webUrl,
      defaultBranch: repo.defaultBranch,
      size: repo.size,
      visibility: repo.project.visibility,
      lastCommitDate: repo.lastUpdateTime,
      project: {
        id: repo.project.id,
        name: repo.project.name
      }
    }))
  }

  private async getRepositoryById(repoId: string): Promise<Repository> {
    const data = await this.request<{ value: Repository[] }>('git/repositories')
    const repo = data.value.find(r => r.id === repoId)
    if (!repo) throw new Error('Repository not found')
    return repo
  }

  private async postRequest<T>(path: string, body: any): Promise<T> {
    const separator = path.includes('?') ? '&' : '?'
    const response = await fetch(`${this.baseUrl}/${this.organization}/_apis/${path}${separator}api-version=${this.apiVersion}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`Azure DevOps API request failed: ${response.statusText}`)
    }

    return response.json()
  }

  async getCommits(repoId: string, timeFilter: TimeFilter): Promise<Commit[]> {
    const repo = await this.getRepositoryById(repoId)
    const data = await this.postRequest<{ value: any[] }>(`${repo.project.id}/git/repositories/${repoId}/commitsbatch`, {
      fromDate: timeFilter.startDate,
      toDate: timeFilter.endDate,
      includeLinks: false,
      includePushData: true,
      includeWorkItems: false,
      itemVersion: {
        version: repo.defaultBranch,
        versionType: 'branch'
      }
    })
    
    return data.value.map(commit => ({
      id: commit.commitId,
      message: commit.comment,
      author: commit.author.name,
      date: commit.author.date,
      additions: commit.changeCounts?.Add || 0,
      deletions: commit.changeCounts?.Delete || 0,
      total: commit.changeCounts?.Edit || 0
    }))
  }

  async getPipelines(repoId: string, timeFilter: TimeFilter): Promise<Pipeline[]> {
    const repo = await this.getRepositoryById(repoId)
    const queryParams = new URLSearchParams({
      minTime: timeFilter.startDate,
      maxTime: timeFilter.endDate
    }).toString()
    const data = await this.request<{ value: any[] }>(`${repo.project.id}/pipelines?${queryParams}`)
    
    return data.value.map(pipeline => ({
      id: pipeline.id,
      status: pipeline.status,
      name: pipeline.name,
      url: pipeline._links.web.href,
      createdAt: pipeline.createdDate,
      duration: pipeline.duration || 0
    }))
  }

  async getContributors(repoId: string, timeFilter: TimeFilter): Promise<Contributor[]> {
    const repo = await this.getRepositoryById(repoId)
    const queryParams = new URLSearchParams({
      fromDate: timeFilter.startDate,
      toDate: timeFilter.endDate
    }).toString()
    const data = await this.request<{ value: any[] }>(`${repo.project.id}/git/repositories/${repoId}/stats/authors?${queryParams}`)
    
    return data.value.map(contributor => ({
      name: contributor.name,
      email: contributor.email || '',
      commits: contributor.commitCount || 0,
      additions: contributor.additions || 0,
      deletions: contributor.deletions || 0
    }))
  }

  async getFiles(repoId: string): Promise<RepositoryFile[]> {
    const repo = await this.getRepositoryById(repoId)
    const data = await this.request<{ value: any[] }>(`${repo.project.id}/git/repositories/${repoId}/items?recursionLevel=full`)
    
    return data.value.map(file => ({
      name: file.path.split('/').pop(),
      path: file.path,
      type: file.gitObjectType.toLowerCase(),
      size: file.size || 0,
      lastModified: file.lastModifiedDate
    }))
  }
}
