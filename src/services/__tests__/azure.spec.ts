import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { server } from '@/mocks/server'
import { http } from 'msw'
import { AzureService } from '../azure.service'
import type { TimeFilter } from '@/types/repository'

const AZURE_BASE_URL = 'https://dev.azure.com'
const TEST_ORGANIZATION = 'test-org'
const TEST_PROJECT_ID = 'project1' // Matches mockAzureProjects
const TEST_PROJECT_NAME = 'Project Alpha' // Matches mockAzureProjects
const TEST_REPO_ID = 'repo1' // Matches mockAzureRepo
const VALID_AZURE_TOKEN = 'VALID_AZURE_PAT'
const INVALID_AZURE_TOKEN = 'INVALID_AZURE_PAT' // For testing auth errors

// --- MSW Server Setup ---
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('AzureService', () => {
  let service: AzureService

  beforeEach(() => {
    service = new AzureService()
    service.setToken(VALID_AZURE_TOKEN)
    service.setOrganization(TEST_ORGANIZATION)
    // Note: some mock handlers in handlers.ts might use a hardcoded "test-org"
    // ensure TEST_ORGANIZATION matches that, or make mocks more dynamic
  })

  // --- Test validateToken ---
  describe('validateToken', () => {
    it('should return true for a valid token', async () => {
      const isValid = await service.validateToken()
      expect(isValid).toBe(true)
    })

    it('should return false for an invalid token or API error', async () => {
      service.setToken(INVALID_AZURE_TOKEN) // Use a token the mock handler will reject
      server.use(
        http.get(`${AZURE_BASE_URL}/${TEST_ORGANIZATION}/_apis/projects`, ({ request }) => {
          const auth = request.headers.get('Authorization') || '';
          // Assuming checkAzureAuth in handlers.ts would fail for INVALID_AZURE_TOKEN
          // or we can force a 401 if the token is "INVALID..."
          // For this test, let's ensure our mock specifically returns 401 for this token
          const expectedInvalidAuth = `Basic ${btoa(`:${INVALID_AZURE_TOKEN}`)}`;
          if (auth === expectedInvalidAuth) {
            return new Response(JSON.stringify({ message: 'Auth failed' }), { status: 401, statusText: 'Unauthorized' })
          }
          // Fallback for other types of errors, or if the generic handler doesn't differentiate enough
          return new Response(JSON.stringify({ message: 'Generic error' }), { status: 500, statusText: 'Server Error' })
        })
      )
      const isValid = await service.validateToken()
      expect(isValid).toBe(false)
    })
  })

  // --- Test getProjects ---
  describe('getProjects', () => {
    it('should fetch projects successfully', async () => {
      const projects = await service.getProjects()
      expect(projects).toBeInstanceOf(Array)
      expect(projects.length).toBeGreaterThan(0)
      expect(projects[0].id).toBe('project1')
      expect(projects[0].name).toBe('Project Alpha')
    })

    it('should throw an error if API request fails for getProjects', async () => {
      server.use(
        http.get(`${AZURE_BASE_URL}/${TEST_ORGANIZATION}/_apis/projects`, ({ request }) => {
          return new Response(JSON.stringify({ message: 'Server Error' }), {
            status: 500, statusText: 'Server Error', headers: { 'Content-Type': 'application/json' }
          })
        })
      )
      await expect(service.getProjects()).rejects.toThrow('Azure DevOps API request failed: Server Error')
    })
  })

  // --- Test getRepositories ---
  describe('getRepositories', () => {
    it('should fetch repositories for the organization if no projectId is given', async () => {
      const repos = await service.getRepositories() // No project ID
      expect(repos).toBeInstanceOf(Array)
      expect(repos.length).toBeGreaterThan(0)
      // Based on the generic org-level handler in handlers.ts
      expect(repos[0].name).toBe('OrgRepo1')
    })

    it('should fetch repositories for a specific project if projectId is given', async () => {
      // This test relies on the :organization/_apis/:projectId/git/repositories handler
      const repos = await service.getRepositories(TEST_PROJECT_ID)
      expect(repos).toBeInstanceOf(Array)
      expect(repos.length).toBeGreaterThan(0)
      expect(repos[0].name).toBe('ProjectRepo1')
      expect(repos[0].project.id).toBe(TEST_PROJECT_ID)
    })

     it('should throw an error if API request fails for getRepositories (org level)', async () => {
      server.use(
        http.get(`${AZURE_BASE_URL}/${TEST_ORGANIZATION}/_apis/git/repositories`, ({ request }) => {
          return new Response(JSON.stringify({ message: 'Repo Fetch Error' }), {
            status: 500, statusText: 'Repo Fetch Error', headers: { 'Content-Type': 'application/json' }
          })
        })
      )
      await expect(service.getRepositories()).rejects.toThrow('Azure DevOps API request failed: Repo Fetch Error')
    })
  })

  // --- Test getBranchStats ---
  describe('getBranchStats', () => {
    it('should fetch branch stats successfully', async () => {
      // This test relies on the :organization/_apis/:projectId/git/repositories/:repoId/stats/branches handler
      const stats = await service.getBranchStats(TEST_PROJECT_ID, TEST_REPO_ID);
      expect(stats).toBeInstanceOf(Array);
      expect(stats[0].name).toBe('main');
    });

    it('should throw an error if API request fails for getBranchStats', async () => {
      server.use(
        http.get(`${AZURE_BASE_URL}/${TEST_ORGANIZATION}/_apis/${TEST_PROJECT_ID}/git/repositories/${TEST_REPO_ID}/stats/branches`, () => {
          return new Response(null, { status: 500, statusText: 'Stats Error' });
        })
      );
      await expect(service.getBranchStats(TEST_PROJECT_ID, TEST_REPO_ID)).rejects.toThrow('Stats Error');
    });
  });

  // --- Test getCommits ---
  describe('getCommits', () => {
    const timeFilter: TimeFilter = {
      startDate: new Date('2023-01-01T00:00:00Z').toISOString(),
      endDate: new Date('2023-01-31T23:59:59Z').toISOString(),
    }
    it('should fetch commits successfully', async () => {
      // This test relies on the generic handlers for:
      // 1. /_apis/projects/:projectId (to get project name TEST_PROJECT_NAME)
      // 2. /:organization/:projectName/_apis/git/repositories/:repoId/commits
      const commits = await service.getCommits(TEST_PROJECT_ID, TEST_REPO_ID, timeFilter)
      expect(commits).toBeInstanceOf(Array)
      expect(commits.length).toBeGreaterThan(0)
      expect(commits[0].id).toBe('commit1')
    })
  })

  // --- Test getPipelines ---
  describe('getPipelines', () => {
    const timeFilter: TimeFilter = {
      startDate: new Date('2023-01-01T00:00:00Z').toISOString(),
      endDate: new Date('2023-01-31T23:59:59Z').toISOString(),
    }
    it('should fetch pipelines successfully', async () => {
      // Relies on:
      // 1. /_apis/projects/:projectId (to get project name TEST_PROJECT_NAME)
      // 2. /:organization/:projectName/_apis/build/builds
      const pipelines = await service.getPipelines(TEST_PROJECT_ID, TEST_REPO_ID, timeFilter)
      expect(pipelines).toBeInstanceOf(Array)
      expect(pipelines.length).toBeGreaterThan(0)
      expect(pipelines[0].id).toBe(1)
      expect(pipelines[0].status).toBe('success')
    })
  })

  // --- Test getBranches ---
  describe('getBranches', () => {
    it('should fetch branches successfully', async () => {
      // Relies on:
      // 1. /_apis/projects/:projectId (to get project name TEST_PROJECT_NAME)
      // 2. /:organization/:projectName/_apis/git/repositories/:repoId/refs
      const branches = await service.getBranches(TEST_PROJECT_ID, TEST_REPO_ID);
      expect(branches).toBeInstanceOf(Array);
      expect(branches.length).toBeGreaterThan(0);
      expect(branches.find(b => b.name === 'main')).toBeDefined();
    });
  });

  // --- Test getFiles ---
  describe('getFiles', () => {
    it('should fetch files successfully', async () => {
      // Relies on:
      // 1. /_apis/projects/:projectId (to get project name TEST_PROJECT_NAME)
      // 2. /:organization/:projectName/_apis/git/repositories/:repoId/items
      const files = await service.getFiles(TEST_PROJECT_ID, TEST_REPO_ID);
      expect(files).toBeInstanceOf(Array);
      expect(files.length).toBeGreaterThan(0);
      expect(files.find(f => f.path === '/file.ts' && f.type === 'blob')).toBeDefined();
    });
  });

  // --- Test getPullRequests ---
  describe('getPullRequests', () => {
    const timeFilter: TimeFilter = {
      startDate: new Date('2023-01-01T00:00:00Z').toISOString(),
      endDate: new Date('2024-12-31T23:59:59Z').toISOString(),
    };
    it('should fetch pull requests successfully', async () => {
      // This test relies on generic handlers for:
      // 1. /_apis/projects/:projectId (to get project name TEST_PROJECT_NAME)
      // 2. /:organization/:projectName/_apis/git/repositories/:repoId/pullrequests (list)
      // 3. /:organization/:projectName/_apis/git/repositories/:repoId/pullrequests/:prId (detail, in loop)
      // 4. /:organization/:projectName/_apis/git/repositories/:repoId/pullrequests/:prId/threads (threads, in loop)
      const prs = await service.getPullRequests(TEST_PROJECT_ID, TEST_REPO_ID, timeFilter);
      expect(prs).toBeInstanceOf(Array);
      expect(prs.length).toBeGreaterThan(0);
      expect(prs[0].id).toBe(1);
      expect(prs[0].title).toBe('My First PR');
      expect(prs[0].author).toBeDefined();
      expect(prs[0].reviewers).toBeInstanceOf(Array);
    });
  });
})
