import React, { useEffect, useState } from 'react';
import { GitLabService } from '../services/gitlab';
import { Repository } from '../types/gitlab';
import { Search, Loader, ChevronLeft, ChevronRight } from 'lucide-react';

interface RepositorySelectorProps {
  gitlabService: GitLabService;
  onSelect: (repository: Repository) => void;
}

export const RepositorySelector: React.FC<RepositorySelectorProps> = ({
  gitlabService,
  onSelect,
}) => {
  const [repositories, setRepositories] = useState<{
    items: Repository[];
    totalPages: number;
    totalItems: number;
  }>({ items: [], totalPages: 1, totalItems: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const perPage = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    loadRepositories(1, debouncedSearch);
  }, [debouncedSearch]);

  const loadRepositories = async (currentPage: number, searchQuery: string) => {
    try {
      setLoading(true);
      setError('');
      const result = await gitlabService.getRepositories({
        page: currentPage,
        perPage,
        search: searchQuery,
        orderBy: 'last_activity_at',
        sort: 'desc',
      });
      setRepositories({
        items: result.repositories,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
      });
    } catch (err) {
      setError('Failed to load repositories. Please check your GitLab token and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadRepositories(newPage, debouncedSearch);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  const PaginationButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
  }> = ({ onClick, disabled, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center px-3 py-1 rounded border ${
        disabled
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Repository
        </h2>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            Found {repositories.totalItems} repositories
          </p>
          <p className="text-sm text-gray-500">
            Sorted by recent activity
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {repositories.items.map((repo) => (
          <button
            key={repo.id}
            onClick={() => onSelect(repo)}
            className="text-left p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 relative"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{repo.name}</h3>
                {repo.description && (
                  <p className="text-gray-600 mt-1">{repo.description}</p>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Updated {new Date(repo.last_activity_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {repositories.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PaginationButton
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </PaginationButton>
            <PaginationButton
              onClick={() => handlePageChange(page + 1)}
              disabled={page === repositories.totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </PaginationButton>
          </div>
          <div className="text-sm text-gray-500">
            Page {page} of {repositories.totalPages}
          </div>
        </div>
      )}
      
      {repositories.items.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No repositories found{search ? ' matching your search' : ''}
        </div>
      )}
    </div>
  );
};