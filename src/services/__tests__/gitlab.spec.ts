import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { server } from '@/mocks/server' // Adjust path if necessary, assuming @ is src
import { http } from 'msw'
import { GitlabService } from '../gitlab.service'
import type { TimeFilter } from '@/types/repository'

const TEST_GITLAB_BASE_URL = 'https://gitlab.com' // Default used in service constructor
const GITLAB_API_V4_BASE = `${TEST_GITLAB_BASE_URL}/api/v4`
const VALID_GITLAB_TOKEN = 'VALID_GITLAB_PAT' // From handlers.ts
const INVALID_GITLAB_TOKEN = 'INVALID_GITLAB_PAT_FOR_ERROR_TEST'
const TEST_PROJECT_ID = 101 // Matches mockGitLabProject
const TEST_MR_IID = 101 // Matches mockGitLabMergeRequest

// --- MSW Server Setup ---
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('GitlabService', () => {
  let service: GitlabService

  beforeEach(() => {
    // Service constructor defaults to 'https://gitlab.com'
    // If a different base URL is needed for testing, it can be passed here.
    service = new GitlabService(TEST_GITLAB_BASE_URL)
    service.setToken(VALID_GITLAB_TOKEN)
  })

  // --- Test constructor and setBaseUrl ---
  it('should allow setting a custom base URL', () => {
    const customUrl = 'https://my.gitlab.instance.com';
    const customService = new GitlabService(customUrl);
    // To test this properly, we'd need a way to inspect the baseUrl or have a request go to it.
    // For now, this just ensures constructor doesn't throw.
    expect(customService).toBeInstanceOf(GitlabService);
  });

  // --- Test validateToken ---
  describe('validateToken', () => {
    it('should return true for a valid token', async () => {
      const isValid = await service.validateToken()
      expect(isValid).toBe(true)
    })

    it('should return false for an invalid token', async () => {
      service.setToken(INVALID_GITLAB_TOKEN)
      // Override the generic /user handler for this specific token
      server.use(
        http.get(`${GITLAB_API_V4_BASE}/user`, ({ request }) => {
          if (request.headers.get('PRIVATE-TOKEN') === INVALID_GITLAB_TOKEN) {
            return new Response(JSON.stringify({ message: 'Invalid token' }), { status: 401, statusText: 'Unauthorized' })
          }
        })
      )
      const isValid = await service.validateToken()
      expect(isValid).toBe(false)
    })
  })

  // --- Test getRepositories (Projects) ---
  describe('getRepositories', () => {
    it('should fetch projects (repositories) successfully', async () => {
      const projects = await service.getRepositories()
      expect(projects).toBeInstanceOf(Array)
      expect(projects.length).toBeGreaterThan(0)
      expect(projects[0].id).toBe(TEST_PROJECT_ID) // 101 from mockGitLabProject
      expect(projects[0].name).toBe('ProjectX')
    })

    it('should throw an error if API request fails', async () => {
      server.use(
        http.get(`${GITLAB_API_V4_BASE}/projects`, ({ request }) => {
          return new Response(JSON.stringify({ message: 'Server Error' }), {
            status: 500, statusText: 'Server Error', headers: { 'Content-Type': 'application/json' }
          })
        })
      )
      await expect(service.getRepositories()).rejects.toThrow('GitLab API error: Server Error')
    })
  })

  // --- Test getBranches ---
  describe('getBranches', () => {
    // Note: The service's getBranches takes (owner: string, repo: string) but uses 'owner' as projectId.
    // We'll pass TEST_PROJECT_ID as a string for the first argument.
    it('should fetch branches for a project successfully', async () => {
      const branches = await service.getBranches(String(TEST_PROJECT_ID), 'unused-repo-param')
      expect(branches).toBeInstanceOf(Array)
      expect(branches.length).toBeGreaterThan(0)
      expect(branches.find(b => b.name === 'main')).toBeDefined()
    })

    it('should throw an error if API fails for getBranches', async () => {
       server.use(
        http.get(`${GITLAB_API_V4_BASE}/projects/${TEST_PROJECT_ID}/repository/branches`, () => {
          return new Response(null, { status: 500, statusText: 'Branch Fetch Error' });
        })
      );
      await expect(service.getBranches(String(TEST_PROJECT_ID), 'unused-repo-param')).rejects.toThrow('Branch Fetch Error');
    })
  })

  // --- Test getCommits ---
  describe('getCommits', () => {
    const timeFilter: TimeFilter = {
      startDate: '2023-01-01T00:00:00Z',
      endDate: '2023-12-31T23:59:59Z',
    };
    it('should fetch commits successfully', async () => {
      const commits = await service.getCommits(TEST_PROJECT_ID, timeFilter);
      expect(commits).toBeInstanceOf(Array);
      expect(commits.length).toBeGreaterThan(0);
      expect(commits[0].id).toBe('abc123efg');
    });
  });

  // --- Test getPipelines ---
  describe('getPipelines', () => {
     const timeFilter: TimeFilter = {
      startDate: '2023-01-01T00:00:00Z',
      endDate: '2023-12-31T23:59:59Z',
    };
    it('should fetch pipelines successfully', async () => {
      const pipelines = await service.getPipelines(TEST_PROJECT_ID, timeFilter);
      expect(pipelines).toBeInstanceOf(Array);
      expect(pipelines.length).toBeGreaterThan(0);
      expect(pipelines[0].status).toBe('success');
    });
  });

  // --- Test getContributors (relies on getCommits) ---
  describe('getContributors', () => {
    const timeFilter: TimeFilter = {
      startDate: '2023-01-01T00:00:00Z', // Ensure this range gets commits from mock
      endDate: new Date().toISOString(),   // to now
    };
     it('should fetch contributors successfully', async () => {
      // Mock for getCommits is already in handlers.ts, returning one commit by 'User One'
      const contributors = await service.getContributors(TEST_PROJECT_ID, timeFilter);
      expect(contributors).toBeInstanceOf(Array);
      expect(contributors.length).toBe(1);
      expect(contributors[0].name).toBe('User One');
      expect(contributors[0].commits).toBe(1);
    });
  });

  // --- Test getFiles ---
  describe('getFiles', () => {
    it('should fetch files from root successfully', async () => {
      const files = await service.getFiles(TEST_PROJECT_ID, ''); // Empty path for root
      expect(files).toBeInstanceOf(Array);
      expect(files.length).toBeGreaterThan(0);
      expect(files.find(f => f.path === 'README.md')).toBeDefined();
    });
     it('should fetch files from a specific path successfully', async () => {
      const specificPath = 'src/';
      // Override generic /tree handler for a more specific check if needed,
      // or rely on generic handler to return something for any path.
      // For now, assume generic handler is sufficient.
      const files = await service.getFiles(TEST_PROJECT_ID, specificPath);
      expect(files).toBeInstanceOf(Array);
    });
  });

  // --- Test getPullRequests (Merge Requests) ---
  describe('getPullRequests', () => {
    const timeFilter: TimeFilter = {
      startDate: '2023-01-01T00:00:00Z',
      endDate: new Date().toISOString(), // to now, to catch recent mock MRs
    };
    it('should fetch merge requests successfully', async () => {
      // This relies on generic handlers for list and detail
      const mrs = await service.getPullRequests(TEST_PROJECT_ID, timeFilter);
      expect(mrs).toBeInstanceOf(Array);
      expect(mrs.length).toBeGreaterThan(0);
      expect(mrs[0].id).toBeDefined(); // mockGitLabMergeRequest uses iid for id field in our type
      expect(mrs[0].title).toBeDefined();
      expect(mrs[0].author).toBeDefined();
    });
  });
});
