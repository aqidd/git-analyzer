import React, { useState, useEffect } from 'react';
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
import { TimePeriodSelector, TimePeriod } from './TimePeriodSelector';

interface DashboardProps {
  score: AnalyticsScore;
  repository: Repository;
  loadingStates: {
    documentation: boolean;
    testing: boolean;
    commits: boolean;
    security: boolean;
    deployment: boolean;
    contributors: boolean;
  };
  onBack: () => void;
  documentationFiles?: Array<{
    file: DocumentFile;
    analysis: DocumentationAnalysis;
  }>;
  commits?: any[];
  testFiles?: any[];
  testMetrics?: any;
  deployments?: any[];
  deploymentMetrics?: any;
  securityMetrics?: any;
  securityIssues?: any[];
  contributors?: ContributorStats[];
  onTimePeriodChange?: (days: TimePeriod) => void;
  error?: string | null;
}

interface ScoreCardProps {
  title: string;
  score: number;
  loading: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  score,
  loading,
  icon,
  onClick,
}) => (
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
  onBack,
  documentationFiles = [], 
  commits = [],
  testFiles = [],
  testMetrics,
  deployments = [],
  deploymentMetrics,
  securityMetrics,
  securityIssues = [],
  contributors = [],
  onTimePeriodChange,
  error,
}) => {
  const [showDocDetails, setShowDocDetails] = useState(false);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [showCommitDetails, setShowCommitDetails] = useState(false);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const [showDeploymentDetails, setShowDeploymentDetails] = useState(false);
  const [showOverallHealth, setShowOverallHealth] = useState(false);
  const [showCalculationMethods, setShowCalculationMethods] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(30);

  useEffect(() => {
    if (onTimePeriodChange) {
      onTimePeriodChange(timePeriod);
    }
  }, [timePeriod, onTimePeriodChange]);

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onBack();
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={handleBackClick}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Repositories
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{repository.name}</h1>
            <p className="text-gray-500 mt-1">{repository.description || 'No description provided'}</p>
          </div>
          <div className="flex items-center space-x-4">
            <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />
            <button
              onClick={() => setShowCalculationMethods(true)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <Calculator className="w-5 h-5 mr-1" />
              Calculation Methods
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={onBack}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Return to Repository List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!error && (
        <>
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

          <ContributorSection 
            contributors={contributors}
            isLoading={loadingStates.contributors} 
            timePeriod={timePeriod}
          />
        </>
      )}

      {showDocDetails && (
        <DocumentationDetails
          files={documentationFiles}
          onClose={() => setShowDocDetails(false)}
          timePeriod={timePeriod}
        />
      )}
      {showTestDetails && testMetrics && (
        <TestDetails
          files={testFiles}
          metrics={testMetrics}
          onClose={() => setShowTestDetails(false)}
          timePeriod={timePeriod}
        />
      )}
      {showCommitDetails && (
        <CommitDetails
          commits={commits}
          onClose={() => setShowCommitDetails(false)}
          timePeriod={timePeriod}
        />
      )}
      {showDeploymentDetails && deploymentMetrics && (
        <DeploymentDetails
          deployments={deployments}
          metrics={deploymentMetrics}
          onClose={() => setShowDeploymentDetails(false)}
          timePeriod={timePeriod}
        />
      )}
      {showSecurityDetails && securityMetrics && (
        <SecurityDetails
          metrics={securityMetrics}
          issues={securityIssues}
          onClose={() => setShowSecurityDetails(false)}
          timePeriod={timePeriod}
        />
      )}
      {showOverallHealth && (
        <OverallHealthDetails
          score={score}
          onClose={() => setShowOverallHealth(false)}
          timePeriod={timePeriod}
        />
      )}
      {showCalculationMethods && (
        <CalculationMethods
          onClose={() => setShowCalculationMethods(false)}
        />
      )}
    </div>
  );
};