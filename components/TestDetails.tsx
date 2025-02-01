import React from 'react';
import { X, TestTube2, FileCode, CheckCircle2, BarChart2 } from 'lucide-react';

interface TestDetailsProps {
  files: Array<{
    path: string;
    content: string;
  }>;
  metrics: {
    coverage: number;
    unitTestCount: number;
    integrationTestCount: number;
    e2eTestCount: number;
    avgExecutionTime: number;
    reliability: number;
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

const TestFileCard: React.FC<{
  file: {
    path: string;
    content: string;
  };
}> = ({ file }) => {
  // Count test cases and describes
  const testCount = (file.content.match(/it\(['"]/g) || []).length;
  const suiteCount = (file.content.match(/describe\(['"]/g) || []).length;
  
  // Detect test types
  const isUnit = file.path.includes('.unit.test') || file.path.includes('__tests__');
  const isIntegration = file.path.includes('.integration.test') || file.path.includes('.int.test');
  const isE2E = file.path.includes('.e2e.test') || file.path.includes('.spec.');

  const getTestType = () => {
    if (isE2E) return 'E2E Test';
    if (isIntegration) return 'Integration Test';
    return 'Unit Test';
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FileCode className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-medium text-gray-900">{file.path}</h3>
            <span className="text-sm text-gray-500">{getTestType()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {testCount} tests
          </div>
          <div className="text-sm text-gray-500">
            {suiteCount} suites
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Test Cases</span>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{testCount}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Test Suites</span>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{suiteCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TestDetails: React.FC<TestDetailsProps> = ({
  files,
  metrics,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-gray-50 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Test Analysis</h2>
          <p className="text-sm text-gray-500 mt-1">Test coverage and quality metrics</p>
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
            title="Total Tests"
            value={`${metrics.unitTestCount + metrics.integrationTestCount + metrics.e2eTestCount}`}
            icon={<TestTube2 className="w-5 h-5" />}
            description="Combined unit, integration, and E2E tests"
          />
          <MetricCard
            title="Test Coverage"
            value={`${metrics.coverage}%`}
            icon={<BarChart2 className="w-5 h-5" />}
            description="Code coverage percentage"
          />
          <MetricCard
            title="Test Reliability"
            value={`${metrics.reliability}%`}
            icon={<CheckCircle2 className="w-5 h-5" />}
            description="Test suite stability"
          />
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Testing Guidelines</h3>
          <div className="space-y-3">
            {[
              {
                label: 'Test Coverage',
                value: metrics.coverage,
                target: 80
              },
              {
                label: 'Test Reliability',
                value: metrics.reliability,
                target: 95
              },
              {
                label: 'Test Distribution',
                value: Math.min(100, (metrics.unitTestCount + metrics.integrationTestCount + metrics.e2eTestCount) / 0.7),
                target: 70
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
        {files.length === 0 ? (
          <p className="text-center text-gray-500">No test files found</p>
        ) : (
          files.map((file, index) => (
            <TestFileCard key={index} file={file} />
          ))
        )}
      </div>
    </div>
  </div>
);