import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { server } from '@/mocks/server' // Adjust path if necessary, assuming @ is src
import { http } from 'msw' // Changed from rest to http
import { GithubService } from '../github.service' // Adjust path
import type { TimeFilter } from '@/types/repository'

// Mock the actual fetch to ensure MSW handles all requests
// vitest.mock('node-fetch'); // Or 'undici' if that's what Vite/Vitest uses internally

const GITHUB_BASE_URL = 'https://api.github.com'
const VALID_TOKEN = 'VALID_TOKEN'
const INVALID_TOKEN = 'INVALID_TOKEN'
const TEST_OWNER = 'testowner'
const TEST_REPO = 'testrepo'

// --- MSW Server Setup ---
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('GithubService', () => {
  let service: GithubService

  beforeEach(() => {
    service = new GithubService()
    // Important: Set the token for each test case that requires authentication
  })

  // --- Test validateToken ---
  describe('validateToken', () => {
    it('should return true for a valid token', async () => {
      service.setToken(VALID_TOKEN)
      const isValid = await service.validateToken()
      expect(isValid).toBe(true)
    })

    it('should return false for an invalid token', async () => {
      service.setToken(INVALID_TOKEN)
      // Mock a 401 response for this specific case if not already handled by default mock
      server.use(
        http.get(`${GITHUB_BASE_URL}/user`, ({request}) => {
          if (request.headers.get('Authorization') === `Bearer ${INVALID_TOKEN}`) {
            // Using explicit Response to ensure statusText is set
            return new Response(JSON.stringify({ message: 'Bad credentials' }), {
              status: 401,
              statusText: 'Unauthorized', // Matches GitHub's typical response
              headers: { 'Content-Type': 'application/json' }
            });
          }
        })
      )
      const isValid = await service.validateToken()
      expect(isValid).toBe(false)
    })

    it('should return false if API request fails', async () => {
      service.setToken(VALID_TOKEN)
      server.use(
        http.get(`${GITHUB_BASE_URL}/user`, ({request}) => {
          return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'Content-Type': 'application/json' }
          });
        })
      )
      const isValid = await service.validateToken()
      expect(isValid).toBe(false)
    })
  })

  // --- Test getRepositories ---
  describe('getRepositories', () => {
    it('should fetch repositories for an authenticated user', async () => {
      service.setToken(VALID_TOKEN)
      const repos = await service.getRepositories()
      expect(repos).toBeInstanceOf(Array)
      expect(repos.length).toBeGreaterThan(0)
      expect(repos[0].name).toBe('repo1')
    })

    it('should throw an error if not authenticated', async () => {
      service.setToken(INVALID_TOKEN)
      server.use(
        http.get(`${GITHUB_BASE_URL}/user/repos`, ({request}) => {
           if (request.headers.get('Authorization') === `Bearer ${INVALID_TOKEN}`) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), {
              status: 401,
              statusText: 'Unauthorized',
              headers: { 'Content-Type': 'application/json' }
            });
          }
        })
      )
      await expect(service.getRepositories()).rejects.toThrow('GitHub API error: Unauthorized')
    })
  })

  // --- Test getBranches ---
  describe('getBranches', () => {
    it('should fetch branches for a repository', async () => {
      service.setToken(VALID_TOKEN)
      const branches = await service.getBranches(TEST_OWNER, TEST_REPO)
      expect(branches).toBeInstanceOf(Array)
      expect(branches.length).toBeGreaterThan(0)
      expect(branches.some(b => b.name === 'main' && b.protected)).toBe(true)
      expect(branches.some(b => b.name === 'develop' && !b.protected)).toBe(true)
    })

    it('should throw error if API fails for branches', async () => {
      service.setToken(VALID_TOKEN)
      server.use(
        http.get(`${GITHUB_BASE_URL}/repos/${TEST_OWNER}/${TEST_REPO}/branches`, ({request}) => {
          return new Response(null, { status: 500, statusText: 'Internal Server Error' });
        })
      )
      await expect(service.getBranches(TEST_OWNER, TEST_REPO)).rejects.toThrow('GitHub API error: Internal Server Error')
    })
  })

  // --- Test getCommits ---
  describe('getCommits', () => {
    const timeFilter: TimeFilter = {
      startDate: new Date('2023-01-01T00:00:00Z').toISOString(),
      endDate: new Date('2023-01-31T23:59:59Z').toISOString(),
    }

    it('should fetch commits within a time range', async () => {
      service.setToken(VALID_TOKEN)
      const commits = await service.getCommits(TEST_OWNER, TEST_REPO, timeFilter)
      expect(commits).toBeInstanceOf(Array)
      expect(commits.length).toBe(2) // Based on mock handler
      expect(commits[0].id).toBe('commit-sha-1')
      expect(commits[0].stats).toBeUndefined() // The service transforms this
      expect(commits[0].code_added).toBeGreaterThanOrEqual(0)
      expect(commits[0].code_removed).toBeGreaterThanOrEqual(0)
    })
  })

  // --- Test getPipelines ---
  describe('getPipelines', () => {
    const timeFilter: TimeFilter = {
      startDate: new Date('2023-01-01T00:00:00Z').toISOString(),
      endDate: new Date('2023-01-31T23:59:59Z').toISOString(),
    }

    it('should fetch pipelines within a time range', async () => {
      service.setToken(VALID_TOKEN)
      const pipelines = await service.getPipelines(TEST_OWNER, TEST_REPO, timeFilter)
      expect(pipelines).toBeInstanceOf(Array)
      expect(pipelines.length).toBe(2) // Based on mock handler
      expect(pipelines[0].status).toBe('success')
      expect(pipelines[1].status).toBe('running')
    })
  })

  // --- Test getContributors ---
  describe('getContributors', () => {
     const timeFilter: TimeFilter = { // getContributors calls getCommits internally
      startDate: new Date(0).toISOString(),
      endDate: new Date().toISOString(),
    };
    it('should fetch contributors for a repository', async () => {
      service.setToken(VALID_TOKEN)
      const contributors = await service.getContributors(TEST_OWNER, TEST_REPO, timeFilter)
      console.log('[TEST] getContributors response:', JSON.stringify(contributors, null, 2));
      expect(contributors).toBeInstanceOf(Array)
      expect(contributors.length).toBe(2)
      // Ordering might not be guaranteed, so check for presence instead of exact index.
      expect(contributors.some(c => c.name === 'testuser' && c.avatar_url)).toBe(true);
      expect(contributors.some(c => c.name === 'anotheruser' && c.avatar_url)).toBe(true);
    })
  })

  // --- Test getFiles ---
  describe('getFiles', () => {
    it('should fetch files from the root directory', async () => {
      service.setToken(VALID_TOKEN)
      const files = await service.getFiles(TEST_OWNER, TEST_REPO)
      expect(files).toBeInstanceOf(Array)
      expect(files.length).toBe(2) // README.md and src dir from mock
      expect(files.find(f => f.path === 'README.md')?.type).toBe('file')
      expect(files.find(f => f.path === 'src')?.type).toBe('dir')
    })

    it('should fetch files from a specific path', async () => {
      service.setToken(VALID_TOKEN)
      const specificPath = "src/myFile.ts"
      // Modify handler for this specific test case to return a single file object
      server.use(
        http.get(`${GITHUB_BASE_URL}/repos/${TEST_OWNER}/${TEST_REPO}/contents/${specificPath}`, ({request, params, cookies}) => {
          console.log(`[MSW_TEST_OVERRIDE] Matched GET /repos/${TEST_OWNER}/${TEST_REPO}/contents/${specificPath}`);
          // Using new Response to ensure it's considered .ok
          return new Response(JSON.stringify({
            name: 'myFile.ts',
            path: specificPath,
            type: 'file',
            size: 123,
            last_modified: new Date().toISOString()
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        })
      );
      const files = await service.getFiles(TEST_OWNER, TEST_REPO, specificPath)
      expect(files).toBeInstanceOf(Array)
      expect(files.length).toBe(1)
      expect(files[0].path).toBe(specificPath)
      expect(files[0].type).toBe('file')
    })
  })

  // --- Test getPullRequests ---
  describe('getPullRequests', () => {
    const timeFilter: TimeFilter = {
      startDate: new Date('2023-01-01T00:00:00Z').toISOString(),
      endDate: new Date('2024-12-31T23:59:59Z').toISOString(), // Wide range to catch all mock PRs
    }

    it('should fetch pull requests within a time range', async () => {
      service.setToken(VALID_TOKEN)
      // Adjust timeFilter to ensure mock PRs (created recently) are included
      const today = new Date();
      const fewDaysAgo = new Date(new Date().setDate(today.getDate() - 7)); // Mock PRs are created 1-3 days ago by handler
      const fewDaysHence = new Date(new Date().setDate(today.getDate() + 7));
      const timeFilter: TimeFilter = {
        startDate: fewDaysAgo.toISOString(),
        endDate: fewDaysHence.toISOString()
      };
      console.log('[TEST] getPullRequests timeFilter:', timeFilter);
      // The generic handler in handlers.ts creates PRs dated 1, 2, 3 days ago. This filter should include them.

      const prs = await service.getPullRequests(TEST_OWNER, TEST_REPO, timeFilter)
      console.log('[TEST] getPullRequests received PRs:', JSON.stringify(prs.map(p => ({id: p.id, createdAt: p.createdAt})), null, 2));
      expect(prs).toBeInstanceOf(Array)
      expect(prs.length).toBe(3)
      const openPr = prs.find(pr => pr.id === 1)
      expect(openPr).toBeDefined()
      expect(openPr?.state).toBe('open')
      expect(openPr?.timeToFirstReview).toBeDefined()
      expect(openPr?.additions).toBeGreaterThan(0)

      const mergedPr = prs.find(pr => pr.id === 2)
      expect(mergedPr?.state).toBe('merged')
      expect(mergedPr?.timeToMerge).toBeDefined()
    })

     it('should handle API error when fetching pull requests', async () => {
      service.setToken(VALID_TOKEN)
      const today = new Date();
      const fewDaysAgo = new Date(new Date().setDate(today.getDate() - 7));
      const fewDaysHence = new Date(new Date().setDate(today.getDate() + 7));
      const timeFilter: TimeFilter = { startDate: fewDaysAgo.toISOString(), endDate: fewDaysHence.toISOString() };
       server.use(
        http.get(`${GITHUB_BASE_URL}/repos/${TEST_OWNER}/${TEST_REPO}/pulls`, ({request}) => {
          return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'Content-Type': 'application/json' }
          });
        })
      )
      await expect(service.getPullRequests(TEST_OWNER, TEST_REPO, timeFilter)).rejects.toThrow('GitHub API error: Internal Server Error')
    })

    it('should correctly calculate timeToFirstReview and timeToMerge', async () => {
        service.setToken(VALID_TOKEN);
        // Let's use a specific PR ID for detailed check
        const prIdToCheck = 1;
        const prCreateDate = '2023-03-01T10:00:00Z';
        const firstReviewDate = '2023-03-01T12:00:00Z';

        const timeFilterForSpecificPr: TimeFilter = {
            startDate: '2023-03-01T00:00:00Z', // Ensure this range includes prCreateDate
            endDate: '2023-03-02T00:00:00Z',
        };
        console.log('[TEST] timeToFirstReview timeFilter:', timeFilterForSpecificPr);


        // Override generic PR handler for this specific PR ID to control dates precisely
        console.log(`[TEST] Setting up server.use for PR details/reviews for prIdToCheck: ${prIdToCheck} (timeToFirstReview test)`);
        server.resetHandlers(); // Explicitly reset before using test-specific handlers
        server.use(
          // Ensure the LIST call returns the PR we want to detail, matching the timeFilter
          http.get(`${GITHUB_BASE_URL}/repos/${TEST_OWNER}/${TEST_REPO}/pulls`, ({request}) => {
            const url = new URL(request.url);
            // This log helps verify the specific override for /pulls is being used.
            console.log(`[MSW_TEST_OVERRIDE - timeToFirstReview] Matched GET /repos/${TEST_OWNER}/${TEST_REPO}/pulls with params: ${url.search}`);
            // Ensure this mock PR's createdAt is within timeFilterForSpecificPr
            const simplifiedMockPr = {
              id: prIdToCheck,
              number: prIdToCheck,
              title: 'Test PR for timeToFirstReview',
              state: 'open',
              created_at: prCreateDate, // This is '2023-03-01T10:00:00Z'
              user: { login: 'testuser', id: 1 }, // Minimal user
              head: { ref: 'feature-x', sha: 'sha-head' }, // Minimal head
              base: { ref: 'main', sha: 'sha-base' },     // Minimal base
              // Add other fields only if absolutely necessary for later processing in the service method
            };
            console.log(`[MSW_TEST_OVERRIDE - timeToFirstReview] /pulls list mock data for PR ${prIdToCheck}:`, JSON.stringify(simplifiedMockPr));
            return new Response(JSON.stringify([simplifiedMockPr]), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            });
          }),
          http.get(`${GITHUB_BASE_URL}/repos/${TEST_OWNER}/${TEST_REPO}/pulls/${prIdToCheck}`, ({request, params, cookies}) => {
            console.log(`[MSW_TEST_OVERRIDE - timeToFirstReview] Matched GET /repos/${TEST_OWNER}/${TEST_REPO}/pulls/${prIdToCheck} (details)`);
            const detailMockData = {
                ...mockPullRequest(prIdToCheck, 'open', 'feature-x', 'main', prCreateDate),
                created_at: prCreateDate,
                updated_at: firstReviewDate,
                user: { login: 'testuser', id: 1 },
                head: { ref: 'feature', sha: 'sha-head', repo: mockGitHubRepos[0] },
                base: { ref: 'main', sha: 'sha-base', repo: mockGitHubRepos[0] },
                additions: 10, deletions: 2, changed_files: 1,
                comments: 0, review_comments: 0,
              };
            return new Response(JSON.stringify(detailMockData), {
              status: 200, headers: { 'Content-Type': 'application/json'}
            });
          }),
          http.get(`${GITHUB_BASE_URL}/repos/${TEST_OWNER}/${TEST_REPO}/pulls/${prIdToCheck}/reviews`, ({request, params, cookies}) => {
            console.log(`[MSW_TEST_OVERRIDE - timeToFirstReview] Matched GET /repos/${TEST_OWNER}/${TEST_REPO}/pulls/${prIdToCheck}/reviews`);
            const reviewMock = [{ id: 1, user: { login: 'reviewer' }, submitted_at: firstReviewDate }];
            return new Response(JSON.stringify(reviewMock), {
              status: 200, headers: { 'Content-Type': 'application/json'}
            });
          })
        );

        const prs = await service.getPullRequests(TEST_OWNER, TEST_REPO, timeFilterForSpecificPr);
        console.log('[TEST] timeToFirstReview received PRs:', JSON.stringify(prs.map(p=> ({id: p.id, createdAt: p.createdAt})), null, 2));

        const specificPr = prs.find(pr => pr.id === prIdToCheck);
        expect(specificPr).toBeDefined();
        // Time to first review: 12:00:00Z - 10:00:00Z = 2 hours
        expect(specificPr?.timeToFirstReview).toBeCloseTo(2);
    });
  })
})
