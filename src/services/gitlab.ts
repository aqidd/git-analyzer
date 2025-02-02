import { GitLabConfig, Repository, ContributorStats } from '../types/gitlab';

export class GitLabService {
  private config: GitLabConfig;
  private controller: AbortController;
  private jsonEndpoints = [
    '/projects$',
    '/projects\\?',
    '/projects/*/repository/tree',
    '/projects/*/repository/commits',
    '/projects/*/pipelines',
    '/projects/*/pipelines/*/jobs'
  ];

  constructor(config: GitLabConfig) {
    this.config = config;
    this.controller = new AbortController();
  }

  private async fetch<T>(endpoint: string, forceText: boolean = false): Promise<T> {
    const isJsonEndpoint = !forceText && this.jsonEndpoints.some(pattern => 
      new RegExp(pattern.replace('*', '\\d+')).test(endpoint)
    );
    
    const response = await fetch(`${this.config.baseUrl}/api/v4${endpoint}`, {
      headers: {
        'PRIVATE-TOKEN': this.config.apiToken,
        'Content-Type': isJsonEndpoint ? 'application/json' : 'text/plain',
      },
      signal: this.controller.signal,
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    return isJsonEndpoint ? response.json() : response.text() as T;
  }

  async getRepositories(params: {
    page?: number;
    perPage?: number;
    search?: string;
    orderBy?: 'id' | 'name' | 'path' | 'created_at' | 'updated_at' | 'last_activity_at';
    sort?: 'asc' | 'desc';
  } = {}): Promise<{
    repositories: Repository[];
    totalPages: number;
    totalItems: number;
  }> {
    const queryParams = new URLSearchParams();
    
    // Add pagination parameters
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.perPage) queryParams.append('per_page', params.perPage.toString());
    
    // Add search parameter
    if (params.search) queryParams.append('search', params.search);
    
    // Add sorting parameters
    if (params.orderBy) queryParams.append('order_by', params.orderBy);
    if (params.sort) queryParams.append('sort', params.sort);
    
    // Add membership parameter to only show repositories the user is a member of
    queryParams.append('membership', 'true');
    
    const response = await fetch(`${this.config.baseUrl}/api/v4/projects?${queryParams}`, {
      headers: {
        'PRIVATE-TOKEN': this.config.apiToken,
        'Content-Type': 'application/json',
      },
      signal: this.controller.signal,
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    const totalPages = parseInt(response.headers.get('x-total-pages') || '1');
    const totalItems = parseInt(response.headers.get('x-total') || '0');
    const repositories = await response.json();

    return {
      repositories,
      totalPages,
      totalItems,
    };
  }

  async getRepository(id: number): Promise<Repository> {
    return this.fetch<Repository>(`/projects/${id}`);
  }

  async getRepositoryFiles(id: number, pattern?: string): Promise<{ path: string; content: string }[]> {
    console.log('Fetching repository files...');
    try {
      const files = await this.fetch<{ path: string }[]>(`/projects/${id}/repository/tree?recursive=true`);
      console.log('All files found:', files.length);
    
      const documentFiles = files.filter(file => {
        if (pattern) {
          // Convert glob pattern to regex
          const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');
          return new RegExp(regexPattern).test(file.path);
        } else {
          return /\.(md|txt|rst|adoc)$/i.test(file.path) ||
                 /requirements\.(txt|in)$/i.test(file.path) ||
                 /license/i.test(file.path) ||
                 /readme/i.test(file.path) ||
                 /contributing/i.test(file.path) ||
                 /docs?\/.*$/i.test(file.path);
        }
      });
      console.log('Documentation files found:', documentFiles.length);
      console.log('Documentation file paths:', documentFiles.map(f => f.path));

      const fileContents = await Promise.allSettled(
        documentFiles.map(async file => {
          try {
            console.log('Fetching content for:', file.path);
            const content = await this.fetch<string>(
              `/projects/${id}/repository/files/${encodeURIComponent(file.path)}/raw`,
              true
            );
            return { path: file.path, content };
          } catch (error) {
            console.error(`Error fetching content for ${file.path}:`, {
              message: error instanceof Error ? error.message : 'Unknown error',
              status: error instanceof Response ? error.status : undefined,
              path: file.path,
              url: `/projects/${id}/repository/files/${encodeURIComponent(file.path)}/raw`
            });
            throw error;
          }
        })
      );

      const successfulFetches = fileContents
        .filter((result): result is PromiseFulfilledResult<{ path: string; content: string }> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      const failedFetches = fileContents
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .length;

      console.log(`Successfully fetched ${successfulFetches.length} file contents`);
      if (failedFetches > 0) {
        console.warn(`Failed to fetch ${failedFetches} file contents`);
      }

      return successfulFetches;
    } catch (error) {
      console.error('Error fetching repository files:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: error instanceof Response ? error.status : undefined,
        endpoint: `/projects/${id}/repository/tree?recursive=true`
      });
      return [];
    }
  }

  async getCommits(id: number, since?: Date): Promise<Array<{
    id: string;
    title: string;
    message: string;
    stats: { additions: number; deletions: number; total: number };
    created_at: string;
  }>> {
    const params = new URLSearchParams();
    if (since) {
      params.append('since', since.toISOString());
    }
    params.append('with_stats', 'true');
    
    const queryString = params.toString();
    return this.fetch<Array<{
      id: string;
      title: string;
      message: string;
      stats: { additions: number; deletions: number; total: number };
      created_at: string;
    }>>(`/projects/${id}/repository/commits?${queryString}`);
  }

  async getPipelines(id: number, since?: Date): Promise<Array<{
    id: number;
    status: string;
    ref: string;
    sha: string;
    created_at: string;
    updated_at: string;
    message?: string;
  }>> {
    const params = new URLSearchParams();
    if (since) {
      params.append('updated_after', since.toISOString());
    }
    
    const queryString = params.toString();
    return this.fetch<Array<{
      id: number;
      status: string;
      ref: string;
      sha: string;
      created_at: string;
      updated_at: string;
      message?: string;
    }>>(`/projects/${id}/pipelines?${queryString}`);
  }

  async getPipelineJobs(projectId: number, pipelineId: number): Promise<Array<{
    id: number;
    status: string;
    stage: string;
    name: string;
    started_at?: string;
    finished_at?: string;
  }>> {
    return this.fetch<Array<{
      id: number;
      status: string;
      stage: string;
      name: string;
      started_at?: string;
      finished_at?: string;
    }>>(`/projects/${projectId}/pipelines/${pipelineId}/jobs`);
  }

  async getContributors(id: number, since?: Date): Promise<ContributorStats[]> {
    const params = new URLSearchParams();
    params.append('with_stats', 'true');
    
    if (since) {
      params.append('since', since.toISOString());
    }
    
    // Get all commits with stats
    const commits = await this.fetch<Array<{
      id: string;
      author_name: string;
      author_email: string;
      stats: { additions: number; deletions: number; total: number };
    }>>(`/projects/${id}/repository/commits?${params.toString()}`);
    
    // Get merge requests
    const mergeRequests = await this.fetch<Array<{
      id: number;
      author: { 
        id: number; 
        name: string; 
        username: string; 
        avatar_url: string; 
        email?: string;
      };
      created_at: string;
      merged_at?: string;
      state: string;
    }>>(`/projects/${id}/merge_requests?state=merged${since ? `&updated_after=${since.toISOString()}` : ''}`);

    // Group commits by author
    const contributorStats = new Map<string, ContributorStats>();
    
    // Process commits
    for (const commit of commits) {
      const key = commit.author_email || commit.author_name;
      const stats = contributorStats.get(key) || {
        name: commit.author_name,
        email: commit.author_email,
        commits: 0,
        additions: 0,
        deletions: 0,
        totalChanges: 0,
        mergeRequestCount: 0,
        score: 0,
      };
      
      stats.commits++;
      stats.additions += commit.stats.additions;
      stats.deletions += commit.stats.deletions;
      stats.totalChanges += commit.stats.total;
      contributorStats.set(key, stats);
    }
    
    // Process merge requests
    for (const mr of mergeRequests) {
      if (mr.state === 'merged') {
        const key = mr.author.email || mr.author.name;
        const stats = contributorStats.get(key) || {
          name: mr.author.name,
          email: mr.author.email || '',
          commits: 0,
          additions: 0,
          deletions: 0,
          totalChanges: 0,
          mergeRequestCount: 0,
          score: 0,
        };
        
        stats.mergeRequestCount++;
        contributorStats.set(key, stats);
      }
    }
    
    // Calculate scores and convert to array
    const result = Array.from(contributorStats.values());
    result.forEach(stats => {
      stats.score = this.calculateContributorScore(stats);
    });
    
    // Sort by score descending
    return result.sort((a, b) => b.score - a.score);
  }

  private calculateContributorScore(stats: ContributorStats): number {
    const commitScore = Math.min(stats.commits * 10, 100);
    const mrScore = Math.min(stats.mergeRequestCount * 20, 100);
    const changeScore = Math.min(stats.totalChanges / 1000, 100);
    
    return Math.round((commitScore + mrScore + changeScore) / 3);
  }
}