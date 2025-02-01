import { describe, it, expect, vi } from 'vitest';
import { DeploymentAnalyzer } from '../deployment';
import { GitLabService } from '../gitlab';

describe('DeploymentAnalyzer', () => {
  const mockGitLabService = {
    getPipelines: vi.fn(),
    getPipelineJobs: vi.fn(),
  } as unknown as GitLabService;

  const analyzer = new DeploymentAnalyzer(mockGitLabService);

  describe('analyzeDeployments', () => {
    it('should handle repositories with no pipelines', async () => {
      mockGitLabService.getPipelines.mockResolvedValueOnce([]);

      const metrics = await analyzer.analyzeDeployments(1);
      expect(metrics.frequency).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.avgTimeBetween).toBe(0);
      expect(metrics.pipelineEfficiency).toBe(0);
      expect(metrics.rollbackRate).toBe(0);
    });

    it('should calculate metrics correctly for successful pipelines', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const mockPipelines = [
        {
          id: 1,
          status: 'success',
          ref: 'main',
          sha: 'abc123',
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        {
          id: 2,
          status: 'success',
          ref: 'main',
          sha: 'def456',
          created_at: yesterday.toISOString(),
          updated_at: yesterday.toISOString(),
        },
      ];

      const mockJobs = [
        { id: 1, status: 'success', stage: 'build', name: 'build' },
        { id: 2, status: 'success', stage: 'test', name: 'test' },
        { id: 3, status: 'success', stage: 'deploy', name: 'deploy' },
      ];

      mockGitLabService.getPipelines.mockResolvedValueOnce(mockPipelines);
      mockGitLabService.getPipelineJobs.mockResolvedValue(mockJobs);

      const metrics = await analyzer.analyzeDeployments(1);
      expect(metrics.successRate).toBe(100);
      expect(metrics.pipelineEfficiency).toBe(100);
      expect(metrics.rollbackRate).toBe(0);
    });

    it('should identify rollbacks and failed pipelines', async () => {
      const mockPipelines = [
        {
          id: 1,
          status: 'success',
          ref: 'main',
          sha: 'abc123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          status: 'failed',
          ref: 'main',
          sha: 'def456',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          status: 'success',
          ref: 'revert-123',
          sha: 'ghi789',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message: 'Revert "Feature X"',
        },
      ];

      const mockJobs = [
        { id: 1, status: 'success', stage: 'build', name: 'build' },
        { id: 2, status: 'failed', stage: 'test', name: 'test' },
      ];

      mockGitLabService.getPipelines.mockResolvedValueOnce(mockPipelines);
      mockGitLabService.getPipelineJobs.mockResolvedValue(mockJobs);

      const metrics = await analyzer.analyzeDeployments(1);
      expect(metrics.successRate).toBeLessThan(100);
      expect(metrics.pipelineEfficiency).toBeLessThan(100);
      expect(metrics.rollbackRate).toBeGreaterThan(0);
    });
  });
});