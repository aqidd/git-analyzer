import type { Repository } from '@/types/gitlab'

export class GitlabService {
  private token: string = ''
  private baseUrl: string = ''

  constructor(baseUrl: string = 'https://gitlab.com') {
    this.setBaseUrl(baseUrl)
  }

  setBaseUrl(url: string) {
    // Remove trailing slash if present
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
}
