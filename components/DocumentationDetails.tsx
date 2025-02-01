import React from 'react';
import { FileText, X } from 'lucide-react';
import { DocumentFile, DocumentationAnalysis } from '../services/documentation';

interface DocumentationDetailsProps {
  files: Array<{
    file: DocumentFile;
    analysis: DocumentationAnalysis;
    score: number;
  }>;
  onClose: () => void;
}

const FileScore: React.FC<{
  file: DocumentFile;
  analysis: DocumentationAnalysis;
  score: number;
}> = ({ file, analysis, score }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <FileText className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900">{file.path}</h3>
      </div>
      <span className="text-2xl font-bold text-indigo-600">{score}/100</span>
    </div>
    
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Word Count</span>
        <span className="font-medium">{analysis.wordCount} words</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className={`flex items-center space-x-2 ${analysis.hasHeadings ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-sm">✓ Headings</span>
        </div>
        <div className={`flex items-center space-x-2 ${analysis.hasCodeBlocks ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-sm">✓ Code Blocks</span>
        </div>
        <div className={`flex items-center space-x-2 ${analysis.hasLinks ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-sm">✓ Links</span>
        </div>
        <div className={`flex items-center space-x-2 ${analysis.hasImages ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-sm">✓ Images</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Readability Score</span>
          <span className="font-medium">{analysis.readabilityScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 rounded-full h-2"
            style={{ width: `${analysis.readabilityScore}%` }}
          />
        </div>
      </div>
    </div>
  </div>
);

export const DocumentationDetails: React.FC<DocumentationDetailsProps> = ({
  files,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-gray-50 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Documentation Analysis</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto space-y-6">
        {files.length === 0 ? (
          <p className="text-center text-gray-500">No documentation files found</p>
        ) : (
          files.map((fileData, index) => (
            <FileScore key={index} {...fileData} />
          ))
        )}
      </div>
    </div>
  </div>
);