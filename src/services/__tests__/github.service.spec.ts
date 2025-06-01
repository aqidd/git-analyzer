// Import necessary modules
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GithubService } from '../github.service';

// Mock the global fetch function
global.fetch = vi.fn();

describe('GithubService', () => {
  let githubService: GithubService;
  const mockToken = 'test_token';
  const mockOwner = 'test_owner';
  const mockRepoName = 'test_repo';

  beforeEach(() => {
    githubService = new GithubService();
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  describe('validateToken', () => {
    beforeEach(() => {
      githubService.setToken(mockToken); // Ensure token is set for the service instance
    });

    it('should return true for a valid token', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      const isValid = await githubService.validateToken(); // No token arg needed here
      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${mockToken}`,
        },
      });
    });

    it('should return false for an invalid token (API returns error)', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" });
      // Token is set via setToken, validateToken doesn't take it as arg
      const isValid = await githubService.validateToken();
      expect(isValid).toBe(false);
    });

    it('should return false if the API call fails (network error)', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const isValid = await githubService.validateToken();
      expect(isValid).toBe(false);
    });
  });

  describe('getRepositories', () => {
    beforeEach(() => {
      githubService.setToken(mockToken);
    });

    it('should return a list of repositories for a valid token', async () => {
      const mockRepos = [{ name: 'repo1' }, { name: 'repo2' }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos,
      });
      const repos = await githubService.getRepositories(); // No token arg
      expect(repos).toEqual(mockRepos);
      expect(fetch).toHaveBeenCalledWith('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${mockToken}`,
        },
      });
    });

    it('should throw an error if the token is invalid or causes an error', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" });
      // The service method will throw an error, which the caller should handle or test for.
      await expect(githubService.getRepositories()).rejects.toThrow('GitHub API error: Unauthorized');
    });

    it('should throw an error if the API call fails (network error)', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(githubService.getRepositories()).rejects.toThrow('Network Error');
    });
  });

  describe('getBranches', () => {
    beforeEach(() => {
      githubService.setToken(mockToken);
    });

    it('should return a list of branches with commit details', async () => {
      const mockAllBranchesResponse = [
        { name: 'main', commit: { sha: 'sha-main' } },
        { name: 'dev', commit: { sha: 'sha-dev' } },
      ];
      const mockProtectedBranchesResponse = [ { name: 'main' } ]; // main is protected
      const mockMainCommitResponse = { commit: { author: { name: 'Author Main', date: '2023-01-01T00:00:00Z' }, message: 'Commit on main' } };
      const mockDevCommitResponse = { commit: { author: { name: 'Author Dev', date: '2023-01-02T00:00:00Z' }, message: 'Commit on dev' } };

      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockAllBranchesResponse, statusText: 'OK' }) // Call 1: Get all branches
        .mockResolvedValueOnce({ ok: true, json: async () => mockProtectedBranchesResponse, statusText: 'OK' }) // Call 2: Get protected branches
        .mockResolvedValueOnce({ ok: true, json: async () => mockMainCommitResponse, statusText: 'OK' })    // Call 3: Commit details for main
        .mockResolvedValueOnce({ ok: true, json: async () => mockDevCommitResponse, statusText: 'OK' });     // Call 4: Commit details for dev

      const branches = await githubService.getBranches(mockOwner, mockRepoName);

      expect(branches).toEqual([
        { name: 'main', lastCommitDate: '2023-01-01T00:00:00Z', lastCommitSha: 'sha-main', lastCommitMessage: 'Commit on main', lastCommitAuthor: 'Author Main', protected: true },
        { name: 'dev', lastCommitDate: '2023-01-02T00:00:00Z', lastCommitSha: 'sha-dev', lastCommitMessage: 'Commit on dev', lastCommitAuthor: 'Author Dev', protected: false },
      ]);

      const expectedHeaders = { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${mockToken}` };
      expect(fetch).toHaveBeenNthCalledWith(1, `https://api.github.com/repos/${mockOwner}/${mockRepoName}/branches`, { headers: expectedHeaders });
      expect(fetch).toHaveBeenNthCalledWith(2, `https://api.github.com/repos/${mockOwner}/${mockRepoName}/branches?protected=true`, { headers: expectedHeaders });
      expect(fetch).toHaveBeenNthCalledWith(3, `https://api.github.com/repos/${mockOwner}/${mockRepoName}/commits/sha-main`, { headers: expectedHeaders });
      expect(fetch).toHaveBeenNthCalledWith(4, `https://api.github.com/repos/${mockOwner}/${mockRepoName}/commits/sha-dev`, { headers: expectedHeaders });
    });

    it('should throw an error if the first API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error for all branches'));
      await expect(githubService.getBranches(mockOwner, mockRepoName)).rejects.toThrow('Network Error for all branches');
    });

    it('should throw an error if fetching protected branches fails', async () => {
      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [{ name: 'main', commit: { sha: 'sha-main' } }], statusText: 'OK' }) // All branches
        .mockRejectedValueOnce(new Error('Network Error for protected branches')); // Protected branches fail
      await expect(githubService.getBranches(mockOwner, mockRepoName)).rejects.toThrow('Network Error for protected branches');
    });

    it('should throw an error if fetching a commit detail fails', async () => {
      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [{ name: 'main', commit: { sha: 'sha-main' } }], statusText: 'OK' }) // All branches
        .mockResolvedValueOnce({ ok: true, json: async () => [], statusText: 'OK' }) // Protected branches
        .mockRejectedValueOnce(new Error('Network Error for commit detail')); // Commit detail fails
      await expect(githubService.getBranches(mockOwner, mockRepoName)).rejects.toThrow('Network Error for commit detail');
    });
  });

  describe('getCommits', () => {
    const mockTimeFilter: TimeFilter = { startDate: '2023-01-01T00:00:00Z', endDate: '2023-01-31T23:59:59Z' };
    const expectedHeaders = { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${mockToken}` };

    beforeEach(() => {
      githubService.setToken(mockToken);
    });

    it('should return a list of commits with details', async () => {
      const mockCommitsListResponse = [
        { sha: 'sha1', commit: { author: { name: 'Author1', email: 'email1', date: '2023-01-10T10:00:00Z' }, message: 'Commit 1' }, html_url: 'url1' },
        { sha: 'sha2', commit: { author: { name: 'Author2', email: 'email2', date: '2023-01-11T10:00:00Z' }, message: 'Commit 2' }, html_url: 'url2' },
      ];
      const mockCommitDetail1Response = { stats: { additions: 10, deletions: 2 } };
      const mockCommitDetail2Response = { stats: { additions: 5, deletions: 3 } };

      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCommitsListResponse, statusText: 'OK' }) // Initial list
        .mockResolvedValueOnce({ ok: true, json: async () => mockCommitDetail1Response, statusText: 'OK' }) // Detail for sha1
        .mockResolvedValueOnce({ ok: true, json: async () => mockCommitDetail2Response, statusText: 'OK' }); // Detail for sha2

      const commits = await githubService.getCommits(mockOwner, mockRepoName, mockTimeFilter);

      expect(commits).toEqual([
        { id: 'sha1', message: 'Commit 1', author_name: 'Author1', author_email: 'email1', created_at: '2023-01-10T10:00:00Z', html_url: 'url1', code_added: 10, code_removed: 2 },
        { id: 'sha2', message: 'Commit 2', author_name: 'Author2', author_email: 'email2', created_at: '2023-01-11T10:00:00Z', html_url: 'url2', code_added: 5, code_removed: 3 },
      ]);

      const listUrl = `https://api.github.com/repos/${mockOwner}/${mockRepoName}/commits?since=${mockTimeFilter.startDate}&until=${mockTimeFilter.endDate}&per_page=100`;
      expect(fetch).toHaveBeenNthCalledWith(1, listUrl, { headers: expectedHeaders });
      expect(fetch).toHaveBeenNthCalledWith(2, `https://api.github.com/repos/${mockOwner}/${mockRepoName}/commits/sha1`, { headers: expectedHeaders });
      expect(fetch).toHaveBeenNthCalledWith(3, `https://api.github.com/repos/${mockOwner}/${mockRepoName}/commits/sha2`, { headers: expectedHeaders });
    });

    it('should throw an error if the initial commit list API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error for commit list'));
      await expect(githubService.getCommits(mockOwner, mockRepoName, mockTimeFilter)).rejects.toThrow('Network Error for commit list');
    });

    it('should throw an error if a commit detail API call fails', async () => {
      const mockCommitsListResponse = [{ sha: 'sha1', commit: { author: {}, message: '' } }];
      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCommitsListResponse, statusText: 'OK' })
        .mockRejectedValueOnce(new Error('Network Error for commit detail'));
      await expect(githubService.getCommits(mockOwner, mockRepoName, mockTimeFilter)).rejects.toThrow('Network Error for commit detail');
    });
  });

  describe('getPipelines', () => {
    const mockTimeFilter: TimeFilter = { startDate: '2023-01-01T00:00:00Z', endDate: '2023-01-31T23:59:59Z' };
    const expectedHeaders = { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${mockToken}` };

    beforeEach(() => {
      githubService.setToken(mockToken);
    });

    it('should return a list of pipelines with mapped statuses', async () => {
      const mockApiResponse = {
        workflow_runs: [
          { id: 1, status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: 'sha1', html_url: 'url1', created_at: '2023-01-10T10:00:00Z', updated_at: '2023-01-10T10:05:00Z' },
          { id: 2, status: 'in_progress', conclusion: null, head_branch: 'dev', head_sha: 'sha2', html_url: 'url2', created_at: '2023-01-11T10:00:00Z', updated_at: '2023-01-11T10:05:00Z' },
          { id: 3, status: 'queued', conclusion: null, head_branch: 'feat', head_sha: 'sha3', html_url: 'url3', created_at: '2023-01-12T10:00:00Z', updated_at: '2023-01-12T10:05:00Z' },
        ]
      };
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse, statusText: 'OK' });

      const pipelines = await githubService.getPipelines(mockOwner, mockRepoName, mockTimeFilter);

      expect(pipelines).toEqual([
        { id: 1, status: 'success', conclusion: 'success', ref: 'main', sha: 'sha1', html_url: 'url1', created_at: '2023-01-10T10:00:00Z', updated_at: '2023-01-10T10:05:00Z' },
        { id: 2, status: 'running', conclusion: null, ref: 'dev', sha: 'sha2', html_url: 'url2', created_at: '2023-01-11T10:00:00Z', updated_at: '2023-01-11T10:05:00Z' },
        { id: 3, status: 'pending', conclusion: null, ref: 'feat', sha: 'sha3', html_url: 'url3', created_at: '2023-01-12T10:00:00Z', updated_at: '2023-01-12T10:05:00Z' },
      ]);
      const expectedUrl = `https://api.github.com/repos/${mockOwner}/${mockRepoName}/actions/runs?created=${mockTimeFilter.startDate}..${mockTimeFilter.endDate}&per_page=100`;
      expect(fetch).toHaveBeenCalledWith(expectedUrl, { headers: expectedHeaders });
    });

    it('should throw an error if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(githubService.getPipelines(mockOwner, mockRepoName, mockTimeFilter)).rejects.toThrow('Network Error');
    });

    it('should throw an error if response is not ok', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, statusText: 'Forbidden' });
      await expect(githubService.getPipelines(mockOwner, mockRepoName, mockTimeFilter)).rejects.toThrow('GitHub API error: Forbidden');
    });

    it('should throw an error if workflow_runs is missing', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}), statusText: 'OK' }); // Missing workflow_runs
      // This will cause a TypeError in the service's .map call, which will be caught by Promise.all or bubble up
      await expect(githubService.getPipelines(mockOwner, mockRepoName, mockTimeFilter)).rejects.toThrow(TypeError);
    });
  });

  describe('getContributors', () => {
    const mockTimeFilter: TimeFilter = { startDate: '2023-01-01T00:00:00Z', endDate: '2023-01-31T23:59:59Z' };
    const expectedHeaders = { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${mockToken}` };

    beforeEach(() => {
      githubService.setToken(mockToken);
    });

    it('should return a list of contributors with aggregated data', async () => {
      // Mocks for internal getCommits call
      const mockCommitsListResponse = [
        { sha: 'sha1', commit: { author: { name: 'Author1', email: 'author1@example.com', date: '2023-01-10T00:00:00Z' }, message: 'Commit 1' }, html_url: 'url1' },
        { sha: 'sha2', commit: { author: { name: 'Author1', email: 'author1@example.com', date: '2023-01-11T00:00:00Z' }, message: 'Commit 2' }, html_url: 'url2' },
        { sha: 'sha3', commit: { author: { name: 'Author2', email: 'author2@example.com', date: '2023-01-12T00:00:00Z' }, message: 'Commit 3' }, html_url: 'url3' },
      ];
      const mockCommitDetail1Response = { stats: { additions: 10, deletions: 2 } };
      const mockCommitDetail2Response = { stats: { additions: 5, deletions: 3 } };
      const mockCommitDetail3Response = { stats: { additions: 8, deletions: 1 } };

      // Mock for the additional /contributors call
      const mockContributorsDetailsResponse = [
        { login: 'Author1', email: 'author1@example.com', avatar_url: 'avatar1_url' },
        { login: 'Author2', email: 'author2@example.com', avatar_url: 'avatar2_url' },
      ];

      (fetch as vi.Mock)
        // Mocks for getCommits part
        .mockResolvedValueOnce({ ok: true, json: async () => mockCommitsListResponse, statusText: 'OK' }) // Commits list
        .mockResolvedValueOnce({ ok: true, json: async () => mockCommitDetail1Response, statusText: 'OK' }) // Detail for sha1
        .mockResolvedValueOnce({ ok: true, json: async () => mockCommitDetail2Response, statusText: 'OK' }) // Detail for sha2
        .mockResolvedValueOnce({ ok: true, json: async () => mockCommitDetail3Response, statusText: 'OK' }) // Detail for sha3
        // Mock for the /contributors details call
        .mockResolvedValueOnce({ ok: true, json: async () => mockContributorsDetailsResponse, statusText: 'OK' });

      const contributors = await githubService.getContributors(mockOwner, mockRepoName, mockTimeFilter);

      expect(contributors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'Author1', email: 'author1@example.com', commits: 2, avatar_url: 'avatar1_url',
          // additions and deletions are not part of the final Contributor type from this method in the service
        }),
        expect.objectContaining({
          name: 'Author2', email: 'author2@example.com', commits: 1, avatar_url: 'avatar2_url',
        }),
      ]));
      expect(contributors.length).toBe(2);

      // Check that the final /contributors call was made
      const contributorsUrl = `https://api.github.com/repos/${mockOwner}/${mockRepoName}/contributors?per_page=100`;
      expect(fetch).toHaveBeenLastCalledWith(contributorsUrl, { headers: expectedHeaders });
    });

    it('should throw an error if any underlying API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error')); // Fail the first call (getCommits list)
      await expect(githubService.getContributors(mockOwner, mockRepoName, mockTimeFilter)).rejects.toThrow('Network Error');
    });
  });

  describe('getFiles', () => {
    const mockPath = 'src';
    const expectedHeaders = { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${mockToken}` };

    beforeEach(() => {
      githubService.setToken(mockToken);
    });

    it('should return a list of files for a given path', async () => {
      const apiResponseData = [
        { path: 'src/file1.ts', type: 'file', size: 1024, last_modified: '2023-01-01T10:00:00Z' }, // last_modified not directly from GH contents API
        { path: 'src/subdir', type: 'dir', size: 0, last_modified: '2023-01-01T10:00:00Z' },
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => apiResponseData, statusText: 'OK' });

      const files = await githubService.getFiles(mockOwner, mockRepoName, mockPath);

      expect(files).toEqual(apiResponseData.map(f => ({ path: f.path, type: f.type, size: f.size, last_modified: f.last_modified })));
      expect(fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${mockOwner}/${mockRepoName}/contents/${mockPath}`, { headers: expectedHeaders });
    });

    it('should handle a single file response', async () => {
       const apiResponseData = { path: 'src/file1.ts', type: 'file', size: 1024 }; // Single object
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => apiResponseData, statusText: 'OK' });
      const files = await githubService.getFiles(mockOwner, mockRepoName, 'src/file1.ts');
      expect(files).toEqual([{ path: apiResponseData.path, type: apiResponseData.type, size: apiResponseData.size, last_modified: undefined }]);
    });

    it('should throw an error if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(githubService.getFiles(mockOwner, mockRepoName, mockPath)).rejects.toThrow('Network Error');
    });

    it('should throw an error for non-200 responses', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
      await expect(githubService.getFiles(mockOwner, mockRepoName, mockPath)).rejects.toThrow('GitHub API error: Not Found');
    });
  });

  describe('getPullRequests', () => {
    const mockTimeFilter: TimeFilter = { startDate: '2023-01-01T00:00:00Z', endDate: '2023-01-31T23:59:59Z' };
    const expectedHeaders = { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${mockToken}` };

    beforeEach(() => {
      githubService.setToken(mockToken);
    });

    it('should return a list of pull requests with details', async () => {
      const mockPRListResponse = [
        { id: 1, number: 101, title: 'PR 1', body: 'Desc 1', created_at: '2023-01-15T10:00:00Z', updated_at: '2023-01-15T11:00:00Z', merged_at: null, closed_at: null, state: 'open', user: { id: 1, login: 'user1' }, head: { ref: 'feature/pr1' }, base: { ref: 'main' }, draft: false, comments: 1, review_comments: 2, requested_reviewers: [], labels: [{name: 'bug'}] },
        { id: 2, number: 102, title: 'PR 2', body: 'Desc 2', created_at: '2022-12-15T10:00:00Z', /* ... other fields ... */ }, // This one should be filtered out by date
      ];
      const mockReviewsPR1Response = [ { submitted_at: '2023-01-15T12:00:00Z' } ];
      const mockDetailsPR1Response = { additions: 10, deletions: 5, changed_files: 3 };

      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockPRListResponse, statusText: 'OK' }) // PR List
        .mockResolvedValueOnce({ ok: true, json: async () => mockReviewsPR1Response, statusText: 'OK' }) // Reviews for PR1
        .mockResolvedValueOnce({ ok: true, json: async () => mockDetailsPR1Response, statusText: 'OK' }); // Details for PR1

      const prs = await githubService.getPullRequests(mockOwner, mockRepoName, mockTimeFilter);

      expect(prs).toHaveLength(1);
      expect(prs[0]).toEqual(expect.objectContaining({
        id: 1, title: 'PR 1', state: 'open', author: {id: 1, name: 'user1', username: 'user1'},
        comments: 3, // comments + review_comments
        additions: 10, deletions: 5, changedFiles: 3,
        labels: ['bug'],
        timeToFirstReview: expect.any(Number)
      }));

      const listUrl = `https://api.github.com/repos/${mockOwner}/${mockRepoName}/pulls?state=all&sort=created&direction=desc&per_page=100`;
      expect(fetch).toHaveBeenNthCalledWith(1, listUrl, { headers: expectedHeaders });
      expect(fetch).toHaveBeenNthCalledWith(2, `https://api.github.com/repos/${mockOwner}/${mockRepoName}/pulls/101/reviews`, { headers: expectedHeaders });
      expect(fetch).toHaveBeenNthCalledWith(3, `https://api.github.com/repos/${mockOwner}/${mockRepoName}/pulls/101`, { headers: expectedHeaders });
    });

    it('should throw an error if the PR list API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error for PR list'));
      await expect(githubService.getPullRequests(mockOwner, mockRepoName, mockTimeFilter)).rejects.toThrow('Network Error for PR list');
    });

    it('should throw an error if a PR detail/review call fails', async () => {
      const mockPRListResponse = [ { id:1, number: 101, created_at: '2023-01-15T10:00:00Z', user:{}, head:{}, base:{} , labels:[] } ];
      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockPRListResponse, statusText: 'OK' })
        .mockRejectedValueOnce(new Error('Network Error for PR reviews')); // Fail reviews call
      await expect(githubService.getPullRequests(mockOwner, mockRepoName, mockTimeFilter)).rejects.toThrow('Network Error for PR reviews');
    });
  });
});
