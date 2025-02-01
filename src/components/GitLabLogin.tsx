import React, { useState } from 'react';
import { Key } from 'lucide-react';

interface GitLabLoginProps {
  onLogin: (config: { apiToken: string; baseUrl: string }) => void;
}

export const GitLabLogin: React.FC<GitLabLoginProps> = ({ onLogin }) => {
  const [apiToken, setApiToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://gitlab.com');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiToken) {
      setError('API token is required');
      return;
    }

    onLogin({ apiToken, baseUrl });
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-center mb-8 text-indigo-600">
        <Key className="w-12 h-12" />
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
        Connect to GitLab
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">
            GitLab Instance URL
          </label>
          <input
            id="baseUrl"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://gitlab.com"
          />
        </div>

        <div>
          <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 mb-1">
            Personal Access Token
          </label>
          <input
            id="apiToken"
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="glpat-xxxxxxxxxxxxxx"
          />
          <p className="mt-1 text-sm text-gray-500">
            Create a token with api scope at: Settings → Access Tokens
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Connect
        </button>
      </form>
    </div>
  );
};