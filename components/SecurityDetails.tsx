import React from 'react';
import { X, Shield, AlertTriangle, Lock, Key } from 'lucide-react';

interface SecurityDetailsProps {
  metrics: {
    vulnerabilityCount: number;
    exposedSecretsCount: number;
    avgPatchTime: number;
    securityScore: number;
  };
  vulnerabilities: Array<{
    file: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  onClose: () => void;
}

const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  status?: 'good' | 'warning' | 'critical';
}> = ({ title, value, icon, description, status = 'good' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-amber-600';
      default:
        return 'text-green-600';
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={getStatusColor()}>{icon}</div>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-bold ${getStatusColor()}`}>{value}</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
};

const SecurityIssueCard: React.FC<{
  issue: {
    file: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
  };
}> = ({ issue }) => {
  const getSeverityColor = () => {
    switch (issue.severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <AlertTriangle className={`w-5 h-5 ${
            issue.severity === 'high' ? 'text-red-500' :
            issue.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
          }`} />
          <div>
            <h3 className="font-medium text-gray-900">{issue.type}</h3>
            <p className="text-sm text-gray-500">{issue.file}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor()}`}>
          {issue.severity}
        </span>
      </div>
    </div>
  );
};

export const SecurityDetails: React.FC<SecurityDetailsProps> = ({
  metrics,
  vulnerabilities,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-gray-50 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security Analysis</h2>
          <p className="text-sm text-gray-500 mt-1">Security vulnerabilities and risk assessment</p>
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
            title="Security Score"
            value={`${metrics.securityScore}%`}
            icon={<Shield className="w-5 h-5" />}
            description="Overall security rating"
            status={metrics.securityScore > 80 ? 'good' : metrics.securityScore > 60 ? 'warning' : 'critical'}
          />
          <MetricCard
            title="Vulnerabilities"
            value={metrics.vulnerabilityCount.toString()}
            icon={<AlertTriangle className="w-5 h-5" />}
            description="Detected security issues"
            status={metrics.vulnerabilityCount === 0 ? 'good' : metrics.vulnerabilityCount < 5 ? 'warning' : 'critical'}
          />
          <MetricCard
            title="Exposed Secrets"
            value={metrics.exposedSecretsCount.toString()}
            icon={<Key className="w-5 h-5" />}
            description="Potential credential exposures"
            status={metrics.exposedSecretsCount === 0 ? 'good' : 'critical'}
          />
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Security Guidelines</h3>
          <div className="space-y-3">
            {[
              {
                label: 'No Vulnerabilities',
                value: Math.max(0, 100 - (metrics.vulnerabilityCount * 10)),
                target: 90
              },
              {
                label: 'No Exposed Secrets',
                value: Math.max(0, 100 - (metrics.exposedSecretsCount * 50)),
                target: 100
              },
              {
                label: 'Quick Patch Time',
                value: Math.max(0, 100 - (metrics.avgPatchTime / 24) * 10),
                target: 85
              }
            ].map((guideline, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{guideline.label}</span>
                  <span className="text-gray-900 font-medium">{guideline.value}%</span>
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
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto space-y-4">
        {vulnerabilities.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No security issues detected</p>
          </div>
        ) : (
          <>
            <h3 className="font-medium text-gray-900">Detected Issues</h3>
            {vulnerabilities.map((issue, index) => (
              <SecurityIssueCard key={index} issue={issue} />
            ))}
          </>
        )}
      </div>
    </div>
  </div>
);