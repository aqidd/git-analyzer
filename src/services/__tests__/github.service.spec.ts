// Import necessary modules
import { GithubService } from '../github.service';
import { vi } from 'vitest';

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
    it('should return true for a valid token', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      const isValid = await githubService.validateToken(mockToken);
      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: { Authorization: `token ${mockToken}` },
      });
    });

    it('should return false for an invalid token', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
      const isValid = await githubService.validateToken('invalid_token');
      expect(isValid).toBe(false);
    });

    it('should return false if the API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const isValid = await githubService.validateToken(mockToken);
      expect(isValid).toBe(false);
    });
  });

  describe('getRepositories', () => {
    it('should return a list of repositories for a valid token', async () => {
      const mockRepos = [{ name: 'repo1' }, { name: 'repo2' }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos,
      });
      const repos = await githubService.getRepositories(mockToken);
      expect(repos).toEqual(mockRepos);
      expect(fetch).toHaveBeenCalledWith('https://api.github.com/user/repos', {
        headers: { Authorization: `token ${mockToken}` },
      });
    });

    it('should return an empty list if the token is invalid or causes an error', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
      const repos = await githubService.getRepositories('invalid_token');
      expect(repos).toEqual([]);
    });

    it('should return an empty list if the API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const repos = await githubService.getRepositories(mockToken);
      expect(repos).toEqual([]);
    });
  });

  describe('getBranches', () => {
    it('should return a list of branches', async () => {
      const mockBranches = [{ name: 'main', protected: false }, { name: 'dev', protected: true }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBranches,
      });
      const branches = await githubService.getBranches(mockToken, mockOwner, mockRepoName);
      expect(branches).toEqual(mockBranches);
      expect(fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${mockOwner}/${mockRepoName}/branches`, {
        headers: { Authorization: `token ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const branches = await githubService.getBranches(mockToken, mockOwner, mockRepoName);
      expect(branches).toEqual([]);
    });
  });

  describe('getCommits', () => {
    const mockBranchName = 'main';
    it('should return a list of commits for a branch', async () => {
      const mockCommits = [{ sha: '123', commit: { message: 'Initial commit' } }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommits,
      });
      const commits = await githubService.getCommits(mockToken, mockOwner, mockRepoName, mockBranchName);
      expect(commits).toEqual(mockCommits);
      expect(fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${mockOwner}/${mockRepoName}/commits?sha=${mockBranchName}`, {
        headers: { Authorization: `token ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const commits = await githubService.getCommits(mockToken, mockOwner, mockRepoName, mockBranchName);
      expect(commits).toEqual([]);
    });
  });

  describe('getPipelines', () => {
    it('should return a list of pipelines with mapped statuses', async () => {
      const mockRuns = [
        { id: 1, status: 'completed', conclusion: 'success', html_url: 'url1' },
        { id: 2, status: 'in_progress', conclusion: null, html_url: 'url2' },
        { id: 3, status: 'queued', conclusion: null, html_url: 'url3' },
        { id: 4, status: 'completed', conclusion: 'failure', html_url: 'url4' },
        { id: 5, status: 'completed', conclusion: 'cancelled', html_url: 'url5' },
        { id: 6, status: 'any_other_status', conclusion: 'neutral', html_url: 'url6' },
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflow_runs: mockRuns }),
      });
      const pipelines = await githubService.getPipelines(mockToken, mockOwner, mockRepoName);
      expect(pipelines).toEqual([
        { id: 1, status: 'Success', url: 'url1' },
        { id: 2, status: 'In Progress', url: 'url2' },
        { id: 3, status: 'Queued', url: 'url3' },
        { id: 4, status: 'Failure', url: 'url4' },
        { id: 5, status: 'Cancelled', url: 'url5' },
        { id: 6, status: 'Unknown', url: 'url6' },
      ]);
      expect(fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${mockOwner}/${mockRepoName}/actions/runs`, {
        headers: { Authorization: `token ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const pipelines = await githubService.getPipelines(mockToken, mockOwner, mockRepoName);
      expect(pipelines).toEqual([]);
    });

     it('should return an empty list if response is not ok', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false });
      const pipelines = await githubService.getPipelines(mockToken, mockOwner, mockRepoName);
      expect(pipelines).toEqual([]);
    });

    it('should return an empty list if workflow_runs is missing', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      const pipelines = await githubService.getPipelines(mockToken, mockOwner, mockRepoName);
      expect(pipelines).toEqual([]);
    });
  });

  describe('getContributors', () => {
    it('should return a list of contributors', async () => {
      const mockContributors = [{ login: 'user1', contributions: 10 }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributors,
      });
      const contributors = await githubService.getContributors(mockToken, mockOwner, mockRepoName);
      expect(contributors).toEqual(mockContributors);
      expect(fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${mockOwner}/${mockRepoName}/contributors`, {
        headers: { Authorization: `token ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const contributors = await githubService.getContributors(mockToken, mockOwner, mockRepoName);
      expect(contributors).toEqual([]);
    });
  });

  describe('getFiles', () => {
    const mockPath = 'src';
    it('should return a list of files for a given path', async () => {
      const mockFiles = [{ name: 'file1.ts', type: 'file' }, { name: 'subdir', type: 'dir' }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFiles,
      });
      const files = await githubService.getFiles(mockToken, mockOwner, mockRepoName, mockPath);
      expect(files).toEqual(mockFiles);
      expect(fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${mockOwner}/${mockRepoName}/contents/${mockPath}`, {
        headers: { Authorization: `token ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const files = await githubService.getFiles(mockToken, mockOwner, mockRepoName, mockPath);
      expect(files).toEqual([]);
    });

    it('should return an empty list for non-200 responses', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 404 });
      const files = await githubService.getFiles(mockToken, mockOwner, mockRepoName, mockPath);
      expect(files).toEqual([]);
    });
  });

  describe('getPullRequests', () => {
    it('should return a list of pull requests', async () => {
      const mockPRs = [{ title: 'Update README', number: 1, user: { login: 'testuser' } }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs,
      });
      const prs = await githubService.getPullRequests(mockToken, mockOwner, mockRepoName);
      expect(prs).toEqual(mockPRs);
      expect(fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${mockOwner}/${mockRepoName}/pulls`, {
        headers: { Authorization: `token ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const prs = await githubService.getPullRequests(mockToken, mockOwner, mockRepoName);
      expect(prs).toEqual([]);
    });
  });
});
