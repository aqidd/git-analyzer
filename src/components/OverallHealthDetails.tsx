import React from 'react';
import { X, Activity, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { AnalyticsScore } from '../types/gitlab';

interface OverallHealthDetailsProps {
  score: AnalyticsScore;
  onClose: () => void;
}

const MetricBar: React.FC<{
  title: string;
  score: number;
  description: string;
}> = ({ title, score, description }) => {
  const getScoreColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreEmoji = () => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-sm font-medium text-gray-900">{score}% {getScoreEmoji()}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${getScoreColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
};

const HealthIndicator: React.FC<{
  score: number;
  previousScore?: number;
}> = ({ score, previousScore }) => {
  const getIndicator = () => {
    if (!previousScore) return null;
    if (score > previousScore) {
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    }
    if (score < previousScore) {
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    }
    return <ArrowRight className="w-5 h-5 text-gray-500" />;
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`text-4xl font-bold ${getScoreColor()}`}>
        {score}
      </span>
      {getIndicator()}
    </div>
  );
};

const RecommendationCard: React.FC<{
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}> = ({ title, description, impact }) => {
  const getImpactColor = () => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-gray-900">{title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getImpactColor()}`}>
              {impact} impact
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
};

export const OverallHealthDetails: React.FC<OverallHealthDetailsProps> = ({
  score,
  onClose,
}) => {
  const getRecommendations = () => {
    const recommendations = [];

    if (score.documentation < 70) {
      recommendations.push({
        title: 'Improve Documentation Coverage',
        description: 'Add more detailed documentation, especially for core features and APIs.',
        impact: 'high' as const,
      });
    }

    if (score.testing < 80) {
      recommendations.push({
        title: 'Increase Test Coverage',
        description: 'Add more unit tests and integration tests to improve code reliability.',
        impact: 'high' as const,
      });
    }

    if (score.commits < 75) {
      recommendations.push({
        title: 'Enhance Commit Quality',
        description: 'Follow conventional commit messages and keep changes focused.',
        impact: 'medium' as const,
      });
    }

    if (score.security < 90) {
      recommendations.push({
        title: 'Address Security Concerns',
        description: 'Fix identified vulnerabilities and remove any exposed secrets.',
        impact: 'high' as const,
      });
    }

    if (score.deployment < 85) {
      recommendations.push({
        title: 'Optimize Deployment Process',
        description: 'Improve deployment frequency and success rate.',
        impact: 'medium' as const,
      });
    }

    return recommendations;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Overall Repository Health</h2>
            <p className="text-sm text-gray-500 mt-1">Comprehensive health analysis and recommendations</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Health Score</h3>
              <p className="text-sm text-gray-500">Overall repository quality and maintainability</p>
            </div>
            <HealthIndicator score={score.overall} />
          </div>

          <div className="space-y-4">
            <MetricBar
              title="Documentation"
              score={score.documentation}
              description="Documentation quality and coverage"
            />
            <MetricBar
              title="Testing"
              score={score.testing}
              description="Test coverage and reliability"
            />
            <MetricBar
              title="Commit Quality"
              score={score.commits}
              description="Commit practices and standards"
            />
            <MetricBar
              title="Security"
              score={score.security}
              description="Security vulnerabilities and risks"
            />
            <MetricBar
              title="Deployment"
              score={score.deployment}
              description="Deployment efficiency and reliability"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
          <div className="space-y-4">
            {getRecommendations().map((recommendation, index) => (
              <RecommendationCard
                key={index}
                title={recommendation.title}
                description={recommendation.description}
                impact={recommendation.impact}
              />
            ))}
            {getRecommendations().length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">Great job! No immediate improvements needed.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};