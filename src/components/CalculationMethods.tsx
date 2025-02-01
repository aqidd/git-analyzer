import React from 'react';
import { X, Calculator, FileText, TestTube2, GitBranch, Shield, Rocket } from 'lucide-react';

interface CalculationMethodsProps {
  onClose: () => void;
}

const MetricExplanation: React.FC<{
  title: string;
  icon: React.ReactNode;
  formula: string;
  description: string;
  components: Array<{ name: string; weight: number; description: string }>;
}> = ({ title, icon, formula, description, components }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mb-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        {icon}
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>
    </div>
    
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Formula</h4>
        <code className="block bg-gray-50 p-3 rounded-md text-sm font-mono">
          {formula}
        </code>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
        <p className="text-gray-600">{description}</p>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Components</h4>
        <div className="space-y-3">
          {components.map((component, index) => (
            <div key={index} className="flex items-start">
              <div className="w-16 flex-shrink-0 text-sm font-medium text-gray-500">
                {(component.weight * 100)}%
              </div>
              <div>
                <div className="font-medium text-gray-700">{component.name}</div>
                <p className="text-sm text-gray-600">{component.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const CalculationMethods: React.FC<CalculationMethodsProps> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-gray-50 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Calculator className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Score Calculation Methods</h2>
            <p className="text-sm text-gray-500 mt-1">Detailed explanation of how each metric is calculated</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto">
        <MetricExplanation
          title="Documentation Score"
          icon={<FileText className="w-6 h-6 text-indigo-600" />}
          formula="Score = (WordCount * 0.3) + (Structure * 0.3) + (Readability * 0.4)"
          description="Evaluates the quality and completeness of repository documentation based on content analysis."
          components={[
            {
              name: "Word Count",
              weight: 0.3,
              description: "Optimal range is 200-2000 words. Scores decrease for very short or very long documents."
            },
            {
              name: "Document Structure",
              weight: 0.3,
              description: "Presence of headings, code blocks, links, and images. Each feature adds 25 points."
            },
            {
              name: "Readability",
              weight: 0.4,
              description: "Based on sentence length and complexity. Optimal is 15 words per sentence."
            }
          ]}
        />

        <MetricExplanation
          title="Testing Score"
          icon={<TestTube2 className="w-6 h-6 text-indigo-600" />}
          formula="Score = (UnitTests * 0.4) + (IntegrationTests * 0.3) + (Reliability * 0.3)"
          description="Measures the testing coverage and quality based on test file analysis."
          components={[
            {
              name: "Unit Tests",
              weight: 0.4,
              description: "Based on number of test cases (it blocks). Maximum score at 50 tests."
            },
            {
              name: "Integration Tests",
              weight: 0.3,
              description: "Based on number of test suites (describe blocks). Maximum score at 20 suites."
            },
            {
              name: "Test Reliability",
              weight: 0.3,
              description: "Fixed at 95% if tests exist, 0% if no tests found."
            }
          ]}
        />

        <MetricExplanation
          title="Commit Quality Score"
          icon={<GitBranch className="w-6 h-6 text-indigo-600" />}
          formula="Score = (ConventionalFormat * 0.4) + (QualityScore * 0.4) + (Frequency * 0.2)"
          description="Evaluates commit message quality and repository activity patterns."
          components={[
            {
              name: "Conventional Format",
              weight: 0.4,
              description: "Percentage of commits following conventional commit format (type: message)."
            },
            {
              name: "Quality Score",
              weight: 0.4,
              description: "Based on commit size, message quality, and absence of merge conflicts."
            },
            {
              name: "Commit Frequency",
              weight: 0.2,
              description: "Number of commits per day, normalized to a 0-100 scale."
            }
          ]}
        />

        <MetricExplanation
          title="Security Score"
          icon={<Shield className="w-6 h-6 text-indigo-600" />}
          formula="Score = 100 - (VulnerabilityPenalty + SecretsPenalty)"
          description="Assesses repository security based on vulnerability scanning and secret detection."
          components={[
            {
              name: "Vulnerability Impact",
              weight: 0.3,
              description: "Deducts 10 points per vulnerability, up to 40 points maximum."
            },
            {
              name: "Exposed Secrets",
              weight: 0.5,
              description: "Deducts 25 points per exposed secret, up to 50 points maximum."
            },
            {
              name: "Patch Time",
              weight: 0.2,
              description: "Based on average time to patch vulnerabilities."
            }
          ]}
        />

        <MetricExplanation
          title="Deployment Score"
          icon={<Rocket className="w-6 h-6 text-indigo-600" />}
          formula="Score = (Frequency * 0.2) + (SuccessRate * 0.3) + (Efficiency * 0.3) + (RollbackScore * 0.2)"
          description="Measures deployment frequency, reliability, and pipeline efficiency."
          components={[
            {
              name: "Deployment Frequency",
              weight: 0.2,
              description: "Number of deployments per day, normalized to a 0-100 scale."
            },
            {
              name: "Success Rate",
              weight: 0.3,
              description: "Percentage of successful deployments."
            },
            {
              name: "Pipeline Efficiency",
              weight: 0.3,
              description: "Ratio of successful pipeline jobs to total jobs."
            },
            {
              name: "Rollback Score",
              weight: 0.2,
              description: "Penalizes rollbacks (50 points per rollback)."
            }
          ]}
        />
      </div>
    </div>
  </div>
);