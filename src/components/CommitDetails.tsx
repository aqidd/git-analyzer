import React from 'react';
import { GitBranch, X, Check, AlertTriangle, BarChart2, GitCommit, AlertCircle } from 'lucide-react';

interface CommitDetailsProps {
  commits: Array<{
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
  onClose: () => void;
}

const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}> = ({ title, value, icon, description }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <div className="text-indigo-600">{icon}</div>
    </div>
    <div className="flex items-baseline space-x-2">
      <span className="text-2xl font-bold text-gray-900">{value}</span>
    </div>
    <p className="mt-1 text-xs text-gray-500">{description}</p>
  </div>
);

const CommitCard: React.FC<{
  commit: {
    title: string;
    message: string;
    stats: { additions: number; deletions: number; total: number };
    created_at: string;
    analysis?: {
      isConventional: boolean;
      problems: string[];
    };
  };
}> = ({ commit }) => {
  const date = new Date(commit.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const getProblemLabel = (problem: string): string => {
    switch (problem) {
      case 'large-changes':
        return 'Large changes (>1000 lines)';
      case 'uninformative-message':
        return 'Uninformative commit message';
      case 'merge-conflict-markers':
        return 'Contains merge conflict markers';
      case 'short-message':
        return 'Message too short';
      default:
        return problem;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <GitBranch className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{date}</span>
            {commit.analysis?.isConventional && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                <Check className="w-3 h-3 mr-1" />
                Conventional
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900">{commit.title}</h3>
          {commit.message && commit.message !== commit.title && (
            <p className="mt-1 text-sm text-gray-500">{commit.message}</p>
          )}
        </div>
        <div className="text-sm text-gray-500 whitespace-nowrap ml-4">
          +{commit.stats?.additions || 0} -{commit.stats?.deletions || 0}
        </div>
      </div>

      {commit.analysis?.problems?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Quality Issues</h4>
          <div className="space-y-2">
            {commit.analysis.problems.map((problem, index) => (
              <div key={index} className="flex items-center text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {getProblemLabel(problem)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const CommitDetails: React.FC<CommitDetailsProps> = ({
  commits = [],
  onClose,
}) => {
  const conventionalCommitRate = commits.length ? 
    Math.round((commits.filter(c => c.analysis?.isConventional).length / commits.length) * 100) : 0;
  
  const averageSize = commits.length ? 
    Math.round(commits.reduce((acc, c) => acc + (c.stats?.total || 0), 0) / commits.length) : 0;
  
  const problemRate = commits.length ? 
    Math.round((commits.filter(c => c.analysis?.problems?.length > 0).length / commits.length) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Commit Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">Last {commits.length} commits and their quality metrics</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Conventional Commits"
              value={`${conventionalCommitRate}%`}
              icon={<GitCommit className="w-5 h-5" />}
              description="Commits following conventional format"
            />
            <MetricCard
              title="Average Size"
              value={`${averageSize} lines`}
              icon={<BarChart2 className="w-5 h-5" />}
              description="Average lines changed per commit"
            />
            <MetricCard
              title="Problem Rate"
              value={`${problemRate}%`}
              icon={<AlertCircle className="w-5 h-5" />}
              description="Commits with quality issues"
            />
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Quality Guidelines</h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Conventional Format',
                  value: conventionalCommitRate,
                  target: 80,
                  icon: <Check className="w-4 h-4" />,
                },
                {
                  label: 'Small Commits (<200 lines)',
                  value: commits.length ? 
                    Math.round((commits.filter(c => (c.stats?.total || 0) < 200).length / commits.length) * 100) : 0,
                  target: 70,
                  icon: <GitBranch className="w-4 h-4" />,
                },
                {
                  label: 'Quality Issues',
                  value: 100 - problemRate,
                  target: 90,
                  icon: <AlertTriangle className="w-4 h-4" />,
                }
              ].map((guideline, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`p-1 rounded ${
                    guideline.value >= guideline.target ? 'bg-green-100 text-green-600' :
                    guideline.value >= guideline.target * 0.7 ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {guideline.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{guideline.label}</span>
                      <span className="font-medium">{guideline.value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          guideline.value >= guideline.target ? 'bg-green-500' :
                          guideline.value >= guideline.target * 0.7 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${guideline.value}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {commits.length === 0 ? (
            <div className="text-center py-8">
              <GitCommit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No commits found in the selected time period</p>
            </div>
          ) : (
            commits.map((commit, index) => (
              <CommitCard key={index} commit={commit} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};