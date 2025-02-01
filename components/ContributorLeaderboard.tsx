import React from 'react';
import { X, Trophy, GitCommit, GitPullRequest, FileCode } from 'lucide-react';
import { ContributorStats } from '../types/gitlab';

interface ContributorLeaderboardProps {
  contributors: ContributorStats[];
  onClose: () => void;
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

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${getRankColor()}`}>
            {rank}
          </div>
          {contributor.avatarUrl ? (
            <img
              src={contributor.avatarUrl}
              alt={contributor.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 font-medium">
                {contributor.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-medium text-gray-900">{contributor.name}</h3>
            <p className="text-sm text-gray-500">{contributor.email}</p>
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
              {formatNumber(contributor.commitCount)}
            </div>
            <div className="text-xs text-gray-500">commits</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <GitPullRequest className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatNumber(contributor.mergeRequestCount)}
            </div>
            <div className="text-xs text-gray-500">merge requests</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatNumber(contributor.totalChanges)}
            </div>
            <div className="text-xs text-gray-500">lines changed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContributorLeaderboard: React.FC<ContributorLeaderboardProps> = ({
  contributors,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-gray-50 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Contributor Leaderboard</h2>
            <p className="text-sm text-gray-500 mt-1">Top contributors in the last 90 days</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-4">
        {contributors.length === 0 ? (
          <p className="text-center text-gray-500">No contributors found</p>
        ) : (
          contributors.map((contributor, index) => (
            <ContributorCard
              key={contributor.email}
              contributor={contributor}
              rank={index + 1}
            />
          ))
        )}
      </div>
    </div>
  </div>
);