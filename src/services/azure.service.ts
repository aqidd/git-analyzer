import type { Repository, Project, BranchStats, PullRequest, WorkItem, RepositoryPolicy, RepositoryAnalytics } from '@/types/azure'
import type { Commit, Pipeline, Contributor, RepositoryFile, TimeFilter, Branch } from '@/types/repository'
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
    
    return Array.from(contributorMap.entries()).map(([_, value], index) => ({
      id: index + 1,
      name: value.name,
      email: value.email,
      commits: value.commits,
      additions: value.additions,
      deletions: value.deletions
    }))
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
      path: file.path,
      type: file.gitObjectType?.toLowerCase() || 'file',
      size: file.size || 0,
      last_modified: file.lastModifiedDate
    }))
  }

  async getPullRequests(projectId: string, repoId: string, timeFilter: TimeFilter): Promise<PullRequest[]> {
    const project = await this.request<{ name: string }>(`projects/${projectId}`)
    const queryParams = new URLSearchParams({
      'searchCriteria.status': 'all',
      'searchCriteria.creationDate': this.formatDate(timeFilter.startDate),
      '$top': '100'
    }).toString()

    const data = await this.request<ApiResponse<any>>(`git/repositories/${repoId}/pullrequests?${queryParams}`, project.name)
    
    return await Promise.all(data.value.map(async (pr: any) => {
      // Get PR details including reviews and comments
      const details = await this.request<any>(`git/repositories/${repoId}/pullrequests/${pr.pullRequestId}`, project.name)
      const threads = await this.request<ApiResponse<any>>(`git/repositories/${repoId}/pullrequests/${pr.pullRequestId}/threads`, project.name)
      
      // Calculate review times
      const reviews = threads.value.filter((thread: any) => thread.status === 'active' && thread.comments?.length > 0)
      const firstReview = reviews.length > 0 ? 
        reviews.reduce((earliest: any, current: any) => {
          const currentDate = new Date(current.comments[0].publishedDate)
          return earliest ? (currentDate < new Date(earliest) ? currentDate : earliest) : currentDate
        }, null) :
        null

      const timeToFirstReview = firstReview ? 
        (firstReview.getTime() - new Date(pr.creationDate).getTime()) / (1000 * 60 * 60) :
        undefined

      return {
        id: pr.pullRequestId,
        title: pr.title,
        description: pr.description || '',
        state: pr.status === 'completed' ? (pr.mergeStatus === 'succeeded' ? 'merged' : 'closed') : 'open',
        createdAt: pr.creationDate,
        updatedAt: details.lastMergeSourceCommit?.committer?.date || pr.creationDate,
        mergedAt: pr.closedDate && pr.status === 'completed' && pr.mergeStatus === 'succeeded' ? pr.closedDate : undefined,
        closedAt: pr.closedDate,
        author: {
          id: pr.createdBy.id,
          name: pr.createdBy.displayName,
          username: pr.createdBy.uniqueName
        },
        reviewers: pr.reviewers?.map((reviewer: any) => ({
          id: reviewer.id,
          name: reviewer.displayName,
          username: reviewer.uniqueName
        })) || [],
        sourceBranch: pr.sourceRefName.replace('refs/heads/', ''),
        targetBranch: pr.targetRefName.replace('refs/heads/', ''),
        isDraft: pr.isDraft,
        comments: threads.value.reduce((count: number, thread: any) => count + (thread.comments?.length || 0), 0),
        reviewCount: reviews.length,
        additions: details.lastMergeSourceCommit?.changeCounts?.Add || 0,
        deletions: details.lastMergeSourceCommit?.changeCounts?.Delete || 0,
        changedFiles: details.lastMergeSourceCommit?.changeCounts?.Edit || 0,
        labels: pr.labels || [],
        timeToMerge: pr.closedDate && pr.status === 'completed' && pr.mergeStatus === 'succeeded' ?
          (new Date(pr.closedDate).getTime() - new Date(pr.creationDate).getTime()) / (1000 * 60 * 60) :
          undefined,
        timeToFirstReview
      }
    }))
  }
}
