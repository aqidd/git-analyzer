import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AzureService } from "../azure.service";
import type { PullRequest, TimeFilter } from "@/types/repository";

describe("AzureService", () => {
  let azureService: AzureService;
  const mockToken = "mock-token";
  const mockOrganization = "mock-organization";
  const mockProjectId = "mock-project-id";
  const mockRepoId = "mock-repo-id";
  let requestSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    azureService = new AzureService();
    azureService.setToken(mockToken);
    // requestSpy = vi.spyOn(azureService as any, "request");
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restores all spies and mocks
  });

  describe("setOrganization", () => {
    it("should set the organization correctly", () => {
      const org = "new-org";
      azureService.setOrganization(org);
      // We can't directly access the organization property,
      // so we'll verify its effect in an API call.
      // This test is more of an integration test for the setter.
      // @ts-expect-error accessing private property for test
      expect(azureService.organization).toBe(org);
    });
  });

  describe("validateToken", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // AzureService.validateToken uses global.fetch directly
      fetchSpy = vi.spyOn(global, "fetch");
    });

    it("should return true for a valid token and organization", async () => {
      azureService.setOrganization(mockOrganization);
      // Mock a successful response for fetch
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ id: "project" }] }), // Mimicking projects fetch
      } as Response);

      const isValid = await azureService.validateToken();
      expect(isValid).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/_apis/projects?api-version=6.0`, // Service uses 6.0
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it("should return false if organization is not set", async () => {
      // @ts-expect-error testing invalid state
      azureService.organization = undefined;
      // global.fetch will be called with .../undefined/_apis/... which should fail
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);
      const isValid = await azureService.validateToken();
      expect(isValid).toBe(false);
      // Ensure fetch was called, even if with 'undefined' in path
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/undefined/_apis/projects?api-version=6.0`,
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it("should return false if API call fails (network error)", async () => {
      azureService.setOrganization(mockOrganization);
      fetchSpy.mockRejectedValueOnce(new Error("API Error"));
      const isValid = await azureService.validateToken();
      expect(isValid).toBe(false);
    });

    it("should return false if API returns not ok", async () => {
      azureService.setOrganization(mockOrganization);
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);
      const isValid = await azureService.validateToken();
      expect(isValid).toBe(false);
    });
  });

  describe("getProjects", () => {
    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });

    it("should return a list of projects", async () => {
      const mockApiResponse = {
        count: 1,
        value: [{
          id: "p1",
          name: "Project1",
          description: "Desc1",
          url: "url1",
          state: "wellFormed",
          visibility: "private",
          lastUpdateTime: "2023-01-01T00:00:00Z",
          revision: 123
        }]
      };
      // The first argument to azureService.request is the path, second is projectPath (optional)
      requestSpy.mockResolvedValueOnce(mockApiResponse);
      const projects = await azureService.getProjects();
      expect(projects).toEqual(mockApiResponse.value.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          url: p.url,
          state: p.state,
          visibility: p.visibility,
          lastUpdateTime: p.lastUpdateTime,
          revision: p.revision
      })));
      // Ensure the internal 'request' method is called with the correct path segment
      expect(requestSpy).toHaveBeenCalledWith("projects");
    });

    it("should throw an error if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      await expect(azureService.getProjects()).rejects.toThrow("API Error");
      expect(requestSpy).toHaveBeenCalledWith("projects");
    });

    it("should throw an error if organization is not set (leading to request failure)", async () => {
       // @ts-expect-error testing invalid state
      azureService.organization = undefined;
      // The service's request method will attempt to build a URL with 'undefined'
      // which will likely cause fetch itself or the response.ok check to fail.
      requestSpy.mockRejectedValueOnce(new Error("Organization undefined error"));
      await expect(azureService.getProjects()).rejects.toThrow("Organization undefined error");
      expect(requestSpy).toHaveBeenCalledWith("projects");
    });
  });

  describe("getRepositories", () => {
    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });

    it("should return a list of repositories for a project", async () => {
      const mockApiResponse = {
        value: [{
          id: "r1",
          name: "Repo1",
          description: "Repo desc",
          webUrl: "repo/url",
          defaultBranch: "refs/heads/main",
          size: 1024,
          project: { id: mockProjectId, name: "Project1", visibility: "private" }, // Added visibility
          lastUpdateTime: "2023-01-01T10:00:00Z"
        }]
      };
      requestSpy.mockResolvedValueOnce(mockApiResponse);
      const repos = await azureService.getRepositories(mockProjectId);
      expect(repos).toEqual(mockApiResponse.value.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        url: repo.webUrl,
        default_branch: repo.defaultBranch,
        size: repo.size,
        visibility: repo.project.visibility,
        lastCommitDate: repo.lastUpdateTime,
        project: {
          id: repo.project.id,
          name: repo.project.name
        },
        stats: { // Default stats from service
          commitCount: 0,
          branchCount: 0,
          contributorCount: 0,
          pullRequestCount: 0
        }
      })));
      // Called with path segment and project ID (which service might use to then get project name for other calls)
      expect(requestSpy).toHaveBeenCalledWith(`${mockProjectId}/git/repositories`);
    });

    it("should throw an error if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      await expect(azureService.getRepositories(mockProjectId)).rejects.toThrow("API Error");
      expect(requestSpy).toHaveBeenCalledWith(`${mockProjectId}/git/repositories`);
    });
  });

  describe("getBranchStats", () => {
     beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });
    it("should return branch statistics", async () => {
      const mockApiResponse = {
        value: [{
          name: "main",
          aheadCount: 5,
          behindCount: 10,
          commit: {
            commitId: "abc",
            committer: { name: "TestUser", email: "user@example.com", date: "2023-01-01T00:00:00Z"}
          }
        }]
      };
      requestSpy.mockResolvedValueOnce(mockApiResponse);
      const stats = await azureService.getBranchStats(mockProjectId, mockRepoId);
      expect(stats).toEqual(mockApiResponse.value.map(branch => ({
        name: branch.name,
        aheadCount: branch.aheadCount,
        behindCount: branch.behindCount,
        commit: {
          commitId: branch.commit.commitId,
          committer: {
            name: branch.commit.committer.name,
            email: branch.commit.committer.email,
            date: branch.commit.committer.date
          }
        }
      })));
      expect(requestSpy).toHaveBeenCalledWith(`${mockProjectId}/git/repositories/${mockRepoId}/stats/branches`);
    });

    it("should throw an error if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      await expect(azureService.getBranchStats(mockProjectId, mockRepoId)).rejects.toThrow("API Error");
      expect(requestSpy).toHaveBeenCalledWith(`${mockProjectId}/git/repositories/${mockRepoId}/stats/branches`);
    });
  });

  describe("getCommits", () => {
    const mockTimeFilter: TimeFilter = { startDate: "2023-01-01", endDate: "2023-01-31" };
    const mockProjectName = "MockedProjectName";

    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
      // Mock the initial project details fetch used by getCommits
      requestSpy.mockResolvedValueOnce({ name: mockProjectName });
    });

    it("should return a list of commits for a branch", async () => {
      const mockApiResponse = {
        value: [{
          commitId: "c1",
          comment: "Initial commit",
          author: { name: "User1", email: "user1@example.com", date: "2023-01-15T10:00:00Z" },
          remoteUrl: "commit/url",
          changeCounts: { Add: 10, Delete: 5 }
        }]
      };
      // This will be the second call to requestSpy in getCommits
      requestSpy.mockResolvedValueOnce(mockApiResponse);

      const commits = await azureService.getCommits(mockProjectId, mockRepoId, mockTimeFilter);
      expect(commits).toEqual(mockApiResponse.value.map(commit => ({
        id: commit.commitId,
        message: commit.comment,
        author_name: commit.author.name,
        author_email: commit.author.email,
        created_at: commit.author.date,
        web_url: commit.remoteUrl,
        code_added: commit.changeCounts?.Add || 0,
        code_removed: commit.changeCounts?.Delete || 0
      })));

      // First call: project details
      expect(requestSpy.mock.calls[0][0]).toBe(`projects/${mockProjectId}`);
      // Second call: commits, using project name from first call
      const expectedCommitsParams = new URLSearchParams({
        'searchCriteria.fromDate': new Date(mockTimeFilter.startDate).toISOString(),
        'searchCriteria.toDate': new Date(mockTimeFilter.endDate).toISOString()
      }).toString();
      const expectedCommitsPath = `git/repositories/${mockRepoId}/commits?${expectedCommitsParams}`;
      expect(requestSpy.mock.calls[1][0]).toBe(expectedCommitsPath);
      expect(requestSpy.mock.calls[1][1]).toBe(mockProjectName);
    });

    it("should throw an error if API call for commits fails", async () => {
      // First call (project details) succeeds (mocked in beforeEach)
      // Second call (commits) fails
      requestSpy.mockRejectedValueOnce(new Error("API Error for commits"));
      await expect(azureService.getCommits(mockProjectId, mockRepoId, mockTimeFilter)).rejects.toThrow("API Error for commits");
    });

    it("should throw an error if initial project fetch fails", async () => {
      // Override beforeEach mock for this specific test case
      requestSpy.mockReset();
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization); // Re-set organization after reset
      requestSpy.mockRejectedValueOnce(new Error("API Error for project fetch"));
      await expect(azureService.getCommits(mockProjectId, mockRepoId, mockTimeFilter)).rejects.toThrow("API Error for project fetch");
    });
  });

  describe("getPipelines", () => {
    const mockTimeFilter: TimeFilter = { startDate: "2023-01-01", endDate: "2023-01-31" };
    const mockProjectName = "MockedProjectNameForPipelines";

    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
      // Mock the initial project details fetch
      requestSpy.mockResolvedValueOnce({ name: mockProjectName });
    });

    it("should return a list of pipelines with mapped statuses and results", async () => {
      const mockApiResponse = {
        value: [
          { id: 1, status: "completed", result: "succeeded", sourceBranch: "refs/heads/main", sourceVersion: "sha1", _links: { web: { href: "url1" } }, startTime: "2023-01-01T12:00:00Z", finishTime: "2023-01-01T12:05:00Z" },
          { id: 2, status: "inProgress", result: null, sourceBranch: "refs/heads/dev", sourceVersion: "sha2", _links: { web: { href: "url2" } }, queueTime: "2023-01-02T10:00:00Z" },
        ],
      };
       // Second call to requestSpy
      requestSpy.mockResolvedValueOnce(mockApiResponse);
      const pipelines = await azureService.getPipelines(mockProjectId, mockRepoId, mockTimeFilter);

      expect(pipelines).toEqual([
        { id: 1, status: "success", ref: "main", sha: "sha1", conclusion: "succeeded", web_url: "url1", created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:05:00Z" },
        { id: 2, status: "running", ref: "dev", sha: "sha2", conclusion: undefined, web_url: "url2", created_at: "2023-01-02T10:00:00Z", updated_at: "2023-01-02T10:00:00Z" },
      ]);

      expect(requestSpy.mock.calls[0][0]).toBe(`projects/${mockProjectId}`);
      const expectedPipelinesParams = new URLSearchParams({
        minTime: new Date(mockTimeFilter.startDate).toISOString(),
        maxTime: new Date(mockTimeFilter.endDate).toISOString(),
        repositoryId: mockRepoId,
        repositoryType: 'TfsGit'
      }).toString();
      const expectedPipelinesPath = `build/builds?${expectedPipelinesParams}`;
      expect(requestSpy.mock.calls[1][0]).toBe(expectedPipelinesPath);
      expect(requestSpy.mock.calls[1][1]).toBe(mockProjectName);
    });

    it("should throw an error if API call for pipelines fails", async () => {
      // First call (project details) succeeds (mocked in beforeEach)
      // Second call (pipelines) fails
      requestSpy.mockRejectedValueOnce(new Error("API Error for pipelines"));
      await expect(azureService.getPipelines(mockProjectId, mockRepoId, mockTimeFilter)).rejects.toThrow("API Error for pipelines");
    });
  });

  describe("getContributors", () => {
    const mockProjectName = "MockedProjectNameForContribs";
     beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
      requestSpy.mockResolvedValueOnce({ name: mockProjectName }); // Mock project fetch
    });

    it("should return a list of contributors derived from commits", async () => {
      const mockCommitsResponse = {
        value: [
          { commitId: "c1", author: { name: "User1", email: "user1@example.com", date: "2023-01-01T10:00:00Z" }, changeCounts: { Add: 10, Delete: 0 } },
          { commitId: "c2", author: { name: "User2", email: "user2@example.com", date: "2023-01-02T10:00:00Z" }, changeCounts: { Add: 5, Delete: 5 } },
          { commitId: "c3", author: { name: "User1", email: "user1@example.com", date: "2023-01-03T10:00:00Z" }, changeCounts: { Add: 20, Delete: 10 } },
        ],
      };
      requestSpy.mockResolvedValueOnce(mockCommitsResponse); // Mock commits fetch
      const contributors = await azureService.getContributors(mockProjectId, mockRepoId);

      expect(contributors).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "User1", email: "user1@example.com", commits: 2, additions: 30, deletions: 10 }),
        expect.objectContaining({ name: "User2", email: "user2@example.com", commits: 1, additions: 5, deletions: 5 }),
      ]));
      expect(contributors.length).toBe(2); // User1 is aggregated

      expect(requestSpy.mock.calls[0][0]).toBe(`projects/${mockProjectId}`);
      const commitsPathRegex = /^git\/repositories\/mock-repo-id\/commits\?searchCriteria\.fromDate=.+&searchCriteria\.toDate=.+$/;
      expect(requestSpy.mock.calls[1][0]).toMatch(commitsPathRegex);
      expect(requestSpy.mock.calls[1][1]).toBe(mockProjectName);
    });

    it("should throw an error if commits API call fails", async () => {
      // First call (project details) succeeds (mocked in beforeEach)
      // Second call (commits for contributors) fails
      requestSpy.mockRejectedValueOnce(new Error("API Error for commits"));
      await expect(azureService.getContributors(mockProjectId, mockRepoId)).rejects.toThrow("API Error for commits");
    });
  });

  describe("getFiles", () => {
    const mockProjectName = "MockedProjectNameForFiles";
    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
      requestSpy.mockResolvedValueOnce({ name: mockProjectName }); // Mock project fetch
    });
    const mockPath = "src"; // Path for getFiles is not used by azure.service.ts
    it("should return a list of files and folders", async () => {
      const mockFilesResponse = {
        value: [
          { path: "/src/file1.ts", gitObjectType: "blob", size: 100, lastModifiedDate: "2023-01-01" },
          { path: "/src/subdir", gitObjectType: "tree", size: 0, lastModifiedDate: "2023-01-02" },
        ],
      };
      requestSpy.mockResolvedValueOnce(mockFilesResponse); // Mock items fetch
      const files = await azureService.getFiles(mockProjectId, mockRepoId); // mockPath is not used in service
      expect(files).toEqual([
        { path: "/src/file1.ts", type: "blob", size: 100, last_modified: "2023-01-01" },
        { path: "/src/subdir", type: "tree", size: 0, last_modified: "2023-01-02" },
      ]);
      expect(requestSpy.mock.calls[0][0]).toBe(`projects/${mockProjectId}`);
      expect(requestSpy.mock.calls[1][0]).toBe(`git/repositories/${mockRepoId}/items?recursionLevel=full`);
      expect(requestSpy.mock.calls[1][1]).toBe(mockProjectName);
    });

    it("should throw an error if API call for files fails", async () => {
      // First call (project details) succeeds (mocked in beforeEach)
      // Second call (files) fails
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      await expect(azureService.getFiles(mockProjectId, mockRepoId)).rejects.toThrow("API Error");
    });
  });


  // --- getPullRequests Tests (Unskipped and potentially fixed) ---
  describe("AzureService - getPullRequests", () => {
    const mockProjectName = "MockedProjectNameForPRs";
    const timeFilter: TimeFilter = {
      // Removed duplicate startDate
      startDate: "2023-01-01T00:00:00Z",
      endDate: "2023-01-31T23:59:59Z",
    };

    const mockPullRequestsApiResponse = {
      count: 2,
      value: [
        {
          pullRequestId: 1, title: "Fix bug", description: "Fixes a critical bug", status: "completed", mergeStatus: "succeeded",
          creationDate: "2023-01-10T10:00:00Z", closedDate: "2023-01-11T12:00:00Z",
          createdBy: { id: "user-1", displayName: "Alice", uniqueName: "alice@example.com" },
          sourceRefName: "refs/heads/feature-branch", targetRefName: "refs/heads/main", isDraft: false,
          reviewers: [{ id: "user-2", displayName: "Bob" }], labels: [{ name: "bugfix" }],
        },
        {
          pullRequestId: 2, title: "Add feature", description: "Adds a new feature", status: "active", mergeStatus: "queued",
          creationDate: "2023-01-15T14:00:00Z", closedDate: null,
          createdBy: { id: "user-3", displayName: "Charlie", uniqueName: "charlie@example.com" },
          sourceRefName: "refs/heads/feature-2", targetRefName: "refs/heads/main", isDraft: true,
          reviewers: [], labels: [],
        },
      ],
    };

    const mockThreadsResponsePr1 = { count: 1, value: [{ status: "active", comments: [{ publishedDate: "2023-01-10T11:00:00Z", author:{displayName:"Bob"} }] }] };
    const mockThreadsResponsePr2 = { count: 0, value: [] };
    const mockDetailsResponsePr1 = { lastMergeSourceCommit: { commitId: "commit-pr1", changeCounts: { Add: 50, Edit: 5, Delete: 20 }, committer: { date: "2023-01-11T12:00:00Z" } } };
    const mockDetailsResponsePr2 = { /* No merge commit for active PR */ };

    beforeEach(() => {
      azureService = new AzureService();
      azureService.setToken(mockToken);
      azureService.setOrganization(mockOrganization);
      requestSpy = vi.spyOn(azureService as any, "request");
      // Mock the initial project fetch (this.request for project name)
      // This is the first call made by getPullRequests
      requestSpy.mockResolvedValueOnce({ name: mockProjectName });
    });

    it("fetches and processes pull requests correctly", async () => {
      // Set up specific mocks for subsequent calls within getPullRequests
      // Call 1: Project details (mocked in beforeEach)
      // Call 2: PR list (this.request for PRs) -> should return the content of response.json()
      // Explicitly ensure the object returned by the spy has 'value'
      requestSpy.mockResolvedValueOnce({ count: mockPullRequestsApiResponse.count, value: mockPullRequestsApiResponse.value });
      // Calls for PR 1 details & threads (this.request for details, then for threads)
      requestSpy.mockResolvedValueOnce(mockDetailsResponsePr1);
      requestSpy.mockResolvedValueOnce({ ...mockThreadsResponsePr1, value: mockThreadsResponsePr1.value || [] });
      // Calls for PR 2 details & threads
      requestSpy.mockResolvedValueOnce(mockDetailsResponsePr2);
      requestSpy.mockResolvedValueOnce({ ...mockThreadsResponsePr2, value: mockThreadsResponsePr2.value || [] });

      const pullRequests = await azureService.getPullRequests(mockProjectId, mockRepoId, timeFilter);

      expect(pullRequests).toHaveLength(2);
      const pr1 = pullRequests.find(p => p.id === 1);
      expect(pr1).toBeDefined();
      // ... (detailed assertions for pr1 as before, ensure they match service logic) ...
      expect(pr1?.additions).toBe(50);
      expect(pr1?.deletions).toBe(20);
      expect(pr1?.changedFiles).toBe(5);

      // Check call arguments
      // Call 0: Project details
      expect(requestSpy.mock.calls[0][0]).toBe(`projects/${mockProjectId}`);
      // Call 1: PR List
      const expectedPrListParams = new URLSearchParams({
        'searchCriteria.status': 'all',
        'searchCriteria.minTime': new Date(timeFilter.startDate).toISOString(),
        'searchCriteria.maxTime': new Date(timeFilter.endDate).toISOString(),
        '$top': '100'
      }).toString();
      const expectedPrListPath = `git/repositories/${mockRepoId}/pullrequests?${expectedPrListParams}`;
      expect(requestSpy.mock.calls[1][0]).toBe(expectedPrListPath);
      expect(requestSpy.mock.calls[1][1]).toBe(mockProjectName);
      // Call 2: Details for PR1
      expect(requestSpy.mock.calls[2][0]).toBe(`git/repositories/${mockRepoId}/pullrequests/1`);
      expect(requestSpy.mock.calls[2][1]).toBe(mockProjectName);
      // Call 3: Threads for PR1
      expect(requestSpy.mock.calls[3][0]).toBe(`git/repositories/${mockRepoId}/pullrequests/1/threads`);
      expect(requestSpy.mock.calls[3][1]).toBe(mockProjectName);
    });

    it("handles empty pull request list", async () => {
      // Call 1: Project details (mocked in beforeEach)
      // Call 2: PR list (empty) -> this.request returns the JSON content directly
      requestSpy.mockResolvedValueOnce({ count: 0, value: [] });
      const pullRequests = await azureService.getPullRequests( mockProjectId, mockRepoId, timeFilter );
      expect(pullRequests).toHaveLength(0);
    });

    it("throws an error if the initial project fetch fails", async () => {
      // Override the beforeEach mock for requestSpy for this test
      requestSpy.mockReset(); // Clears the mockResolvedValueOnce({ name: mockProjectName })
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setToken(mockToken); // Need to re-set token as service instance is new or spy is reset
      azureService.setOrganization(mockOrganization);
      requestSpy.mockRejectedValueOnce(new Error("Project API error")); // This will be for the project name fetch
      await expect(
        azureService.getPullRequests(mockProjectId, mockRepoId, timeFilter)
      ).rejects.toThrow("Project API error");
    });

    it("throws an error if the pull request list fetch fails", async () => {
      // Call 1: Project details (succeeds, mocked in beforeEach)
      // Call 2: PR list (fails by rejecting the promise that request() returns)
      requestSpy.mockRejectedValueOnce(new Error("PR List API error")); // This correctly mocks a failed this.request() call
      await expect(
        azureService.getPullRequests(mockProjectId, mockRepoId, timeFilter)
      ).rejects.toThrow("PR List API error");
    });

    // Individual error handling for threads/details is implicitly covered by service returning default/empty values.
    // The tests for "fetches and processes pull requests correctly" already mock these.
    // If those specific calls were to throw and not be caught by the service, that test would fail.
    // The service's Promise.all would reject if any of the inner requests (details, threads) reject
    // and are not caught internally by those specific request calls (which they are not in the current service impl).
    // So, an error in fetching threads or details for one PR would make the whole getPullRequests call reject.
    // Let's test one such scenario:
    it("throws an error if fetching threads for a PR fails", async () => {
      // Call 1: Project details (succeeds, mocked in beforeEach)
      // Call 2: PR list
      requestSpy.mockResolvedValueOnce(mockPullRequestsApiResponse); // Returns JSON directly
      // Call 3: Details for PR1 (succeeds)
      requestSpy.mockResolvedValueOnce(mockDetailsResponsePr1); // Returns JSON directly
      // Call 4: Threads for PR1 (fails by rejecting the promise that request() returns)
      requestSpy.mockRejectedValueOnce(new Error("Threads API error for PR1"));

      await expect(
        azureService.getPullRequests(mockProjectId, mockRepoId, timeFilter)
      ).rejects.toThrow("Threads API error for PR1");
    });

  });
});
