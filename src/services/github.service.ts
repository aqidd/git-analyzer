import type { Repository } from '@/types/github'
import type { TimeFilter, Commit, Pipeline, Contributor, RepositoryFile, PullRequest } from '@/types/repository'
import { GitService } from './git.service'

export class GithubService extends GitService {
  token: string = ''
  private baseUrl: string = 'https://api.github.com'

  setToken(token: string) {
    this.token = token
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
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
    const data = await this.request('/user/repos?sort=updated&per_page=100&type=all')
    return data
  }

  async getBranches(owner: string, repo: string): Promise<Branch[]> {
    const data = await this.request(`/repos/${owner}/${repo}/branches`)
    const protectedBranches = new Set((await this.request(`/repos/${owner}/${repo}/branches?protected=true`)).map((b: any) => b.name))
    
    return await Promise.all(data.map(async (branch: any) => {
      const commit = await this.request(`/repos/${owner}/${repo}/commits/${branch.commit.sha}`)
      return {
        name: branch.name,
        lastCommitDate: commit.commit.author.date || '',
        lastCommitSha: branch.commit.sha || '',
        lastCommitMessage: commit.commit.message || '',
        lastCommitAuthor: commit.commit.author.name || '',
        protected: protectedBranches.has(branch.name)
      }
    }))
  }

  async getCommits(owner: string, repo: string, timeFilter: TimeFilter): Promise<Commit[]> {
    const { startDate, endDate } = timeFilter
    const data = await this.request(
      `/repos/${owner}/${repo}/commits?since=${startDate}&until=${endDate}&per_page=100`
    )
    // Get detailed stats for each commit
    const commitStats = await Promise.all(
      data.map((item: any) =>
        this.request(`/repos/${owner}/${repo}/commits/${item.sha}`)
      )
    )

    return data.map((item: any, index: number) => ({
      id: item.sha,
      message: item.commit.message,
      author_name: item.commit.author.name,
      author_email: item.commit.author.email,
      created_at: item.commit.author.date,
      html_url: item.html_url,
      code_added: commitStats[index]?.stats?.additions || 0,
      code_removed: commitStats[index]?.stats?.deletions || 0
    }))
  }

  async getPipelines(owner: string, repo: string, timeFilter: TimeFilter): Promise<Pipeline[]> {
    const { startDate, endDate } = timeFilter
    const data = await this.request(
      `/repos/${owner}/${repo}/actions/runs?created=${startDate}..${endDate}&per_page=100`
    )
    return data.workflow_runs.map((run: any) => ({
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      ref: run.head_branch,
      sha: run.head_sha,
      html_url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at
    }))
  }

  async getContributors(owner: string, repo: string, timeFilter: TimeFilter): Promise<Contributor[]> {
    const commits = await this.getCommits(owner, repo, timeFilter)
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

    // Get additional contributor details including avatar
    const details = await this.request(`/repos/${owner}/${repo}/contributors?per_page=100`)
    for (const detail of details) {
      const contributor = Array.from(contributors.values())
        .find(c => c.name === detail.login || c.email === detail.email)
      if (contributor) {
        contributor.avatar_url = detail.avatar_url
      }
    }

    return Array.from(contributors.values())
  }

  async getFiles(owner: string, repo: string, path: string = ''): Promise<RepositoryFile[]> {
    const data = await this.request(`/repos/${owner}/${repo}/contents/${path}`)
    return Array.isArray(data) ? data.map((file: any) => ({
      path: file.path,
      type: file.type,
      size: file.size,
      last_modified: file.last_modified
    })) : [{
      path: data.path,
      type: data.type,
      size: data.size,
      last_modified: data.last_modified
    }]
  }

  async getPullRequests(owner: string, repo: string, timeFilter: TimeFilter): Promise<PullRequest[]> {
    const { startDate, endDate } = timeFilter
    const data = await this.request(
      `/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=100`
    )

    const filteredPRs = data.filter((pr: any) => {
      const createdAt = new Date(pr.created_at)
      return createdAt >= new Date(startDate) && createdAt <= new Date(endDate)
    })

    return await Promise.all(filteredPRs.map(async (pr: any) => {
      // Get PR reviews to calculate time to first review
      const reviews = await this.request(`/repos/${owner}/${repo}/pulls/${pr.number}/reviews`)
      const firstReview = reviews[0]
      const timeToFirstReview = firstReview ? 
        (new Date(firstReview.submitted_at).getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60) :
        undefined

      // Get PR details including file changes
      const details = await this.request(`/repos/${owner}/${repo}/pulls/${pr.number}`)
      
      return {
        id: pr.id,
        title: pr.title,
        description: pr.body || '',
        state: pr.merged_at ? 'merged' : pr.state,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at,
        closedAt: pr.closed_at,
        author: {
          id: pr.user.id,
          name: pr.user.login,
          username: pr.user.login
        },
        reviewers: pr.requested_reviewers?.map((reviewer: any) => ({
          id: reviewer.id,
          name: reviewer.login,
          username: reviewer.login
        })) || [],
        sourceBranch: pr.head.ref,
        targetBranch: pr.base.ref,
        isDraft: pr.draft,
        comments: pr.comments + (pr.review_comments || 0),
        reviewCount: reviews.length,
        additions: details.additions,
        deletions: details.deletions,
        changedFiles: details.changed_files,
        labels: pr.labels.map((label: any) => label.name),
        timeToMerge: pr.merged_at ? 
          (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60) :
          undefined,
        timeToFirstReview
      }
    }))
  }
}
