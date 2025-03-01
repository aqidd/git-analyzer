import type { Repository, Project, BranchStats, PullRequest, WorkItem, RepositoryPolicy, RepositoryAnalytics } from '@/types/azure'
import type { Commit, Pipeline, Contributor, RepositoryFile, TimeFilter } from '@/types/repository'
import { GitService } from './git'

interface ApiResponse<T> {
  count: number
  value: T[]
}

export class AzureService extends GitService {
  token: string = ''
  private organization: string = ''
  private baseUrl: string = 'https://dev.azure.com'
  private apiVersion: string = '6.0'

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

  private async request<T>(path: string, projectPath?: string): Promise<T> {
    const separator = path.includes('?') ? '&' : '?'
    const basePath = projectPath ? `${this.organization}/${projectPath}` : this.organization
    const response = await fetch(`${this.baseUrl}/${basePath}/_apis/${path}${separator}api-version=${this.apiVersion}`, {
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

  async getProjects(): Promise<Project[]> {
    const data = await this.request<ApiResponse<any>>('projects')
    return data.value.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      url: project.url,
      state: project.state,
      visibility: project.visibility,
      lastUpdateTime: project.lastUpdateTime,
      revision: project.revision
    }))
  }

  async getRepositories(projectId?: string): Promise<Repository[]> {
    const path = projectId ? `${projectId}/git/repositories` : 'git/repositories'
    const data = await this.request<ApiResponse<any>>(path)
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
      },
      stats: {
        commitCount: 0,
        branchCount: 0,
        contributorCount: 0,
        pullRequestCount: 0
      }
    }))
  }

  private async getRepositoryById(repoId: string): Promise<Repository> {
    const data = await this.request<ApiResponse<any>>(`git/repositories/${repoId}`)
    if (!data) throw new Error('Repository not found')
    return data
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

  async getBranchStats(projectId: string, repoId: string): Promise<BranchStats[]> {
    const data = await this.request<ApiResponse<any>>(`${projectId}/git/repositories/${repoId}/stats/branches`)
    return data.value.map(branch => ({
      name: branch.name,
      aheadCount: branch.aheadCount,
      behindCount: branch.behindCount,
      commit: {
        commitId: branch.commit.commitId,
        committer: {
          name: branch.commit.committer.name,
          email: branch.commit.committer.email,
          date: branch.commit.committer.date
        }
      }
    }))
  }

  private formatDate(date: string): string {
    return new Date(date).toISOString()
  }

  async getCommits(projectId: string, repoId: string, timeFilter: TimeFilter): Promise<Commit[]> {
    const project = await this.request<{ name: string }>(`projects/${projectId}`)
    const queryParams = new URLSearchParams({
      'searchCriteria.fromDate': this.formatDate(timeFilter.startDate),
      'searchCriteria.toDate': this.formatDate(timeFilter.endDate)
    }).toString()
    const data = await this.request<ApiResponse<any>>(`git/repositories/${repoId}/commits?${queryParams}`, project.name)
    
    return data.value.map(commit => ({
      id: commit.commitId,
      message: commit.comment,
      author_name: commit.author.name,
      author_email: commit.author.email,
      created_at: commit.author.date,
      web_url: commit.remoteUrl,
      code_added: commit.changeCounts?.Add || 0,
      code_removed: commit.changeCounts?.Delete || 0
    }))
  }

  async getPipelines(projectId: string, repoId: string, timeFilter: TimeFilter): Promise<Pipeline[]> {
    const project = await this.request<{ name: string }>(`projects/${projectId}`)
    const queryParams = new URLSearchParams({
      minTime: this.formatDate(timeFilter.startDate),
      maxTime: this.formatDate(timeFilter.endDate),
      repositoryId: repoId,
      repositoryType: 'TfsGit'
    }).toString()
    const data = await this.request<ApiResponse<any>>(`build/builds?${queryParams}`, project.name)

    return data.value.map(pipeline => ({
      id: pipeline.id,
      status: pipeline.status === 'completed' && pipeline.result === 'succeeded' ? 'succeeded' : pipeline.status.toLowerCase(),
      ref: pipeline.sourceBranch?.replace('refs/heads/', '') || '',
      sha: pipeline.sourceVersion || '',
      conclusion: pipeline.result?.toLowerCase() || '',
      web_url: pipeline._links?.web?.href || '',
      created_at: pipeline.startTime || pipeline.queueTime,
      updated_at: pipeline.finishTime || pipeline.queueTime
    }))
  }

  async getContributors(projectId: string, repoId: string): Promise<Contributor[]> {
    const project = await this.request<{ name: string }>(`projects/${projectId}`)
    
    // Get all commits
    const timeFilter: TimeFilter = {
      startDate: new Date(0).toISOString(), // From beginning
      endDate: new Date().toISOString() // Until now
    }
    
    const queryParams = new URLSearchParams({
      'searchCriteria.fromDate': this.formatDate(timeFilter.startDate),
      'searchCriteria.toDate': this.formatDate(timeFilter.endDate)
    }).toString()
    
    const data = await this.request<ApiResponse<any>>(`git/repositories/${repoId}/commits?${queryParams}`, project.name)
    
    // Aggregate commit statistics by author
    const contributorMap = new Map<string, {
      name: string
      email: string
      commits: number
      additions: number
      deletions: number
      lastContribution: string
    }>()
    
    data.value.forEach(commit => {
      const { name, email, date } = commit.author
      const key = `${name}:${email}`
      
      const existing = contributorMap.get(key) || {
        name,
        email,
        commits: 0,
        additions: 0,
        deletions: 0,
        lastContribution: date
      }
      
      existing.commits++
      existing.additions += commit.changeCounts?.Add || 0
      existing.deletions += commit.changeCounts?.Delete || 0
      existing.lastContribution = new Date(date) > new Date(existing.lastContribution) ? date : existing.lastContribution
      
      contributorMap.set(key, existing)
    })
    
    return Array.from(contributorMap.values())
  }

  async getBranches(projectId: string, repoId: string): Promise<Branch[]> {
    const project = await this.request<{ name: string }>(`projects/${projectId}`)
    const data = await this.request<ApiResponse<any>>(`git/repositories/${repoId}/refs/heads`, project.name)

    return data.value.map(branch => ({
      name: branch.name.replace('refs/heads/', ''),
      lastCommitDate: branch.commit?.committer?.date || '',
      lastCommitSha: branch.objectId || '',
      lastCommitMessage: branch.commit?.comment || '',
      lastCommitAuthor: branch.commit?.committer?.name || '',
      protected: branch.isLocked || false
    }))
  }

  async getFiles(projectId: string, repoId: string): Promise<RepositoryFile[]> {
    const project = await this.request<{ name: string }>(`projects/${projectId}`)
    const data = await this.request<ApiResponse<any>>(`git/repositories/${repoId}/items?recursionLevel=full`, project.name)
    return data.value.map(file => ({
      name: file.path.split('/').pop() || '',
      path: file.path,
      type: file.gitObjectType?.toLowerCase() || 'file',
      size: file.size || 0,
      lastModified: file.lastModifiedDate,
      contentUrl: file.url
    }))
  }

  async getPolicies(projectId: string, repoId: string): Promise<RepositoryPolicy[]> {
    const data = await this.request<ApiResponse<any>>(`${projectId}/git/policy/configurations?repositoryId=${repoId}`)
    return data.value.map(policy => ({
      id: policy.id,
      type: policy.type.displayName,
      isEnabled: policy.isEnabled,
      isBlocking: policy.isBlocking,
      settings: policy.settings
    }))
  }

  async getPullRequests(projectId: string, repoId: string, timeFilter: TimeFilter): Promise<PullRequest[]> {
    const queryParams = new URLSearchParams({
      searchCriteria: JSON.stringify({
        status: 'all',
        creatorId: '',
        includeLinks: true,
        sourceRefName: '',
        targetRefName: '',
        includeCommits: true,
        fromDate: timeFilter.startDate,
        toDate: timeFilter.endDate
      })
    }).toString()

    const data = await this.request<ApiResponse<any>>(`${projectId}/git/repositories/${repoId}/pullrequests?${queryParams}`)
    return data.value.map(pr => ({
      id: pr.pullRequestId,
      title: pr.title,
      description: pr.description,
      status: pr.status,
      createdBy: pr.createdBy.displayName,
      creationDate: pr.creationDate,
      lastUpdateTime: pr.lastUpdateTime,
      sourceRef: pr.sourceRefName,
      targetRef: pr.targetRefName,
      mergeStatus: pr.mergeStatus,
      isDraft: pr.isDraft,
      reviewers: pr.reviewers.map((reviewer: any) => ({
        displayName: reviewer.displayName,
        vote: reviewer.vote,
        isRequired: reviewer.isRequired
      }))
    }))
  }

  async getAnalytics(projectId: string, repoId: string, timeFilter: TimeFilter): Promise<RepositoryAnalytics[]> {
    const data = await this.request<ApiResponse<any>>(`${projectId}/git/repositories/${repoId}/stats/activity`)
    return data.value.map(stat => ({
      date: stat.date,
      commits: stat.commits,
      activeUsers: stat.activeUsers,
      pullRequests: stat.pullRequests,
      workItems: stat.workItems
    }))
  }

  async getWorkItems(projectId: string, repoId: string): Promise<WorkItem[]> {
    const data = await this.request<ApiResponse<any>>(`${projectId}/git/repositories/${repoId}/workitems`)
    return data.value.map(item => ({
      id: item.id,
      title: item.title,
      type: item.workItemType,
      state: item.state,
      assignedTo: item.assignedTo?.displayName,
      createdDate: item.createdDate,
      changedDate: item.changedDate,
      priority: item.priority,
      severity: item.severity
    }))
  }
}
