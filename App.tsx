import React from 'react';
import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { GitLabLogin } from './components/GitLabLogin';
import { CommitDetails } from './components/CommitDetails';
import { RepositorySelector } from './components/RepositorySelector';
import { GitLabService } from './services/gitlab';
import { AnalyticsService } from './services/analytics';
import { DocumentationService } from './services/documentation';
import { SecurityAnalyzer } from './services/security';
import { Repository, GitLabConfig } from './types/gitlab';

const initialScore = {
  documentation: 85,
  testing: 92,
  commits: 78,
  security: 95,
  deployment: 88,
  overall: 87,
};

function App() {
  const [gitlabService, setGitlabService] = useState<GitLabService | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    documentation: false,
    testing: false,
    commits: false,
    security: false,
    deployment: false,
  });
  const [commits, setCommits] = useState<Array<any>>([]);
  const [testFiles, setTestFiles] = useState<Array<any>>([]);
  const [testMetrics, setTestMetrics] = useState<any>(null);
  const [deployments, setDeployments] = useState<Array<any>>([]);
  const [deploymentMetrics, setDeploymentMetrics] = useState<any>(null);
  const [securityIssues, setSecurityIssues] = useState<Array<any>>([]);
  const [securityMetrics, setSecurityMetrics] = useState<any>(null);
  const [documentationFiles, setDocumentationFiles] = useState<Array<{
    file: { path: string; content: string };
    analysis: { wordCount: number; hasHeadings: boolean; hasCodeBlocks: boolean; hasLinks: boolean; hasImages: boolean; readabilityScore: number };
    score: number;
  }>>([]);
  const [contributors, setContributors] = useState<ContributorStats[]>([]);
  const [score, setScore] = useState(initialScore);

  const handleLogin = (config: GitLabConfig) => {
    setGitlabService(new GitLabService(config));
  };

  const handleRepositorySelect = async (repository: Repository) => {
    setSelectedRepo(repository);
    if (gitlabService) {
      // Reset score and states
      setScore({
        documentation: 0,
        testing: 0,
        commits: 0,
        security: 0,
        deployment: 0,
        overall: 0,
      });
      // Reset all states
      setLoadingStates({
        documentation: true,
        testing: true,
        commits: true,
        security: true,
        deployment: true,
      });

      // Create services
      const docService = new DocumentationService(gitlabService);
      const analyticsService = new AnalyticsService(gitlabService);
      const securityAnalyzer = new SecurityAnalyzer(gitlabService);

      // Get contributors
      const contributors = await gitlabService.getContributors(repository.id);
      setContributors(contributors);
      
      try {
        // Analyze tests
        console.log('Starting test analysis for repository:', repository.name);
        const testFiles = await gitlabService.getRepositoryFiles(repository.id, '**/*.test.*');
        console.log('Test files found:', testFiles.length);
        
        // Calculate test metrics
        const testMetrics = {
          coverage: 0,
          unitTestCount: testFiles.length > 0 ? testFiles.reduce((count, file) => {
            const matches = file.content.match(/it\(['"]/g) || [];
            return count + matches.length;
          }, 0) : 0,
          integrationTestCount: testFiles.length > 0 ? testFiles.reduce((count, file) => {
            const matches = file.content.match(/describe\(['"]/g) || [];
            return count + matches.length;
          }, 0) : 0,
          e2eTestCount: 0,
          avgExecutionTime: 0,
          reliability: testFiles.length > 0 ? 95 : 0,
        };
        setTestFiles(testFiles);
        setTestMetrics(testMetrics);
        setLoadingStates(prev => ({ ...prev, testing: false }));

        // Analyze documentation
        const files = await gitlabService.getRepositoryFiles(repository.id);
        const analyzedFiles = files.map(file => ({
          file,
          analysis: docService.analyzeDocument(file.content),
          score: docService.calculateFileScore(docService.analyzeDocument(file.content))
        }));
        setDocumentationFiles(analyzedFiles);
        setLoadingStates(prev => ({ ...prev, documentation: false }));

        // Analyze commits
        console.log('Starting commit analysis for repository:', repository.name);
        const commitMetrics = await analyticsService.analyzeCommits(repository.id);
        const recentCommits = await gitlabService.getCommits(repository.id);
        const analyzedCommits = recentCommits.slice(0, 10).map(commit => ({
          ...commit,
          analysis: {
            isConventional: /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?: .+/.test(commit.title),
            problems: getCommitProblems(commit)
          }
        }));
        setCommits(analyzedCommits);
        setLoadingStates(prev => ({ ...prev, commits: false }));

        // Analyze deployments
        console.log('Starting deployment analysis for repository:', repository.name);
        const deploymentMetrics = await analyticsService.analyzeDeployments(repository.id);
        const recentDeployments = await gitlabService.getPipelines(repository.id);
        setDeployments(recentDeployments.slice(0, 10));
        setDeploymentMetrics(deploymentMetrics);
        setLoadingStates(prev => ({ ...prev, deployment: false }));

        // Analyze security
        console.log('Starting security analysis for repository:', repository.name);
        const securityMetrics = await securityAnalyzer.analyzeRepository(repository.id);
        setSecurityMetrics(securityMetrics);

        // Create security issues list
        const issues = [];
        if (securityMetrics.vulnerabilityCount > 0) {
          issues.push({
            file: 'Multiple files',
            type: 'Security Vulnerabilities',
            severity: 'high'
          });
        }
        if (securityMetrics.exposedSecretsCount > 0) {
          issues.push({
            file: 'Repository files',
            type: 'Exposed Secrets',
            severity: 'high'
          });
        }
        setSecurityIssues(issues);
        setLoadingStates(prev => ({ ...prev, security: false }));

        // Update scores
        const newScore = { ...score };
        newScore.documentation = analyzedFiles.length === 0 ? 0 : 
          Math.round(analyzedFiles.reduce((acc, file) => acc + file.score, 0) / Math.max(1, analyzedFiles.length));
        
        // Calculate testing score
        const testScore = testFiles.length === 0 ? 0 : Math.round(
          (Math.min(testMetrics.unitTestCount / 50, 1) * 40) +
          (Math.min(testMetrics.integrationTestCount / 20, 1) * 30) +
          (testMetrics.reliability * 0.3)
        );
        newScore.testing = testScore;
        
        newScore.commits = Math.round(
          (commitMetrics.conventionalCommitRate * 0.4) +
          (Math.max(0, 100 - commitMetrics.problematicCommitsRate * 100) * 0.4) +
          (Math.min(commitMetrics.commitFrequency * 20, 100) * 0.2)
        );
        
        newScore.deployment = recentDeployments.length === 0 ? 0 : Math.round(
          (deploymentMetrics.frequency * 20) +
          (deploymentMetrics.successRate * 0.3) +
          (deploymentMetrics.pipelineEfficiency * 0.3) +
          (Math.max(0, 100 - deploymentMetrics.rollbackRate * 500) * 0.2)
        );

        newScore.security = securityMetrics.securityScore;
        
        // Calculate overall score
        newScore.overall = Math.round(
          (newScore.documentation + 
           newScore.testing + 
           newScore.commits + 
           newScore.security + 
           newScore.deployment) / 5
        );
        
        setScore(newScore);
      } catch (error) {
        console.error('Error during repository analysis:', error);
        // Reset loading states on error
        setLoadingStates({
          documentation: false,
          testing: false,
          commits: false,
          security: false,
          deployment: false,
        });
      }
    }
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

  if (!gitlabService) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <GitLabLogin onLogin={handleLogin} />
      </div>
    );
  }

  if (!selectedRepo) {
    return (
      <div className="min-h-screen bg-gray-100">
        <RepositorySelector
          gitlabService={gitlabService}
          onSelect={handleRepositorySelect}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedRepo.name}
              </h2>
            </div>
            <button
              onClick={() => setSelectedRepo(null)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Change Repository
            </button>
          </div>
        </div>
      </div>
      <Dashboard
        score={score}
        repository={selectedRepo}
        loadingStates={loadingStates}
        commits={commits}
        documentationFiles={documentationFiles}
        deployments={deployments}
        deploymentMetrics={deploymentMetrics}
        testFiles={testFiles}
        testMetrics={testMetrics}
        contributors={contributors}
        securityMetrics={securityMetrics}
        securityIssues={securityIssues}
      />
    </div>
  );
}

export default App;