export interface GitLabConfig {
  apiToken: string;
  baseUrl: string;
}

export interface Repository {
  id: number;
  name: string;
  description: string;
  web_url: string;
  last_activity_at: string;
  default_branch: string;
}

export interface AnalyticsScore {
  documentation: number;
  testing: number;
  commits: number;
  security: number;
  deployment: number;
  overall: number;
}

export interface DocumentationMetrics {
  readmeScore: number;
  adrScore: number;
  inlineDocScore: number;
  contributingGuideExists: boolean;
  licenseExists: boolean;
  totalScore: number;
}

export interface TestingMetrics {
  coverage: number;
  unitTestCount: number;
  integrationTestCount: number;
  e2eTestCount: number;
  avgExecutionTime: number;
  reliability: number;
}

export interface CommitMetrics {
  conventionalCommitRate: number;
  avgCommitSize: number;
  commitFrequency: number;
  problematicCommitsRate: number;
}

export interface SecurityMetrics {
  vulnerabilityCount: number;
  exposedSecretsCount: number;
  avgPatchTime: number;
  securityScore: number;
}

export interface DeploymentMetrics {
  frequency: number;
  successRate: number;
  avgTimeBetween: number;
  pipelineEfficiency: number;
  rollbackRate: number;
}

export interface Contributor {
  id: number;
  name: string;
  email: string;
  commits: number;
  mergeRequests: number;
  codeReviews: number;
  docContributions: number;
  issuesResolved: number;
}

export interface ContributorStats {
  id?: number;
  name: string;
  email: string;
  avatarUrl?: string;
  commits: number;
  mergeRequestCount: number;
  additions: number;
  deletions: number;
  totalChanges: number;
  score: number;
}