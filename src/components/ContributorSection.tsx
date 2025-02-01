import React from 'react';
import { Trophy, GitCommit, GitPullRequest, FileCode } from 'lucide-react';
import { ContributorStats } from '../types/gitlab';

interface ContributorSectionProps {
  contributors: ContributorStats[];
  isLoading?: boolean;
}

const ContributorCard: React.FC<{
  contributor: ContributorStats;
  rank: number;
}> = ({ contributor, rank }) => {
  const getRankColor = () => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800';
      case 2:
        return 'bg-gray-100 text-gray-800';
      case 3:
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-blue-50 text-blue-800';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const displayName = contributor.author_name || 'Anonymous';
  const displayEmail = contributor.author_email || 'No email';

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${getRankColor()}`}>
            {rank}
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 font-medium">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{displayName}</h3>
            <p className="text-sm text-gray-500">{displayEmail}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">{contributor.score}</div>
          <div className="text-sm text-gray-500">points</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="flex items-center space-x-2">
          <GitCommit className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatNumber(contributor.commits)}
            </div>
            <div className="text-xs text-gray-500">commits</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <GitPullRequest className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatNumber(contributor.merge_requests)}
            </div>
            <div className="text-xs text-gray-500">merge requests</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatNumber(contributor.total_changes)}
            </div>
            <div className="text-xs text-gray-500">lines changed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingContributorCard = () => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-24 mt-2"></div>
        </div>
      </div>
      <div className="text-right">
        <div className="h-6 bg-gray-200 rounded w-12"></div>
        <div className="h-3 bg-gray-200 rounded w-8 mt-1"></div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mt-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
            <div className="h-3 bg-gray-200 rounded w-16 mt-1"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ContributorSection: React.FC<ContributorSectionProps> = ({
  contributors,
  isLoading = false,
}) => (
  <div className="mt-12">
    <div className="flex items-center space-x-3 mb-6">
      <Trophy className="w-6 h-6 text-indigo-600" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Contributor Leaderboard</h2>
        <p className="text-sm text-gray-500 mt-1">Most active contributors</p>
      </div>
    </div>

    <div className="space-y-4">
      {isLoading ? (
        <>
          <LoadingContributorCard />
          <LoadingContributorCard />
          <LoadingContributorCard />
        </>
      ) : contributors.length === 0 ? (
        <p className="text-center text-gray-500">No contributors found</p>
      ) : (
        contributors.map((contributor, index) => (
          <ContributorCard
            key={`${contributor.author_email || contributor.author_name}-${index}`}
            contributor={contributor}
            rank={index + 1}
          />
        ))
      )}
    </div>
  </div>
);
