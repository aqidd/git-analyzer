import React from 'react';
import { X, Rocket, Clock, CheckCircle2, XCircle, AlertTriangle, BarChart2 } from 'lucide-react';

interface DeploymentDetailsProps {
  deployments: Array<{
    id: number;
    status: string;
    ref: string;
    sha: string;
    created_at: string;
    updated_at: string;
    message?: string;
  }>;
  metrics: {
    frequency: number;
    successRate: number;
    avgTimeBetween: number;
    pipelineEfficiency: number;
    rollbackRate: number;
  };
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

const DeploymentCard: React.FC<{
  deployment: {
    id: number;
    status: string;
    ref: string;
    sha: string;
    created_at: string;
    message?: string;
  };
}> = ({ deployment }) => {
  const date = new Date(deployment.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const isRollback = deployment.message?.toLowerCase().includes('revert') ||
                     deployment.message?.toLowerCase().includes('rollback') ||
                     deployment.ref.startsWith('revert-');

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(deployment.status)}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {deployment.ref}
            </div>
            <div className="text-sm text-gray-500">{date}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-gray-500">
            {deployment.sha.substring(0, 7)}
          </div>
          {isRollback && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              Rollback
            </span>
          )}
        </div>
      </div>
      {deployment.message && (
        <p className="text-sm text-gray-600 mt-2">{deployment.message}</p>
      )}
    </div>
  );
};

export const DeploymentDetails: React.FC<DeploymentDetailsProps> = ({
  deployments,
  metrics,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-gray-50 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deployment Analysis</h2>
          <p className="text-sm text-gray-500 mt-1">Recent deployments and performance metrics</p>
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
            title="Deployment Frequency"
            value={`${metrics.frequency.toFixed(1)}/day`}
            icon={<Rocket className="w-5 h-5" />}
            description="Average deployments per day"
          />
          <MetricCard
            title="Success Rate"
            value={`${Math.round(metrics.successRate)}%`}
            icon={<CheckCircle2 className="w-5 h-5" />}
            description="Successful deployments ratio"
          />
          <MetricCard
            title="Pipeline Efficiency"
            value={`${Math.round(metrics.pipelineEfficiency)}%`}
            icon={<BarChart2 className="w-5 h-5" />}
            description="CI/CD pipeline success rate"
          />
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Deployment Guidelines</h3>
          <div className="space-y-3">
            {[
              {
                label: 'Deployment Frequency',
                value: Math.min(Math.round(metrics.frequency * 20), 100),
                target: 80
              },
              {
                label: 'Pipeline Success',
                value: Math.round(metrics.successRate),
                target: 95
              },
              {
                label: 'Low Rollback Rate',
                value: Math.round(Math.max(0, 100 - metrics.rollbackRate * 500)),
                target: 90
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
        {deployments.length === 0 ? (
          <p className="text-center text-gray-500">No deployments found</p>
        ) : (
          deployments.map((deployment) => (
            <DeploymentCard key={deployment.id} deployment={deployment} />
          ))
        )}
      </div>
    </div>
  </div>
);