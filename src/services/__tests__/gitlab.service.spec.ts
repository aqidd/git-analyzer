// Import necessary modules
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitlabService } from '../gitlab.service';
// The separate `import { vi } from 'vitest';` is now redundant
// import { vi } from 'vitest';

// Mock the global fetch function
global.fetch = vi.fn();

describe('GitlabService', () => {
  let gitlabService: GitlabService;
  const mockToken = 'test_token';
  const mockProjectId = '123'; // Gitlab uses project IDs (numbers or URL-encoded paths)

  beforeEach(() => {
    gitlabService = new GitlabService();
    // Reset mocks before each test
    vi.resetAllMocks();
    // Reset baseUrl to default for each test if necessary, or set a common test one
    gitlabService.setBaseUrl('https://gitlab.com');
  });

  describe('constructor and setBaseUrl', () => {
    it('should initialize with a default baseUrl if none is provided', () => {
      const service = new GitlabService(); // No token, no initial URL
      // Assuming default is 'https://gitlab.com' or similar, this needs to match actual default
      // For this test, let's assume it can be checked via a getter or by its usage in other methods
      // Since there isn't a direct getter, we'll infer it from how setBaseUrl would affect subsequent calls.
      // Or, we can test setBaseUrl directly.
      expect(service).toBeInstanceOf(GitlabService);
    });

    it('should allow setting a custom baseUrl', async () => {
      const customUrl = 'https://custom.gitlab.instance.com';
      gitlabService.setBaseUrl(customUrl);
      gitlabService.setToken(mockToken); // Set token for the service instance
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}), statusText: 'OK' });
      await gitlabService.validateToken(); // No token arg needed
      expect(fetch).toHaveBeenCalledWith(
        `${customUrl}/api/v4/user`,
        expect.objectContaining({ headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken } })
      );
    });
  });

  describe('validateToken', () => {
    beforeEach(() => {
      gitlabService.setToken(mockToken);
    });

    it('should return true for a valid token', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'testuser' }),
        statusText: 'OK'
      });
      const isValid = await gitlabService.validateToken();
      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith('https://gitlab.com/api/v4/user', {
        headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken },
      });
    });

    it('should return false for an invalid token (API returns error)', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });
      const isValid = await gitlabService.validateToken();
      expect(isValid).toBe(false);
    });

    it('should return false if the API call fails (network error)', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      const isValid = await gitlabService.validateToken();
      expect(isValid).toBe(false);
    });
  });

  describe('getRepositories', () => {
    beforeEach(() => {
      gitlabService.setToken(mockToken);
    });

    it('should return a list of projects (repositories)', async () => {
      const mockApiResponse = [{ id: 1, name: 'repo1' }, { id: 2, name: 'repo2' }]; // Raw API response
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
        statusText: 'OK'
      });
      const repos = await gitlabService.getRepositories(); // No token arg
      expect(repos).toEqual(mockApiResponse); // Service returns data as is
      expect(fetch).toHaveBeenCalledWith('https://gitlab.com/api/v4/projects?membership=true&order_by=last_activity_at&per_page=100', {
        headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken },
      });
    });

    it('should throw an error if API call fails (non-OK response)', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });
      await expect(gitlabService.getRepositories()).rejects.toThrow('GitLab API error: Unauthorized');
    });

    it('should throw an error if API call fails (network error)', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(gitlabService.getRepositories()).rejects.toThrow('Network Error');
    });
  });

  describe('getBranches', () => {
    const expectedHeaders = { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken };
    beforeEach(() => {
      gitlabService.setToken(mockToken);
    });

    it('should return a list of mapped branches for a project', async () => {
      const rawMockBranches = [
        { name: 'main', commit: { id: 'sha1', message: 'Commit 1', author_name: 'User1', committed_date: '2023-01-01T10:00:00Z' }, protected: true },
        { name: 'dev', commit: { id: 'sha2', message: 'Commit 2', author_name: 'User2', committed_date: '2023-01-02T10:00:00Z' }, protected: false },
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => rawMockBranches, statusText: 'OK' });

      // Note: The service's getBranches 'owner' param is treated as projectId for GitLab
      const branches = await gitlabService.getBranches(mockProjectId, ''); // repoName not used by service

      expect(branches).toEqual([
        { name: 'main', lastCommitDate: '2023-01-01T10:00:00Z', lastCommitSha: 'sha1', lastCommitMessage: 'Commit 1', lastCommitAuthor: 'User1', protected: true },
        { name: 'dev', lastCommitDate: '2023-01-02T10:00:00Z', lastCommitSha: 'sha2', lastCommitMessage: 'Commit 2', lastCommitAuthor: 'User2', protected: false },
      ]);
      expect(fetch).toHaveBeenCalledWith(`https://gitlab.com/api/v4/projects/${mockProjectId}/repository/branches`, { headers: expectedHeaders });
    });

    it('should throw an error if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(gitlabService.getBranches(mockProjectId, '')).rejects.toThrow('Network Error');
    });
  });

  describe('getCommits', () => {
    const mockTimeFilter: TimeFilter = { startDate: '2023-01-01T00:00:00Z', endDate: '2023-01-31T23:59:59Z' };
    const expectedHeaders = { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken };
    beforeEach(() => {
      gitlabService.setToken(mockToken);
    });

    it('should return a list of mapped commits', async () => {
      const rawMockCommits = [
        { id: 'sha1', message: 'Commit 1', author_name: 'User1', author_email: 'u1@e.com', created_at: '2023-01-10T10:00:00Z', web_url: 'url1', stats: { additions: 10, deletions: 5 } },
        { id: 'sha2', message: 'Commit 2', author_name: 'User2', author_email: 'u2@e.com', created_at: '2023-01-11T10:00:00Z', web_url: 'url2', stats: { additions: 8, deletions: 2 } },
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => rawMockCommits, statusText: 'OK' });

      const commits = await gitlabService.getCommits(Number(mockProjectId), mockTimeFilter); // projectId is number

      expect(commits).toEqual([
        { id: 'sha1', message: 'Commit 1', author_name: 'User1', author_email: 'u1@e.com', created_at: '2023-01-10T10:00:00Z', web_url: 'url1', code_added: 10, code_removed: 5 },
        { id: 'sha2', message: 'Commit 2', author_name: 'User2', author_email: 'u2@e.com', created_at: '2023-01-11T10:00:00Z', web_url: 'url2', code_added: 8, code_removed: 2 },
      ]);
      const expectedUrl = `https://gitlab.com/api/v4/projects/${mockProjectId}/repository/commits?since=${mockTimeFilter.startDate}&until=${mockTimeFilter.endDate}&per_page=100`;
      expect(fetch).toHaveBeenCalledWith(expectedUrl, { headers: expectedHeaders });
    });

    it('should throw an error if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(gitlabService.getCommits(Number(mockProjectId), mockTimeFilter)).rejects.toThrow('Network Error');
    });
  });

  describe('getPipelines', () => {
    const mockTimeFilter: TimeFilter = { startDate: '2023-01-01T00:00:00Z', endDate: '2023-01-31T23:59:59Z' };
    const expectedHeaders = { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken };
    beforeEach(() => {
      gitlabService.setToken(mockToken);
    });

    it('should return a list of mapped pipelines', async () => {
      const rawMockPipelines = [
        { id: 1, status: 'success', ref: 'main', sha: 'sha1', web_url: 'url1', created_at: '2023-01-10T00:00:00Z', updated_at: '2023-01-10T00:05:00Z' },
        { id: 2, status: 'running', ref: 'dev', sha: 'sha2', web_url: 'url2', created_at: '2023-01-11T00:00:00Z', updated_at: '2023-01-11T00:05:00Z' },
        // Add other statuses to test mapping: pending, failed, canceled, skipped, created, manual (maps to unknown by default in service if not directly handled)
        { id: 3, status: 'pending', ref: 'feat1', sha: 'sha3', web_url: 'url3', created_at: '2023-01-12T00:00:00Z', updated_at: '2023-01-12T00:05:00Z' },
        { id: 4, status: 'failed', ref: 'fix1', sha: 'sha4', web_url: 'url4', created_at: '2023-01-13T00:00:00Z', updated_at: '2023-01-13T00:05:00Z' },
        { id: 5, status: 'canceled', ref: 'feat2', sha: 'sha5', web_url: 'url5', created_at: '2023-01-14T00:00:00Z', updated_at: '2023-01-14T00:05:00Z' },
        { id: 6, status: 'skipped', ref: 'feat3', sha: 'sha6', web_url: 'url6', created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:05:00Z' },
        { id: 7, status: 'created', ref: 'feat4', sha: 'sha7', web_url: 'url7', created_at: '2023-01-16T00:00:00Z', updated_at: '2023-01-16T00:05:00Z' },
        { id: 8, status: 'manual', ref: 'feat5', sha: 'sha8', web_url: 'url8', created_at: '2023-01-17T00:00:00Z', updated_at: '2023-01-17T00:05:00Z' }, // manual is 'unknown'
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => rawMockPipelines, statusText: 'OK' });

      const pipelines = await gitlabService.getPipelines(Number(mockProjectId), mockTimeFilter);

      expect(pipelines).toEqual([
        { id: 1, status: 'success', ref: 'main', sha: 'sha1', web_url: 'url1', created_at: '2023-01-10T00:00:00Z', updated_at: '2023-01-10T00:05:00Z' },
        { id: 2, status: 'running', ref: 'dev', sha: 'sha2', web_url: 'url2', created_at: '2023-01-11T00:00:00Z', updated_at: '2023-01-11T00:05:00Z' },
        { id: 3, status: 'pending', ref: 'feat1', sha: 'sha3', web_url: 'url3', created_at: '2023-01-12T00:00:00Z', updated_at: '2023-01-12T00:05:00Z' },
        { id: 4, status: 'failed', ref: 'fix1', sha: 'sha4', web_url: 'url4', created_at: '2023-01-13T00:00:00Z', updated_at: '2023-01-13T00:05:00Z' },
        { id: 5, status: 'cancelled', ref: 'feat2', sha: 'sha5', web_url: 'url5', created_at: '2023-01-14T00:00:00Z', updated_at: '2023-01-14T00:05:00Z' },
        { id: 6, status: 'skipped', ref: 'feat3', sha: 'sha6', web_url: 'url6', created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:05:00Z' },
        { id: 7, status: 'created', ref: 'feat4', sha: 'sha7', web_url: 'url7', created_at: '2023-01-16T00:00:00Z', updated_at: '2023-01-16T00:05:00Z' },
        { id: 8, status: 'unknown', ref: 'feat5', sha: 'sha8', web_url: 'url8', created_at: '2023-01-17T00:00:00Z', updated_at: '2023-01-17T00:05:00Z' },
      ]);
      const expectedUrl = `https://gitlab.com/api/v4/projects/${mockProjectId}/pipelines?updated_after=${mockTimeFilter.startDate}&updated_before=${mockTimeFilter.endDate}&per_page=100`;
      expect(fetch).toHaveBeenCalledWith(expectedUrl, { headers: expectedHeaders });
    });

    it('should throw an error if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(gitlabService.getPipelines(Number(mockProjectId), mockTimeFilter)).rejects.toThrow('Network Error');
    });

    it('should throw an error if response is not ok', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, statusText: 'Forbidden' });
      await expect(gitlabService.getPipelines(Number(mockProjectId), mockTimeFilter)).rejects.toThrow('GitLab API error: Forbidden');
    });
  });

  describe('getContributors', () => {
    const mockTimeFilter: TimeFilter = { startDate: '2023-01-01T00:00:00Z', endDate: '2023-01-31T23:59:59Z' };
    const expectedHeaders = { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken };
    beforeEach(() => {
      gitlabService.setToken(mockToken);
    });

    it('should return a list of contributors aggregated from commits', async () => {
      // Mock for the internal getCommits call
      const rawMockCommits = [
        { id: 'sha1', message: 'Commit 1', author_name: 'User1', author_email: 'u1@e.com', created_at: '2023-01-10T00:00:00Z', web_url: 'url1', stats: { additions: 10, deletions: 5 } },
        { id: 'sha2', message: 'Commit 2', author_name: 'User1', author_email: 'u1@e.com', created_at: '2023-01-11T00:00:00Z', web_url: 'url2', stats: { additions: 8, deletions: 2 } },
        { id: 'sha3', message: 'Commit 3', author_name: 'User2', author_email: 'u2@e.com', created_at: '2023-01-12T00:00:00Z', web_url: 'url3', stats: { additions: 12, deletions: 3 } },
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => rawMockCommits, statusText: 'OK' });

      const contributors = await gitlabService.getContributors(Number(mockProjectId), mockTimeFilter);

      expect(contributors).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'User1', email: 'u1@e.com', commits: 2, additions: 0, deletions: 0 }), // Note: Service currently doesn't sum additions/deletions for GitLab contributors
        expect.objectContaining({ name: 'User2', email: 'u2@e.com', commits: 1, additions: 0, deletions: 0 }),
      ]));
      expect(contributors.length).toBe(2);

      const expectedCommitsUrl = `https://gitlab.com/api/v4/projects/${mockProjectId}/repository/commits?since=${mockTimeFilter.startDate}&until=${mockTimeFilter.endDate}&per_page=100`;
      expect(fetch).toHaveBeenCalledWith(expectedCommitsUrl, { headers: expectedHeaders });
    });

    it('should throw an error if the underlying getCommits call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(gitlabService.getContributors(Number(mockProjectId), mockTimeFilter)).rejects.toThrow('Network Error');
    });
  });

  describe('getFiles', () => {
    const mockPath = 'src';
    const expectedHeaders = { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken };
    beforeEach(() => {
      gitlabService.setToken(mockToken);
    });

    it('should return a list of mapped files and directories for a given path', async () => {
      const rawMockFiles = [
        { path: 'src/file1.ts', type: 'blob', size: 1024, last_commit_at: '2023-01-01T10:00:00Z' },
        { path: 'src/subdir', type: 'tree', last_commit_at: '2023-01-02T10:00:00Z' }, // size might be missing for tree
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => rawMockFiles, statusText: 'OK' });

      const files = await gitlabService.getFiles(Number(mockProjectId), mockPath);

      expect(files).toEqual([
        { path: 'src/file1.ts', type: 'blob', size: 1024, last_modified: '2023-01-01T10:00:00Z' },
        { path: 'src/subdir', type: 'tree', size: 0, last_modified: '2023-01-02T10:00:00Z' },
      ]);
      const expectedUrl = `https://gitlab.com/api/v4/projects/${mockProjectId}/repository/tree?path=${mockPath}&per_page=100`;
      expect(fetch).toHaveBeenCalledWith(expectedUrl, { headers: expectedHeaders });
    });

    it('should throw an error if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(gitlabService.getFiles(Number(mockProjectId), mockPath)).rejects.toThrow('Network Error');
    });

    it('should throw an error for non-200 responses', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
      await expect(gitlabService.getFiles(Number(mockProjectId), mockPath)).rejects.toThrow('GitLab API error: Not Found');
    });
  });

  describe('getPullRequests', () => {
    const mockTimeFilter: TimeFilter = { startDate: '2023-01-01T00:00:00Z', endDate: '2023-01-31T23:59:59Z' };
    const expectedHeaders = { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': mockToken };

    beforeEach(() => {
      gitlabService.setToken(mockToken);
      // Ensure global.fetch is a fresh mock for each test in this suite
      global.fetch = vi.fn();
    });

    it('should return a list of mapped merge requests with details', async () => {
      const rawMockMRList_API = [ // Simulate API response for list
        { id: 1, iid: 101, title: 'MR 1', description: 'Desc 1', state: 'opened', created_at: '2023-01-15T10:00:00Z', updated_at: '2023-01-15T11:00:00Z', merged_at: null, closed_at: null, author: {id:1, name:'User1', username:'user1'}, reviewers:[], source_branch:'feature/mr1', target_branch:'main', work_in_progress:false, labels:['bug'] },
        { id: 2, iid: 102, title: 'MR 2', created_at: '2022-12-15T10:00:00Z', author:{id:2, name:'User2', username:'user2'}, reviewers:[], source_branch:'feature/mr2', target_branch:'main', work_in_progress:false, labels:[] }, // This one should be filtered out by date
      ];
      const mockMRDetails1_API = { iid: 101, merged_at: null, created_at: '2023-01-15T10:00:00Z', changes_count: "15", user_notes_count: 5 };

      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => rawMockMRList_API, statusText: 'OK' }) // Call 1: List MRs
        .mockResolvedValueOnce({ ok: true, json: async () => mockMRDetails1_API, statusText: 'OK' });// Call 2: Details for MR 101

      const prs = await gitlabService.getPullRequests(Number(mockProjectId), mockTimeFilter);

      expect(prs).toHaveLength(1); // Only MR1 should pass date filter
      expect(prs[0]).toEqual(expect.objectContaining({ id: 1, title: 'MR 1' }));

      const listUrl = `https://gitlab.com/api/v4/projects/${mockProjectId}/merge_requests?created_after=${mockTimeFilter.startDate}&created_before=${mockTimeFilter.endDate}&per_page=100`;
      expect(fetch).toHaveBeenNthCalledWith(1, listUrl, { headers: expectedHeaders });
      expect(fetch).toHaveBeenNthCalledWith(2, `https://gitlab.com/api/v4/projects/${mockProjectId}/merge_requests/101`, { headers: expectedHeaders });
    });

    it('should return empty list if no MRs pass date filter', async () => {
      const rawMockMRList_API = [
        { id: 2, iid: 102, title: 'MR 2', created_at: '2022-12-15T10:00:00Z', author:{id:2, name:'User2', username:'user2'}, reviewers:[], source_branch:'feature/mr2', target_branch:'main', work_in_progress:false, labels:[] },
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => rawMockMRList_API, statusText: 'OK' });
      const prs = await gitlabService.getPullRequests(Number(mockProjectId), mockTimeFilter);
      expect(prs).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(1); // Only list call, no detail calls
    });


    it('should throw an error if MR list API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      await expect(gitlabService.getPullRequests(Number(mockProjectId), mockTimeFilter)).rejects.toThrow('Network Error');
    });

    it('should throw an error if an MR detail call fails', async () => {
      const rawMockMRList = [{ id: 1, iid: 101, created_at: '2023-01-15T00:00:00Z', author:{}, reviewers:[], labels:[] }];
      (fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => rawMockMRList, statusText: 'OK' })
        .mockRejectedValueOnce(new Error('Network Error for MR detail'));
      await expect(gitlabService.getPullRequests(Number(mockProjectId), mockTimeFilter)).rejects.toThrow('Network Error for MR detail');
    });
  });
});
