import { describe, it, expect, vi } from 'vitest';
import { CommitAnalyzer } from '../commit';
import { GitLabService } from '../gitlab';

describe('CommitAnalyzer', () => {
  const mockGitLabService = {
    getCommits: vi.fn(),
  } as unknown as GitLabService;

  const analyzer = new CommitAnalyzer(mockGitLabService);

  describe('analyzeRepository', () => {
    it('should handle empty repositories', async () => {
      mockGitLabService.getCommits.mockResolvedValueOnce([]);

      const metrics = await analyzer.analyzeRepository(1);
      expect(metrics.conventionalCommitRate).toBe(0);
      expect(metrics.avgCommitSize).toBe(0);
      expect(metrics.commitFrequency).toBe(0);
      expect(metrics.problematicCommitsRate).toBe(0);
    });

    it('should analyze conventional commits correctly', async () => {
      const mockCommits = [
        {
          id: '1',
          title: 'feat: add new feature',
          message: 'feat: add new feature\n\nDetailed description',
          stats: { additions: 100, deletions: 50, total: 150 },
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'fix: resolve bug',
          message: 'fix: resolve bug\n\nFix description',
          stats: { additions: 20, deletions: 10, total: 30 },
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'update stuff',
          message: 'update stuff',
          stats: { additions: 5, deletions: 5, total: 10 },
          created_at: new Date().toISOString(),
        },
      ];

      mockGitLabService.getCommits.mockResolvedValueOnce(mockCommits);

      const metrics = await analyzer.analyzeRepository(1);
      expect(metrics.conventionalCommitRate).toBe(66.66666666666666);
      expect(metrics.avgCommitSize).toBe(63.333333333333336);
      expect(metrics.problematicCommitsRate).toBe(0.3333333333333333);
    });

    it('should identify problematic commits', async () => {
      const mockCommits = [
        {
          id: '1',
          title: 'wip',
          message: 'wip',
          stats: { additions: 2000, deletions: 1000, total: 3000 },
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: '...',
          message: '...\n\n<<<<<<< HEAD\nConflict\n=======\nOther\n>>>>>>> branch',
          stats: { additions: 10, deletions: 5, total: 15 },
          created_at: new Date().toISOString(),
        },
      ];

      mockGitLabService.getCommits.mockResolvedValueOnce(mockCommits);

      const metrics = await analyzer.analyzeRepository(1);
      expect(metrics.conventionalCommitRate).toBe(0);
      expect(metrics.problematicCommitsRate).toBe(1);
    });
  });
});