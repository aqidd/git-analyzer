import React, { useState, useCallback, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { GitLabLogin } from './components/GitLabLogin';
import { CommitDetails } from './components/CommitDetails';
import { RepositorySelector } from './components/RepositorySelector';
import { GitLabService } from './services/gitlab';
import { AnalyticsService } from './services/analytics';
import { SecurityAnalyzer } from './services/security';
import { GitLabConfig, Repository, TimePeriod, AnalyticsScore, DocumentFile } from './types/gitlab';

const initialScore: AnalyticsScore = {
  documentation: 0,
  testing: 0,
  commits: 0,
  security: 0,
  deployment: 0,
  overall: 0,
};

export const App: React.FC = () => {
  const [gitlabService, setGitlabService] = useState<GitLabService | null>(null);
  const [analyticsService, setAnalyticsService] = useState<AnalyticsService | null>(null);
  const [securityAnalyzer, setSecurityAnalyzer] = useState<SecurityAnalyzer | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [score, setScore] = useState<AnalyticsScore>({
    documentation: 0,
    testing: 0,
    commits: 0,
    security: 0,
    deployment: 0,
    overall: 0,
  });
  const [loadingStates, setLoadingStates] = useState({
    documentation: false,
    testing: false,
    commits: false,
    security: false,
    deployment: false,
    contributors: false,
  });
  const [documentationFiles, setDocumentationFiles] = useState<Array<{
    file: DocumentFile;
    analysis: any;
  }>>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [testFiles, setTestFiles] = useState<any[]>([]);
  const [testMetrics, setTestMetrics] = useState<any>(null);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [deploymentMetrics, setDeploymentMetrics] = useState<any>(null);
  const [securityMetrics, setSecurityMetrics] = useState<any>(null);
  const [securityIssues, setSecurityIssues] = useState<any[]>([]);
  const [contributors, setContributors] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(30);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const resetLoadingStates = () => {
    setLoadingStates({
      documentation: false,
      testing: false,
      commits: false,
      security: false,
      deployment: false,
      contributors: false,
    });
  };

  const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response?.status === 429) {
      errorMessage = 'GitLab API rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('finite')) {
      errorMessage = 'GitLab API resource limit exceeded. Please try again later.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed. Please check your API token.';
      handleLogout();
    } else if (error.response?.status === 404) {
      errorMessage = 'Repository not found or access denied.';
    }
    
    setError(errorMessage);
    resetLoadingStates();
    setIsAnalyzing(false);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async <T,>(
    operation: () => Promise<T>,
    retries = 3,
    baseDelay = 1000
  ): Promise<T> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        if (i === retries - 1) throw error;
        if (error.response?.status === 429 || error.message?.includes('finite')) {
          await delay(baseDelay * Math.pow(2, i));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Failed after retries');
  };

  const calculateDaysAgo = (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  const calculateDocumentationScore = (files: Array<{ file: DocumentFile; analysis: any }>) => {
    if (!files.length) return 0;
    
    let score = 0;
    for (const { analysis } of files) {
      if (analysis.hasHeadings) score += 20;
      if (analysis.hasCodeBlocks) score += 20;
      if (analysis.hasLinks) score += 20;
      if (analysis.hasImages) score += 20;
      if (analysis.readabilityScore > 60) score += 20;
    }
    return Math.min(100, score);
  };

  const calculateTestScore = (files: any[], metrics: any) => {
    if (!files.length) return 0;
    return Math.min(100, (files.length * 20));
  };

  const calculateCommitScore = (commits: any[]) => {
    if (!commits.length) return 0;
    return Math.min(100, commits.length * 5);
  };

  const calculateSecurityScore = (metrics: any, issues: any[]) => {
    if (!metrics) return 0;
    const baseScore = 100;
    const deduction = issues.length * 10;
    return Math.max(0, baseScore - deduction);
  };

  const calculateDeploymentScore = (deployments: any[], metrics: any) => {
    if (!deployments.length) return 0;
    return Math.min(100, deployments.length * 10);
  };

  const calculateOverallScore = (scores: AnalyticsScore) => {
    const weights = {
      documentation: 0.2,
      testing: 0.2,
      commits: 0.2,
      security: 0.2,
      deployment: 0.2,
    };

    return Math.round(
      scores.documentation * weights.documentation +
      scores.testing * weights.testing +
      scores.commits * weights.commits +
      scores.security * weights.security +
      scores.deployment * weights.deployment
    );
  };

  const handleLogin = (config: GitLabConfig) => {
    const gitlab = new GitLabService(config);
    const analytics = new AnalyticsService(gitlab);
    const security = new SecurityAnalyzer(gitlab);
    setGitlabService(gitlab);
    setAnalyticsService(analytics);
    setSecurityAnalyzer(security);
  };

  const handleLogout = () => {
    setGitlabService(null);
    setAnalyticsService(null);
    setSecurityAnalyzer(null);
    setSelectedRepo(null);
    setCommits([]);
    setTestFiles([]);
    setTestMetrics(null);
    setDeployments([]);
    setDeploymentMetrics(null);
    setSecurityMetrics(null);
    setSecurityIssues([]);
    setDocumentationFiles([]);
    setContributors([]);
    setScore(initialScore);
    setError(null);
  };

  const handleRepositorySelect = async (repository: Repository) => {
    setSelectedRepo(repository);
    if (gitlabService && analyticsService && securityAnalyzer) {
      // Reset score and states
      setScore({
        documentation: 0,
        testing: 0,
        commits: 0,
        security: 0,
        deployment: 0,
        overall: 0,
      });
      setLoadingStates({
        documentation: true,
        testing: true,
        commits: true,
        security: true,
        deployment: true,
        contributors: true,
      });

      try {
        const since = calculateDaysAgo(timePeriod);
        
        // Analyze tests
        console.log('Starting test analysis for repository:', repository.name);
        setLoadingStates(prev => ({ ...prev, testing: true }));
        const testMetrics = await analyticsService.calculateTestingMetrics(repository.id);
        setTestMetrics(testMetrics);
        setScore(prev => ({
          ...prev,
          testing: calculateTestScore([], testMetrics),
        }));
        setLoadingStates(prev => ({ ...prev, testing: false }));

        // Get commits
        console.log('Starting commit analysis for repository:', repository.name);
        setLoadingStates(prev => ({ ...prev, commits: true }));
        const commits = await gitlabService.getCommits(repository.id, since);
        setCommits(commits.slice(0, 20));
        setScore(prev => ({
          ...prev,
          commits: calculateCommitScore(commits),
        }));
        setLoadingStates(prev => ({ ...prev, commits: false }));

        // Analyze documentation
        console.log('Starting documentation analysis for repository:', repository.name);
        setLoadingStates(prev => ({ ...prev, documentation: true }));
        const files = await gitlabService.getRepositoryFiles(repository.id);
        const analyzedFiles = files.map(file => ({
          file,
          analysis: analyticsService.calculateDocumentationScore(repository.id),
        }));
        setDocumentationFiles(analyzedFiles);
        setLoadingStates(prev => ({ ...prev, documentation: false }));

        // Analyze security
        console.log('Starting security analysis for repository:', repository.name);
        setLoadingStates(prev => ({ ...prev, security: true }));
        const securityMetricsData = await securityAnalyzer.analyzeRepository(repository.id);
        setSecurityMetrics(securityMetricsData);
        
        // Create security issues list
        const issues = [];
        if (securityMetricsData.vulnerabilityCount > 0) {
          issues.push({
            file: 'Multiple files',
            type: 'Security Vulnerabilities',
            severity: 'high',
            count: securityMetricsData.vulnerabilityCount
          });
        }
        if (securityMetricsData.exposedSecretsCount > 0) {
          issues.push({
            file: 'Repository files',
            type: 'Exposed Secrets',
            severity: 'high',
            count: securityMetricsData.exposedSecretsCount
          });
        }
        setSecurityIssues(issues);
        setScore(prev => ({
          ...prev,
          security: securityMetricsData.securityScore,
        }));
        setLoadingStates(prev => ({ ...prev, security: false }));

        // Analyze deployments
        console.log('Starting deployment analysis for repository:', repository.name);
        const deploymentMetrics = await analyticsService.analyzeDeployments(repository.id);
        setDeploymentMetrics(deploymentMetrics);
        setScore(prev => ({
          ...prev,
          deployment: calculateDeploymentScore([], deploymentMetrics),
        }));
        setLoadingStates(prev => ({ ...prev, deployment: false }));

        // Calculate overall score
        setScore(prev => ({
          ...prev,
          overall: calculateOverallScore(prev),
        }));

      } catch (error: any) {
        handleError(error, 'handleRepositorySelect');
        setSelectedRepo(null);
      }
    }
  };

  const handleBackToList = () => {
    setSelectedRepo(null);
  };

  const getCommitProblems = (commit: any): string[] => {
    const problems = [];

    if (commit.stats?.total && commit.stats.total > 1000) {
      problems.push('large-changes');
    }

    const uninformativePatterns = [
      /^fix$/i,
      /^update$/i,
      /^changes$/i,
      /^wip$/i,
      /^temp$/i,
      /^testing$/i,
      /^commit$/i,
      /^[.]+$/,
    ];
    if (uninformativePatterns.some(pattern => pattern.test(commit.title.trim()))) {
      problems.push('uninformative-message');
    }

    if (commit.message.includes('<<<<<<<') || commit.message.includes('>>>>>>>')) {
      problems.push('merge-conflict-markers');
    }

    if (commit.title.length < 10) {
      problems.push('short-message');
    }

    return problems;
  };

  const fetchRepositoryData = async (repo: Repository, days: TimePeriod) => {
    if (!gitlabService || !analyticsService || !securityAnalyzer || isAnalyzing) return;

    setError(null);
    setIsAnalyzing(true);

    try {
      // Documentation Analysis
      setLoadingStates(prev => ({ ...prev, documentation: true }));
      const files = await fetchWithRetry(() => 
        gitlabService.getRepositoryFiles(repo.id, '\.(md|txt|rst|adoc)$|requirements\.(txt|in)$|license|readme|contributing|docs?\/.*$')
      );
      const analyzed = await Promise.all(
        files.slice(0, 10).map(async file => ({
          file,
          analysis: await analyticsService.calculateDocumentationScore(repo.id),
        }))
      );
      setDocumentationFiles(analyzed);
      setScore(prev => ({
        ...prev,
        documentation: calculateDocumentationScore(analyzed),
      }));
      setLoadingStates(prev => ({ ...prev, documentation: false }));

      await delay(500);

      // Commit Analysis
      setLoadingStates(prev => ({ ...prev, commits: true }));
      const since = calculateDaysAgo(days);
      const repoCommits = await fetchWithRetry(() => gitlabService.getCommits(repo.id, since));
      setCommits(repoCommits.slice(0, 20));
      setScore(prev => ({
        ...prev,
        commits: calculateCommitScore(repoCommits),
      }));
      setLoadingStates(prev => ({ ...prev, commits: false }));

      await delay(500);

      // Test Analysis
      setLoadingStates(prev => ({ ...prev, testing: true }));
      const metrics = await fetchWithRetry(() => analyticsService.calculateTestingMetrics(repo.id));
      setTestMetrics(metrics);
      setScore(prev => ({
        ...prev,
        testing: calculateTestScore([], metrics),
      }));
      setLoadingStates(prev => ({ ...prev, testing: false }));

      await delay(500);

      // Security Analysis
      setLoadingStates(prev => ({ ...prev, security: true }));
      const securityMetricsData = await fetchWithRetry(() => securityAnalyzer.analyzeRepository(repo.id));
      setSecurityMetrics(securityMetricsData);
      
      // Create security issues list
      const issues = [];
      if (securityMetricsData.vulnerabilityCount > 0) {
        issues.push({
          file: 'Multiple files',
          type: 'Security Vulnerabilities',
          severity: 'high',
          count: securityMetricsData.vulnerabilityCount
        });
      }
      if (securityMetricsData.exposedSecretsCount > 0) {
        issues.push({
          file: 'Repository files',
          type: 'Exposed Secrets',
          severity: 'high',
          count: securityMetricsData.exposedSecretsCount
        });
      }
      setSecurityIssues(issues);
      
      setScore(prev => ({
        ...prev,
        security: securityMetricsData.securityScore,
      }));
      setLoadingStates(prev => ({ ...prev, security: false }));

      await delay(500);

      // Deployment Analysis
      setLoadingStates(prev => ({ ...prev, deployment: true }));
      const deploymentMetrics = await fetchWithRetry(() => analyticsService.analyzeDeployments(repo.id));
      setDeploymentMetrics(deploymentMetrics);
      setScore(prev => ({
        ...prev,
        deployment: calculateDeploymentScore([], deploymentMetrics),
      }));
      setLoadingStates(prev => ({ ...prev, deployment: false }));

      await delay(500);

      // Contributors
      const startDate = calculateDaysAgo(days);
      const repoContributors = await fetchWithRetry(() => gitlabService.getContributors(repo.id, startDate));
      setContributors(repoContributors.slice(0, 10));
      setLoadingStates(prev => ({ ...prev, contributors: false }));

      // Calculate overall score
      setScore(prev => ({
        ...prev,
        overall: calculateOverallScore(prev),
      }));

    } catch (error: any) {
      handleError(error, 'fetchRepositoryData');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTimePeriodChange = useCallback((period: TimePeriod) => {
    if (period === timePeriod || !selectedRepo || isAnalyzing) return;
    setTimePeriod(period);
    fetchRepositoryData(selectedRepo, period);
  }, [selectedRepo, timePeriod, isAnalyzing]);

  useEffect(() => {
    if (selectedRepo) {
      fetchRepositoryData(selectedRepo, timePeriod);
    }
  }, [selectedRepo]);

  return (
    <div className="min-h-screen bg-gray-100">
      {!gitlabService && (
        <GitLabLogin onLogin={handleLogin} />
      )}
      {gitlabService && !selectedRepo && (
        <RepositorySelector 
          gitlabService={gitlabService} 
          onSelect={handleRepositorySelect}
        />
      )}
      {gitlabService && selectedRepo && (
        <Dashboard
          repository={selectedRepo}
          score={score}
          documentationFiles={documentationFiles}
          commits={commits}
          testFiles={testFiles}
          testMetrics={testMetrics}
          deployments={deployments}
          deploymentMetrics={deploymentMetrics}
          securityMetrics={securityMetrics}
          securityIssues={securityIssues}
          contributors={contributors}
          loadingStates={loadingStates}
          error={error}
          onLogout={handleLogout}
          onBack={() => setSelectedRepo(null)}
          timePeriod={timePeriod}
          onTimePeriodChange={handleTimePeriodChange}
        />
      )}
    </div>
  );
};

export default App;