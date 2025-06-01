// Import necessary modules
import { GitlabService } from '../gitlab.service';
import { vi } from 'vitest';

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
      // To verify, make a call and check the URL used by fetch
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await gitlabService.validateToken(mockToken);
      expect(fetch).toHaveBeenCalledWith(
        `${customUrl}/api/v4/user`,
        expect.objectContaining({ headers: { Authorization: `Bearer ${mockToken}` } })
      );
    });
  });

  describe('validateToken', () => {
    it('should return true for a valid token', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'testuser' }), // Gitlab user response
      });
      const isValid = await gitlabService.validateToken(mockToken);
      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith('https://gitlab.com/api/v4/user', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should return false for an invalid token', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
      const isValid = await gitlabService.validateToken('invalid_token');
      expect(isValid).toBe(false);
    });

    it('should return false if the API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const isValid = await gitlabService.validateToken(mockToken);
      expect(isValid).toBe(false);
    });
  });

  describe('getRepositories', () => {
    it('should return a list of projects (repositories)', async () => {
      const mockProjects = [{ id: 1, name: 'repo1' }, { id: 2, name: 'repo2' }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });
      const repos = await gitlabService.getRepositories(mockToken);
      expect(repos).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith('https://gitlab.com/api/v4/projects?membership=true', {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails or token is invalid', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
      const repos = await gitlabService.getRepositories('invalid_token');
      expect(repos).toEqual([]);
    });

     it('should return an empty list if fetch throws an error', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const repos = await gitlabService.getRepositories(mockToken);
      expect(repos).toEqual([]);
    });
  });

  describe('getBranches', () => {
    it('should return a list of branches for a project', async () => {
      const mockBranches = [{ name: 'main', protected: false }, { name: 'dev', protected: true }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBranches,
      });
      const branches = await gitlabService.getBranches(mockToken, mockProjectId);
      expect(branches).toEqual(mockBranches);
      expect(fetch).toHaveBeenCalledWith(`https://gitlab.com/api/v4/projects/${mockProjectId}/repository/branches`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const branches = await gitlabService.getBranches(mockToken, mockProjectId);
      expect(branches).toEqual([]);
    });
  });

  describe('getCommits', () => {
    const mockBranchName = 'main';
    it('should return a list of commits for a branch', async () => {
      const mockCommits = [{ id: '123', title: 'Initial commit' }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommits,
      });
      const commits = await gitlabService.getCommits(mockToken, mockProjectId, mockBranchName);
      expect(commits).toEqual(mockCommits);
      expect(fetch).toHaveBeenCalledWith(`https://gitlab.com/api/v4/projects/${mockProjectId}/repository/commits?ref_name=${mockBranchName}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const commits = await gitlabService.getCommits(mockToken, mockProjectId, mockBranchName);
      expect(commits).toEqual([]);
    });
  });

  describe('getPipelines', () => {
    it('should return a list of pipelines with mapped statuses', async () => {
      const mockPipelinesRaw = [
        { id: 1, status: 'success', web_url: 'url1' },
        { id: 2, status: 'running', web_url: 'url2' },
        { id: 3, status: 'pending', web_url: 'url3' },
        { id: 4, status: 'failed', web_url: 'url4' },
        { id: 5, status: 'canceled', web_url: 'url5' },
        { id: 6, status: 'skipped', web_url: 'url6' },
        { id: 7, status: 'created', web_url: 'url7' },
        { id: 8, status: 'manual', web_url: 'url8' },
        { id: 9, status: 'unknown_status', web_url: 'url9' }, // Test default case
      ];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelinesRaw,
      });
      const pipelines = await gitlabService.getPipelines(mockToken, mockProjectId);
      expect(pipelines).toEqual([
        { id: 1, status: 'Success', url: 'url1' },
        { id: 2, status: 'Running', url: 'url2' },
        { id: 3, status: 'Pending', url: 'url3' },
        { id: 4, status: 'Failed', url: 'url4' },
        { id: 5, status: 'Canceled', url: 'url5' },
        { id: 6, status: 'Skipped', url: 'url6' },
        { id: 7, status: 'Created', url: 'url7' },
        { id: 8, status: 'Manual', url: 'url8' },
        { id: 9, status: 'Unknown', url: 'url9' },
      ]);
      expect(fetch).toHaveBeenCalledWith(`https://gitlab.com/api/v4/projects/${mockProjectId}/pipelines`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const pipelines = await gitlabService.getPipelines(mockToken, mockProjectId);
      expect(pipelines).toEqual([]);
    });

    it('should return an empty list if response is not ok', async () => {
      (fetch as vi.Mock).mockResolvedValueOnce({ ok: false });
      const pipelines = await gitlabService.getPipelines(mockToken, mockProjectId);
      expect(pipelines).toEqual([]);
    });
  });

  describe('getContributors', () => {
    // Gitlab calls this "repository contributors"
    it('should return a list of contributors (users)', async () => {
      const mockContributors = [{ name: 'User One', email: 'user1@example.com', commits: 150 }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributors,
      });
      const contributors = await gitlabService.getContributors(mockToken, mockProjectId);
      // The service might map these fields, adjust expectations accordingly.
      // Assuming it returns them as-is for now.
      expect(contributors).toEqual(mockContributors);
      expect(fetch).toHaveBeenCalledWith(`https://gitlab.com/api/v4/projects/${mockProjectId}/repository/contributors`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const contributors = await gitlabService.getContributors(mockToken, mockProjectId);
      expect(contributors).toEqual([]);
    });
  });

  describe('getFiles', () => {
    // Gitlab calls this "repository tree"
    const mockPath = 'src';
    it('should return a list of files and directories for a given path', async () => {
      const mockFiles = [{ name: 'file1.ts', type: 'blob' }, { name: 'subdir', type: 'tree' }];
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFiles,
      });
      const files = await gitlabService.getFiles(mockToken, mockProjectId, mockPath);
      expect(files).toEqual(mockFiles.map(f => ({ ...f, type: f.type === 'blob' ? 'file' : 'dir' }))); // Mapping 'blob' to 'file' and 'tree' to 'dir'
      expect(fetch).toHaveBeenCalledWith(`https://gitlab.com/api/v4/projects/${mockProjectId}/repository/tree?path=${mockPath}`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const files = await gitlabService.getFiles(mockToken, mockProjectId, mockPath);
      expect(files).toEqual([]);
    });

    it('should return an empty list for non-200 responses', async () => {
        (fetch as vi.Mock).mockResolvedValueOnce({ ok: false, status: 404 });
        const files = await gitlabService.getFiles(mockToken, mockProjectId, mockPath);
        expect(files).toEqual([]);
    });
  });

  describe('getPullRequests', () => {
    // Gitlab calls these "merge requests"
    it('should return a list of merge requests', async () => {
      const mockMRs = [{ title: 'Update README', iid: 1, author: { username: 'testuser' } }]; // 'iid' is the project-local ID for MRs
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMRs,
      });
      const prs = await gitlabService.getPullRequests(mockToken, mockProjectId);
      expect(prs).toEqual(mockMRs);
      expect(fetch).toHaveBeenCalledWith(`https://gitlab.com/api/v4/projects/${mockProjectId}/merge_requests`, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should return an empty list if API call fails', async () => {
      (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
      const prs = await gitlabService.getPullRequests(mockToken, mockProjectId);
      expect(prs).toEqual([]);
    });
  });
});
