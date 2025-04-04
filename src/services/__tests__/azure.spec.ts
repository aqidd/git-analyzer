import { describe, it, expect, vi } from "vitest";
import { AzureService } from "../azure.service";
import type { PullRequest, TimeFilter } from "@/types/repository";

// filepath: /Users/klinikpintar2417/Documents/OpenSource/git-analyzer/src/services/azure.service.test.ts

describe("AzureService - getPullRequests", () => {
  const azureService = new AzureService();
  azureService.setToken("mock-token");
  azureService.setOrganization("mock-organization");

  const mockProjectId = "mock-project-id";
  const mockRepoId = "mock-repo-id";
  const mockTimeFilter: TimeFilter = {
    startDate: "2023-01-01",
    endDate: "2023-01-31",
  };

  const mockPullRequestsResponse = {
    count: 2,
    value: [
      {
        pullRequestId: 1,
        title: "Fix bug",
        description: "Fixes a critical bug",
        status: "completed",
        mergeStatus: "succeeded",
        creationDate: "2023-01-10T10:00:00Z",
        closedDate: "2023-01-11T12:00:00Z",
        createdBy: {
          id: "user-1",
          displayName: "Alice",
          uniqueName: "alice@example.com",
        },
        sourceRefName: "refs/heads/feature-branch",
        targetRefName: "refs/heads/main",
        isDraft: false,
        reviewers: [
          {
            id: "user-2",
            displayName: "Bob",
            uniqueName: "bob@example.com",
          },
        ],
        labels: ["bugfix"],
      },
      {
        pullRequestId: 2,
        title: "Add feature",
        description: "Adds a new feature",
        status: "active",
        creationDate: "2023-01-15T14:00:00Z",
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

  const mockThreadsResponse = {
    count: 1,
    value: [
      {
        status: "active",
        comments: [
          {
            publishedDate: "2023-01-10T11:00:00Z",
          },
        ],
      },
    ],
  };

  const mockDetailsResponse = {
    lastMergeSourceCommit: {
      changeCounts: {
        Add: 50,
        Delete: 20,
        Edit: 5,
      },
      committer: {
        date: "2023-01-11T12:00:00Z",
      },
    },
  };

  vi.spyOn(azureService as any, "request").mockImplementation(
    async (path: unknown): Promise<any> => {
      if (typeof path === "string" && path.includes("pullrequests?")) {
        return mockPullRequestsResponse;
      } else if (typeof path === "string" && path.includes("threads")) {
        return mockThreadsResponse;
      } else if (typeof path === "string" && path.includes("pullrequests/")) {
        return mockDetailsResponse;
      }
      throw new Error("Unexpected API call");
    }
  );

  it.skip("fetches and processes pull requests correctly", async () => {
    const pullRequests = await azureService.getPullRequests(
      mockProjectId,
      mockRepoId,
      mockTimeFilter
    );

    expect(pullRequests).toHaveLength(2);

    // Validate the first pull request
    const pr1 = pullRequests[0];
    expect(pr1.id).toBe(1);
    expect(pr1.title).toBe("Fix bug");
    expect(pr1.description).toBe("Fixes a critical bug");
    expect(pr1.state).toBe("merged");
    expect(pr1.createdAt).toBe("2023-01-10T10:00:00Z");
    expect(pr1.updatedAt).toBe("2023-01-11T12:00:00Z");
    expect(pr1.mergedAt).toBe("2023-01-11T12:00:00Z");
    expect(pr1.closedAt).toBe("2023-01-11T12:00:00Z");
    expect(pr1.author.name).toBe("Alice");
    expect(pr1.sourceBranch).toBe("feature-branch");
    expect(pr1.targetBranch).toBe("main");
    expect(pr1.isDraft).toBe(false);
    expect(pr1.comments).toBe(1);
    expect(pr1.reviewCount).toBe(1);
    expect(pr1.additions).toBe(50);
    expect(pr1.deletions).toBe(20);
    expect(pr1.changedFiles).toBe(5);
    // expect(pr1.locChanged).toBe(70)
    expect(pr1.labels).toEqual(["bugfix"]);
    expect(pr1.timeToMerge).toBeCloseTo(26, 1); // ~26 hours
    expect(pr1.timeToFirstReview).toBeCloseTo(1, 1); // ~1 hour

    // Validate the second pull request
    const pr2 = pullRequests[1];
    expect(pr2.id).toBe(2);
    expect(pr2.title).toBe("Add feature");
    expect(pr2.description).toBe("Adds a new feature");
    expect(pr2.state).toBe("open");
    expect(pr2.createdAt).toBe("2023-01-15T14:00:00Z");
    expect(pr2.updatedAt).toBe("2023-01-15T14:00:00Z");
    expect(pr2.mergedAt).toBeUndefined();
    expect(pr2.closedAt).toBeUndefined();
    expect(pr2.author.name).toBe("Charlie");
    expect(pr2.sourceBranch).toBe("feature-2");
    expect(pr2.targetBranch).toBe("main");
    expect(pr2.isDraft).toBe(true);
    expect(pr2.comments).toBe(0);
    expect(pr2.reviewCount).toBe(0);
    expect(pr2.additions).toBe(0);
    expect(pr2.deletions).toBe(0);
    expect(pr2.changedFiles).toBe(0);
    // expect(pr2.locChanged).toBe(0)
    expect(pr2.labels).toEqual([]);
    expect(pr2.timeToMerge).toBeUndefined();
    expect(pr2.timeToFirstReview).toBeUndefined();
  });

  it.skip("handles empty pull request list", async () => {
    vi.spyOn(azureService as any, "request").mockResolvedValueOnce({
      count: 0,
      value: [],
    });

    const pullRequests = await azureService.getPullRequests(
      mockProjectId,
      mockRepoId,
      mockTimeFilter
    );

    expect(pullRequests).toHaveLength(0);
  });

  it("throws an error for failed API calls", async () => {
    vi.spyOn(azureService as any, "request").mockRejectedValueOnce(
      new Error("API error")
    );

    await expect(
      azureService.getPullRequests(mockProjectId, mockRepoId, mockTimeFilter)
    ).rejects.toThrow("API error");
  });
});
