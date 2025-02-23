import type { Repository } from '@/types/github'
import type { TimeFilter, Commit, Pipeline, Contributor, RepositoryFile } from '@/types/repository'

export class GithubService {
  private token: string = ''
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

  async getCommits(owner: string, repo: string, timeFilter: TimeFilter): Promise<Commit[]> {
    const { startDate, endDate } = timeFilter
    const data = await this.request(
      `/repos/${owner}/${repo}/commits?since=${startDate}&until=${endDate}&per_page=100`
    )
    return data.map((item: any) => ({
      id: item.sha,
      message: item.commit.message,
      author_name: item.commit.author.name,
      author_email: item.commit.author.email,
      created_at: item.commit.author.date,
      html_url: item.html_url
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
}
