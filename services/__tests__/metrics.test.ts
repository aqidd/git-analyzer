import { describe, it, expect } from 'vitest';
import { MetricsService } from '../metrics';
import { GitLabService } from '../gitlab';

describe('MetricsService', () => {
  const gitlabService = new GitLabService({
    apiToken: 'test-token',
    baseUrl: 'https://gitlab.com',
  });
  const metricsService = new MetricsService(gitlabService);

  describe('calculateDocumentationScore', () => {
    it('should calculate perfect documentation score', () => {
      const metrics = {
        readmeScore: 100,
        adrScore: 100,
        inlineDocScore: 100,
        contributingGuideExists: true,
        licenseExists: true,
        totalScore: 100,
      };

      expect(metricsService.calculateDocumentationScore(metrics)).toBe(100);
    });

    it('should calculate partial documentation score', () => {
      const metrics = {
        readmeScore: 80,
        adrScore: 60,
        inlineDocScore: 70,
        contributingGuideExists: true,
        licenseExists: false,
        totalScore: 0,
      };

      const score = metricsService.calculateDocumentationScore(metrics);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });

  describe('calculateTestingScore', () => {
    it('should calculate perfect testing score', () => {
      const metrics = {
        coverage: 100,
        unitTestCount: 200,
        integrationTestCount: 50,
        e2eTestCount: 20,
        avgExecutionTime: 0,
        reliability: 100,
      };

      expect(metricsService.calculateTestingScore(metrics)).toBe(100);
    });

    it('should penalize long execution times', () => {
      const metrics = {
        coverage: 100,
        unitTestCount: 200,
        integrationTestCount: 50,
        e2eTestCount: 20,
        avgExecutionTime: 50,
        reliability: 100,
      };

      const score = metricsService.calculateTestingScore(metrics);
      expect(score).toBeLessThan(100);
    });
  });

  describe('calculateCommitScore', () => {
    it('should calculate perfect commit score', () => {
      const metrics = {
        conventionalCommitRate: 100,
        avgCommitSize: 10,
        commitFrequency: 5,
        problematicCommitsRate: 0,
      };

      const score = metricsService.calculateCommitScore(metrics);
      expect(score).toBeGreaterThan(90);
    });

    it('should penalize large commits and problematic commits', () => {
      const metrics = {
        conventionalCommitRate: 100,
        avgCommitSize: 200,
        commitFrequency: 5,
        problematicCommitsRate: 0.5,
      };

      const score = metricsService.calculateCommitScore(metrics);
      expect(score).toBeLessThan(80);
    });
  });

  describe('calculateSecurityScore', () => {
    it('should calculate perfect security score', () => {
      const metrics = {
        vulnerabilityCount: 0,
        exposedSecretsCount: 0,
        avgPatchTime: 0,
        securityScore: 100,
      };

      expect(metricsService.calculateSecurityScore(metrics)).toBe(100);
    });

    it('should heavily penalize exposed secrets', () => {
      const metrics = {
        vulnerabilityCount: 2,
        exposedSecretsCount: 3,
        avgPatchTime: 24,
        securityScore: 0,
      };

      const score = metricsService.calculateSecurityScore(metrics);
      expect(score).toBeLessThan(50);
    });
  });

  describe('calculateDeploymentScore', () => {
    it('should calculate perfect deployment score', () => {
      const metrics = {
        frequency: 5,
        successRate: 100,
        avgTimeBetween: 0,
        pipelineEfficiency: 100,
        rollbackRate: 0,
      };

      expect(metricsService.calculateDeploymentScore(metrics)).toBe(100);
    });

    it('should penalize high rollback rates', () => {
      const metrics = {
        frequency: 5,
        successRate: 90,
        avgTimeBetween: 0,
        pipelineEfficiency: 80,
        rollbackRate: 0.3,
      };

      const score = metricsService.calculateDeploymentScore(metrics);
      expect(score).toBeLessThan(90);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate perfect overall score', () => {
      const scores = {
        documentation: 100,
        testing: 100,
        commits: 100,
        security: 100,
        deployment: 100,
      };

      expect(metricsService.calculateOverallScore(scores)).toBe(100);
    });

    it('should calculate balanced overall score', () => {
      const scores = {
        documentation: 80,
        testing: 90,
        commits: 70,
        security: 85,
        deployment: 75,
      };

      const score = metricsService.calculateOverallScore(scores);
      expect(score).toBe(80);
    });
  });
});