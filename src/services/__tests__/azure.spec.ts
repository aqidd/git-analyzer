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
    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
    });
    it("should return true for a valid token and organization", async () => {
      azureService.setOrganization(mockOrganization);
      requestSpy.mockResolvedValueOnce({ value: [{ id: "project" }] }); // Mock successful projects fetch

      const isValid = await azureService.validateToken();
      expect(isValid).toBe(true);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/_apis/projects?api-version=7.0`
      );
    });

    it("should return false if organization is not set", async () => {
      // @ts-expect-error testing invalid state
      azureService.organization = undefined;
      const isValid = await azureService.validateToken();
      expect(isValid).toBe(false);
      expect(requestSpy).not.toHaveBeenCalled();
    });

    it("should return false if API call fails", async () => {
      azureService.setOrganization(mockOrganization);
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      const isValid = await azureService.validateToken();
      expect(isValid).toBe(false);
    });

    it("should return false if API returns empty value for projects", async () => {
      azureService.setOrganization(mockOrganization);
      requestSpy.mockResolvedValueOnce({ value: [] });
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
      const mockProjects = { value: [{ id: "p1", name: "Project1" }] };
      requestSpy.mockResolvedValueOnce(mockProjects);
      const projects = await azureService.getProjects();
      expect(projects).toEqual(mockProjects.value);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/_apis/projects?api-version=7.0`
      );
    });

    it("should return an empty list if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      const projects = await azureService.getProjects();
      expect(projects).toEqual([]);
    });

    it("should return an empty list if organization is not set", async () => {
       // @ts-expect-error testing invalid state
      azureService.organization = undefined;
      const projects = await azureService.getProjects();
      expect(projects).toEqual([]);
      expect(requestSpy).not.toHaveBeenCalled();
    });
  });

  describe("getRepositories", () => {
    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });

    it("should return a list of repositories for a project", async () => {
      const mockRepos = { value: [{ id: "r1", name: "Repo1" }] };
      requestSpy.mockResolvedValueOnce(mockRepos);
      const repos = await azureService.getRepositories(mockProjectId);
      expect(repos).toEqual(mockRepos.value);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/${mockProjectId}/_apis/git/repositories?api-version=7.0`
      );
    });

    it("should return an empty list if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      const repos = await azureService.getRepositories(mockProjectId);
      expect(repos).toEqual([]);
    });
  });

  describe("getBranchStats", () => {
     beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });
    it("should return branch statistics", async () => {
      const mockStats = { aheadCount: 5, behindCount: 10 };
      requestSpy.mockResolvedValueOnce(mockStats);
      const stats = await azureService.getBranchStats(mockProjectId, mockRepoId, "main");
      expect(stats).toEqual(mockStats);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/${mockProjectId}/_apis/git/repositories/${mockRepoId}/stats/branches/main?api-version=7.0`
      );
    });

    it("should return null if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      const stats = await azureService.getBranchStats(mockProjectId, mockRepoId, "main");
      expect(stats).toBeNull();
    });
  });

  describe("getCommits", () => {
    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });
    const mockBranchName = "main";
    it("should return a list of commits for a branch", async () => {
      const mockApiResponse = { value: [{ commitId: "c1", comment: "Initial commit" }] };
      requestSpy.mockResolvedValueOnce(mockApiResponse);
      const commits = await azureService.getCommits(mockProjectId, mockRepoId, mockBranchName);
      expect(commits).toEqual(mockApiResponse.value);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/${mockProjectId}/_apis/git/repositories/${mockRepoId}/commits?searchCriteria.itemVersion.version=${mockBranchName}&api-version=7.0`
      );
    });

    it("should return an empty list if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      const commits = await azureService.getCommits(mockProjectId, mockRepoId, mockBranchName);
      expect(commits).toEqual([]);
    });
  });

  describe("getPipelines", () => {
     beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });
    it("should return a list of pipelines with mapped statuses and results", async () => {
      const mockApiResponse = {
        value: [
          { id: 1, name: "Build Pipeline", status: "completed", result: "succeeded", finishedTime: "2023-01-01T12:00:00Z", _links: { web: { href: "url1" } } },
          { id: 2, name: "Deploy Pipeline", status: "inProgress", result: null, finishedTime: null, _links: { web: { href: "url2" } } },
          { id: 3, name: "Test Pipeline", status: "cancelling", result: "failed", finishedTime: "2023-01-03T12:00:00Z", _links: { web: { href: "url3" } } },
          { id: 4, name: "Other Pipeline", status: "notStarted", result: "skipped", finishedTime: "2023-01-04T12:00:00Z", _links: { web: { href: "url4" } } },
          { id: 5, name: "Unknown Result Pipeline", status: "completed", result: "unknown", finishedTime: "2023-01-05T12:00:00Z", _links: { web: { href: "url5" } } },
        ],
      };
      requestSpy.mockResolvedValueOnce(mockApiResponse);
      const pipelines = await azureService.getPipelines(mockProjectId, mockRepoId);
      expect(pipelines).toEqual([
        { id: 1, name: "Build Pipeline", status: "Succeeded", finishedAt: "2023-01-01T12:00:00Z", url: "url1" },
        { id: 2, name: "Deploy Pipeline", status: "In Progress", finishedAt: null, url: "url2" },
        { id: 3, name: "Test Pipeline", status: "Failed", finishedAt: "2023-01-03T12:00:00Z", url: "url3" },
        { id: 4, name: "Other Pipeline", status: "Skipped", finishedAt: "2023-01-04T12:00:00Z", url: "url4" },
        { id: 5, name: "Unknown Result Pipeline", status: "Unknown", finishedAt: "2023-01-05T12:00:00Z", url: "url5" },
      ]);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/${mockProjectId}/_apis/pipelines?repositoryId=${mockRepoId}&api-version=7.0`
      );
    });

    it("should return an empty list if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      const pipelines = await azureService.getPipelines(mockProjectId, mockRepoId);
      expect(pipelines).toEqual([]);
    });
  });

  describe("getContributors", () => {
    // Azure DevOps doesn't have a direct "contributors" endpoint like GitHub/GitLab.
    // It's usually derived from commit history. The service method currently gets commits.
    // So, these tests will reflect that it's returning commit authors.
     beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });
    it("should return a list of commit authors as contributors", async () => {
      const mockCommitsResponse = {
        value: [
          { commitId: "c1", author: { name: "User1", email: "user1@example.com" } },
          { commitId: "c2", author: { name: "User2", email: "user2@example.com" } },
          { commitId: "c3", author: { name: "User1", email: "user1@example.com" } }, // Duplicate author
        ],
      };
      requestSpy.mockResolvedValueOnce(mockCommitsResponse);
      const contributors = await azureService.getContributors(mockProjectId, mockRepoId);
      // The service method likely de-duplicates based on email or name.
      // Assuming it returns the raw authors from commits for now, as per current service code.
      expect(contributors).toEqual([
        { name: "User1", email: "user1@example.com" },
        { name: "User2", email: "user2@example.com" },
        { name: "User1", email: "user1@example.com" },
      ]);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/${mockProjectId}/_apis/git/repositories/${mockRepoId}/commits?api-version=7.0`
      );
    });

    it("should return an empty list if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      const contributors = await azureService.getContributors(mockProjectId, mockRepoId);
      expect(contributors).toEqual([]);
    });
  });

  describe("getFiles", () => {
    beforeEach(() => {
      requestSpy = vi.spyOn(azureService as any, "request");
      azureService.setOrganization(mockOrganization);
    });
    const mockPath = "src";
    it("should return a list of files and folders for a given path", async () => {
      const mockFilesResponse = {
        value: [
          { path: "/src/file1.ts", gitObjectType: "blob", url: "url1" }, // blob is file
          { path: "/src/subdir", gitObjectType: "tree", url: "url2" },   // tree is folder
        ],
      };
      requestSpy.mockResolvedValueOnce(mockFilesResponse);
      const files = await azureService.getFiles(mockProjectId, mockRepoId, mockPath);
      expect(files).toEqual([
        { name: "file1.ts", path: "/src/file1.ts", type: "file", url: "url1" },
        { name: "subdir", path: "/src/subdir", type: "folder", url: "url2" },
      ]);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/${mockOrganization}/${mockProjectId}/_apis/git/repositories/${mockRepoId}/items?scopePath=${mockPath}&api-version=7.0`
      );
    });

    it("should return an empty list if API call fails", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API Error"));
      const files = await azureService.getFiles(mockProjectId, mockRepoId, mockPath);
      expect(files).toEqual([]);
    });

    it("should return an empty list for non-200 responses", async () => {
      requestSpy.mockResolvedValueOnce({ value: null }); // Or simulate an error from request
      const files = await azureService.getFiles(mockProjectId, mockRepoId, mockPath);
      expect(files).toEqual([]);
    });
  });


  // --- getPullRequests Tests (Unskipped and potentially fixed) ---
  describe("AzureService - getPullRequests", () => {
    const timeFilter: TimeFilter = {
      startDate: "2023-01-01",
      endDate: "2023-01-31",
    };

    // Mock data moved here for clarity within this describe block
    const mockPullRequestsResponse = {
      count: 2,
      value: [
        {
          pullRequestId: 1,
          title: "Fix bug",
          description: "Fixes a critical bug",
          status: "completed", // completed = merged or abandoned
          mergeStatus: "succeeded", // if status is completed, this indicates merged
          creationDate: "2023-01-10T10:00:00Z",
          closedDate: "2023-01-11T12:00:00Z", // Used for mergedAt if mergeStatus is succeeded
          createdBy: {
            id: "user-1",
            displayName: "Alice",
            uniqueName: "alice@example.com",
          },
          sourceRefName: "refs/heads/feature-branch",
          targetRefName: "refs/heads/main",
          isDraft: false,
          reviewers: [{ id: "user-2", displayName: "Bob" }],
          labels: [{ name: "bugfix" }], // Azure labels are objects with a name property
        },
        {
          pullRequestId: 2,
          title: "Add feature",
          description: "Adds a new feature",
          status: "active",
          mergeStatus: "queued", // Not merged
          creationDate: "2023-01-15T14:00:00Z",
          closedDate: null,
          createdBy: {
            id: "user-3",
            displayName: "Charlie",
            uniqueName: "charlie@example.com",
          },
          sourceRefName: "refs/heads/feature-2",
          targetRefName: "refs/heads/main",
          isDraft: true,
          reviewers: [],
          labels: [],
        },
      ],
    };

    const mockThreadsResponsePr1 = {
      count: 1,
      value: [{ status: "active", comments: [{ publishedDate: "2023-01-10T11:00:00Z", author:{displayName:"Bob"} }] }], // Assuming Bob made the comment
    };
     const mockThreadsResponsePr2 = { // No comments for PR2
      count: 0,
      value: [],
    };


    const mockDetailsResponsePr1 = {
      lastMergeSourceCommit: { // This is for PR1 which is merged
        commitId: "commit-pr1",
        changeCounts: { Add: 50, Edit: 5, Delete: 20 },
        committer: { date: "2023-01-11T12:00:00Z" }, // This is the merge commit date
      },
    };
     const mockDetailsResponsePr2 = { // PR2 is not merged, so no lastMergeSourceCommit
        // but other details might exist. For simplicity, let's assume it's minimal or doesn't affect the tested fields.
     };


    beforeEach(() => {
      azureService = new AzureService();
      azureService.setToken(mockToken);
      azureService.setOrganization(mockOrganization);
      requestSpy = vi.spyOn(azureService as any, "request");
    });

    it("fetches and processes pull requests correctly", async () => {
      requestSpy.mockImplementation(async (path: string) => {
        if (path.includes("pullrequests?")) {
          return mockPullRequestsResponse;
        } else if (path.includes(`pullrequests/1/threads`)) {
          return mockThreadsResponsePr1;
        } else if (path.includes(`pullrequests/2/threads`)) {
          return mockThreadsResponsePr2;
        } else if (path.includes(`pullrequests/1`)) { // Specific details for PR 1
          return mockDetailsResponsePr1;
        } else if (path.includes(`pullrequests/2`)) { // Specific details for PR 2
          return mockDetailsResponsePr2; // No merge commit details for active PR
        }
        throw new Error(`Unexpected API call in test: ${path}`);
      });

      const pullRequests = await azureService.getPullRequests(
        mockProjectId,
        mockRepoId,
        timeFilter
      );

      expect(pullRequests).toHaveLength(2);
      const pr1 = pullRequests.find(p => p.id === 1);
      const pr2 = pullRequests.find(p => p.id === 2);

      expect(pr1).toBeDefined();
      expect(pr2).toBeDefined();

      // Validate the first pull request (merged)
      expect(pr1?.id).toBe(1);
      expect(pr1?.title).toBe("Fix bug");
      expect(pr1?.description).toBe("Fixes a critical bug");
      expect(pr1?.state).toBe("merged"); // derived from status: completed, mergeStatus: succeeded
      expect(pr1?.createdAt).toBe("2023-01-10T10:00:00Z");
      expect(pr1?.updatedAt).toBe("2023-01-11T12:00:00Z"); // closedDate is used if available
      expect(pr1?.mergedAt).toBe("2023-01-11T12:00:00Z"); // closedDate when completed and succeeded
      expect(pr1?.closedAt).toBe("2023-01-11T12:00:00Z");
      expect(pr1?.author.name).toBe("Alice");
      expect(pr1?.sourceBranch).toBe("feature-branch"); // from sourceRefName
      expect(pr1?.targetBranch).toBe("main"); // from targetRefName
      expect(pr1?.isDraft).toBe(false);
      expect(pr1?.comments).toBe(1); // from mockThreadsResponsePr1
      expect(pr1?.reviewCount).toBe(1); // from reviewers list
      expect(pr1?.additions).toBe(50);
      expect(pr1?.deletions).toBe(20);
      expect(pr1?.changedFiles).toBe(5); // Edit counts as changed
      expect(pr1?.labels).toEqual(["bugfix"]); // from labels array
      expect(pr1?.timeToMerge).toBeCloseTo((new Date("2023-01-11T12:00:00Z").getTime() - new Date("2023-01-10T10:00:00Z").getTime()) / (1000 * 60 * 60) , 0); // 26 hours
      expect(pr1?.timeToFirstReview).toBeCloseTo((new Date("2023-01-10T11:00:00Z").getTime() - new Date("2023-01-10T10:00:00Z").getTime()) / (1000 * 60 * 60), 0); // 1 hour


      // Validate the second pull request (active, draft)
      expect(pr2?.id).toBe(2);
      expect(pr2?.title).toBe("Add feature");
      expect(pr2?.state).toBe("open"); // derived from status: active
      expect(pr2?.createdAt).toBe("2023-01-15T14:00:00Z");
      expect(pr2?.updatedAt).toBe("2023-01-15T14:00:00Z"); // creationDate if closedDate is null
      expect(pr2?.mergedAt).toBeUndefined();
      expect(pr2?.closedAt).toBeUndefined();
      expect(pr2?.author.name).toBe("Charlie");
      expect(pr2?.sourceBranch).toBe("feature-2");
      expect(pr2?.targetBranch).toBe("main");
      expect(pr2?.isDraft).toBe(true);
      expect(pr2?.comments).toBe(0); // from mockThreadsResponsePr2
      expect(pr2?.reviewCount).toBe(0);
      // For active PRs without a lastMergeSourceCommit, additions/deletions/changedFiles might be 0 or fetched differently.
      // The current service implementation seems to rely on lastMergeSourceCommit for these.
      // If it's not present (like for PR2), these default to 0.
      expect(pr2?.additions).toBe(0);
      expect(pr2?.deletions).toBe(0);
      expect(pr2?.changedFiles).toBe(0);
      expect(pr2?.labels).toEqual([]);
      expect(pr2?.timeToMerge).toBeUndefined();
      expect(pr2?.timeToFirstReview).toBeUndefined();
    });

    it("handles empty pull request list", async () => {
      requestSpy.mockResolvedValueOnce({ count: 0, value: [] });
      const pullRequests = await azureService.getPullRequests( mockProjectId, mockRepoId, timeFilter );
      expect(pullRequests).toHaveLength(0);
    });

    it("throws an error for failed API calls when fetching initial list", async () => {
      requestSpy.mockRejectedValueOnce(new Error("API error"));
      await expect(
        azureService.getPullRequests(mockProjectId, mockRepoId, timeFilter)
      ).rejects.toThrow("API error");
    });

     it("handles API error when fetching threads for a pull request", async () => {
      requestSpy.mockImplementation(async (path: string) => {
        if (path.includes("pullrequests?")) return mockPullRequestsResponse; // PR list succeeds
        if (path.includes("threads")) throw new Error("Threads API error"); // Threads call fails
        if (path.includes("pullrequests/1")) return mockDetailsResponsePr1;
        return {};
      });

      // Expect it not to throw, but PR data might be incomplete (e.g., comments = 0)
      const pullRequests = await azureService.getPullRequests(mockProjectId, mockRepoId, timeFilter);
      expect(pullRequests[0].comments).toBe(0); // Falls back to 0
      expect(pullRequests[0].timeToFirstReview).toBeUndefined(); // Cannot calculate
    });

    it("handles API error when fetching details for a pull request", async () => {
       requestSpy.mockImplementation(async (path: string) => {
        if (path.includes("pullrequests?")) return mockPullRequestsResponse;
        if (path.includes("threads")) return mockThreadsResponsePr1;
        if (path.includes("pullrequests/1")) throw new Error("Details API error"); // Details call fails
        return {};
      });
      // Expect it not to throw, but PR data might be incomplete (e.g., additions/deletions = 0)
      const pullRequests = await azureService.getPullRequests(mockProjectId, mockRepoId, timeFilter);
      expect(pullRequests[0].additions).toBe(0); // Falls back to 0
      expect(pullRequests[0].deletions).toBe(0);
      expect(pullRequests[0].changedFiles).toBe(0);
    });
  });
});
