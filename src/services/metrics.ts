import { GitLabService } from './gitlab';
import {
  DocumentationMetrics,
  TestingMetrics,
  CommitMetrics,
  SecurityMetrics,
  DeploymentMetrics,
  AnalyticsScore,
} from '../types/gitlab';

export class MetricsService {
  private gitlabService: GitLabService;

  constructor(gitlabService: GitLabService) {
    this.gitlabService = gitlabService;
  }

  calculateDocumentationScore(metrics: DocumentationMetrics): number {
    const weights = {
      readme: 0.3,
      adr: 0.2,
      inlineDoc: 0.3,
      contributing: 0.1,
      license: 0.1,
    };

    let score = 0;
    score += metrics.readmeScore * weights.readme;
    score += metrics.adrScore * weights.adr;
    score += metrics.inlineDocScore * weights.inlineDoc;
    score += (metrics.contributingGuideExists ? 100 : 0) * weights.contributing;
    score += (metrics.licenseExists ? 100 : 0) * weights.license;

    return Math.round(score);
  }

  calculateTestingScore(metrics: TestingMetrics): number {
    const weights = {
      coverage: 0.4,
      testCount: 0.2,
      executionTime: 0.2,
      reliability: 0.2,
    };

    const normalizedTestCount = Math.min(
      (metrics.unitTestCount + metrics.integrationTestCount + metrics.e2eTestCount) / 100,
      1
    ) * 100;

    const normalizedExecutionTime = Math.max(0, 100 - (metrics.avgExecutionTime / 10));

    let score = 0;
    score += metrics.coverage * weights.coverage;
    score += normalizedTestCount * weights.testCount;
    score += normalizedExecutionTime * weights.executionTime;
    score += metrics.reliability * weights.reliability;

    return Math.round(score);
  }

  calculateCommitScore(metrics: CommitMetrics): number {
    const weights = {
      conventionalFormat: 0.2,
      size: 0.4,
      frequency: 0.2,
      problematic: 0.2,
    };

    const normalizedSize = Math.max(0, 100 - (metrics.avgCommitSize));
    const normalizedFrequency = Math.min(metrics.commitFrequency * 20, 100);
    const problematicScore = Math.max(0, 100 - metrics.problematicCommitsRate * 100);

    let score = 0;
    score += metrics.conventionalCommitRate * weights.conventionalFormat;
    score += normalizedSize * weights.size;
    score += normalizedFrequency * weights.frequency;
    score += problematicScore * weights.problematic;

    return Math.round(score);
  }

  calculateSecurityScore(metrics: SecurityMetrics): number {
    const weights = {
      vulnerabilities: 0.3,
      secrets: 0.5,
      patchTime: 0.2,
    };

    const vulnerabilityScore = Math.max(0, 100 - (metrics.vulnerabilityCount * 10));
    const secretsScore = Math.max(0, 100 - (metrics.exposedSecretsCount * 50));
    const patchTimeScore = Math.max(0, 100 - (metrics.avgPatchTime / 24) * 10);

    let score = 0;
    score += vulnerabilityScore * weights.vulnerabilities;
    score += secretsScore * weights.secrets;
    score += patchTimeScore * weights.patchTime;

    return Math.round(score);
  }

  calculateDeploymentScore(metrics: DeploymentMetrics): number {
    const weights = {
      frequency: 0.2,
      success: 0.2,
      efficiency: 0.2,
      rollback: 0.4,
    };

    const normalizedFrequency = Math.min(metrics.frequency * 20, 100);
    const rollbackScore = Math.max(0, 100 - (metrics.rollbackRate * 500));

    let score = 0;
    score += normalizedFrequency * weights.frequency;
    score += metrics.successRate * weights.success;
    score += metrics.pipelineEfficiency * weights.efficiency;
    score += rollbackScore * weights.rollback;

    return Math.round(score);
  }

  calculateOverallScore(scores: Omit<AnalyticsScore, 'overall'>): number {
    const weights = {
      documentation: 0.2,
      testing: 0.2,
      commits: 0.2,
      security: 0.2,
      deployment: 0.2,
    };

    let overallScore = 0;
    overallScore += scores.documentation * weights.documentation;
    overallScore += scores.testing * weights.testing;
    overallScore += scores.commits * weights.commits;
    overallScore += scores.security * weights.security;
    overallScore += scores.deployment * weights.deployment;

    return Math.round(overallScore);
  }
}