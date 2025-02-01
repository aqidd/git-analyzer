import React, { useState } from 'react';
import { Activity, GitBranch, FileText, TestTube2, Shield, Rocket, Calculator, Trophy, ArrowLeft } from 'lucide-react';
import { AnalyticsScore, Repository } from '../types/gitlab';
import { DocumentationDetails } from './DocumentationDetails';
import { CommitDetails } from './CommitDetails';
import { DeploymentDetails } from './DeploymentDetails';
import { SecurityDetails } from './SecurityDetails';
import { OverallHealthDetails } from './OverallHealthDetails';
import { TestDetails } from './TestDetails';
import { DocumentFile, DocumentationAnalysis } from '../services/documentation';
import { CalculationMethods } from './CalculationMethods';
import { ContributorSection } from './ContributorSection';
import { ContributorStats } from '../types/gitlab';

interface DashboardProps {
  score: AnalyticsScore;
  repository: Repository;
  loadingStates: {
    documentation: boolean;
    testing: boolean;
    commits: boolean;
    security: boolean;
    deployment: boolean;
  };
  onBackToList: () => void;
  documentationFiles?: Array<{
    file: DocumentFile;
    analysis: DocumentationAnalysis;
    score: number;
  }>;
  commits?: Array<{
    id: string;
    title: string;
    message: string;
    stats: { additions: number; deletions: number; total: number };
    created_at: string;
    analysis: {
      isConventional: boolean;
      problems: string[];
    };
  }>;
  deployments?: Array<{
    id: number;
    status: string;
    ref: string;
    sha: string;
    created_at: string;
    updated_at: string;
    message?: string;
  }>;
  deploymentMetrics?: {
    frequency: number;
    successRate: number;
    avgTimeBetween: number;
    pipelineEfficiency: number;
    rollbackRate: number;
  };
  testFiles?: Array<{
    path: string;
    content: string;
  }>;
  testMetrics?: {
    coverage: number;
    unitTestCount: number;
    integrationTestCount: number;
    e2eTestCount: number;
    avgExecutionTime: number;
    reliability: number;
  };
  securityMetrics?: {
    vulnerabilityCount: number;
    exposedSecretsCount: number;
    avgPatchTime: number;
    securityScore: number;
  };
  securityIssues?: Array<{
    file: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  contributors?: ContributorStats[];
}

const ScoreCard: React.FC<{
  title: string;
  score: number;
  loading?: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}> = ({ title, score, loading, icon, onClick }) => (
  <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
       onClick={onClick}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <div className="text-indigo-600">{icon}</div>
    </div>
    {loading ? (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-indigo-200 animate-pulse"></div>
        <span className="text-gray-500">Analyzing...</span>
      </div>
    ) : (
      <div className="flex items-end space-x-2">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-gray-500 mb-1">/100</span>
      </div>
    )}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ 
  score, 
  repository, 
  loadingStates,
  onBackToList,
  documentationFiles = [], 
  commits = [],
  testFiles = [],
  testMetrics,
  deployments = [],
  deploymentMetrics,
  securityMetrics,
  securityIssues = [],
  contributors = [],
}) => {
  const [showDocDetails, setShowDocDetails] = useState(false);
  const [showCommitDetails, setShowCommitDetails] = useState(false);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [showDeploymentDetails, setShowDeploymentDetails] = useState(false);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const [showOverallHealth, setShowOverallHealth] = useState(false);
  const [showCalculationMethods, setShowCalculationMethods] = useState(false);
  const [showContributors, setShowContributors] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={onBackToList}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Repositories
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{repository.name}</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive analysis of repository health and performance metrics
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowCalculationMethods(true)}
              className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Calculator className="w-4 h-4 mr-1" />
              View Calculation Methods
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ScoreCard
          title="Documentation"
          score={score.documentation}
          loading={loadingStates.documentation}
          icon={<FileText className="w-6 h-6" />}
          onClick={() => setShowDocDetails(true)}
        />
        <ScoreCard
          title="Testing"
          score={score.testing}
          loading={loadingStates.testing}
          icon={<TestTube2 className="w-6 h-6" />}
          onClick={() => setShowTestDetails(true)}
        />
        <ScoreCard
          title="Commit Quality"
          score={score.commits}
          loading={loadingStates.commits}
          icon={<GitBranch className="w-6 h-6" />}
          onClick={() => setShowCommitDetails(true)}
        />
        <ScoreCard
          title="Security"
          score={score.security}
          loading={loadingStates.security}
          icon={<Shield className="w-6 h-6" />}
          onClick={() => setShowSecurityDetails(true)}
        />
        <ScoreCard
          title="Deployment"
          score={score.deployment}
          loading={loadingStates.deployment}
          icon={<Rocket className="w-6 h-6" />}
          onClick={() => setShowDeploymentDetails(true)}
        />
        <ScoreCard
          title="Overall Health"
          score={score.overall}
          loading={Object.values(loadingStates).some(Boolean)}
          icon={<Activity className="w-6 h-6" />}
          onClick={() => setShowOverallHealth(true)}
        />
      </div>

      <ContributorSection contributors={contributors} />

      {showDocDetails && (
        <DocumentationDetails
          files={documentationFiles}
          onClose={() => setShowDocDetails(false)}
        />
      )}
      {showTestDetails && testMetrics && (
        <TestDetails
          files={testFiles}
          metrics={testMetrics}
          onClose={() => setShowTestDetails(false)}
        />
      )}
      {showCommitDetails && (
        <CommitDetails
          commits={commits}
          onClose={() => setShowCommitDetails(false)}
        />
      )}
      {showDeploymentDetails && deploymentMetrics && (
        <DeploymentDetails
          deployments={deployments}
          metrics={deploymentMetrics}
          onClose={() => setShowDeploymentDetails(false)}
        />
      )}
      {showSecurityDetails && securityMetrics && (
        <SecurityDetails
          metrics={securityMetrics}
          vulnerabilities={securityIssues}
          onClose={() => setShowSecurityDetails(false)}
        />
      )}
      {showOverallHealth && (
        <OverallHealthDetails
          score={score}
          onClose={() => setShowOverallHealth(false)}
        />
      )}
      {showCalculationMethods && (
        <CalculationMethods
          onClose={() => setShowCalculationMethods(false)}
        />
      )}
      {showContributors && (
        <ContributorLeaderboard
          contributors={contributors}
          onClose={() => setShowContributors(false)}
        />
      )}
    </div>
  );
}