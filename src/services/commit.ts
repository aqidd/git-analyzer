import { GitLabService } from './gitlab';
import { CommitMetrics } from '../types/gitlab';

export class CommitAnalyzer {
  private gitlabService: GitLabService;

  constructor(gitlabService: GitLabService) {
    this.gitlabService = gitlabService;
  }

  async analyzeRepository(repoId: number): Promise<CommitMetrics> {
    // Get commits from the last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    
    console.log('Fetching commits since:', since.toISOString());
    const commits = await this.gitlabService.getCommits(repoId, since);
    console.log('Total commits found:', commits.length);
    
    if (commits.length === 0) {
      console.log('No commits found in the repository');
      return {
        conventionalCommitRate: 0,
        avgCommitSize: 0,
        commitFrequency: 0,
        problematicCommitsRate: 0,
      };
    }

    // Analyze conventional commits
    const conventionalCommits = commits.filter(commit => 
      this.isConventionalCommit(commit.title)
    );
    console.log('Conventional commits found:', conventionalCommits.length);
    const conventionalCommitRate = (conventionalCommits.length / commits.length) * 100;

    // Calculate average commit size
    const totalChanges = commits.reduce((sum, commit) => 
      sum + (commit.stats?.total || 0), 0
    );
    console.log('Total changes across all commits:', totalChanges);
    const avgCommitSize = totalChanges / commits.length;

    // Calculate commit frequency (commits per day)
    const daysDiff = (new Date().getTime() - since.getTime()) / (1000 * 60 * 60 * 24);
    const commitFrequency = commits.length / daysDiff;
    console.log('Commit frequency:', commitFrequency.toFixed(2), 'commits per day');

    // Analyze problematic commits
    const problematicCommits = commits.filter(commit => 
      this.isProblematicCommit(commit)
    );
    console.log('Problematic commits found:', problematicCommits.length);
    if (problematicCommits.length > 0) {
      console.log('Problems found:', problematicCommits.map(commit => ({
        title: commit.title,
        problems: this.getCommitProblems(commit)
      })));
    }
    const problematicCommitsRate = problematicCommits.length / commits.length;

    const metrics = {
      conventionalCommitRate,
      avgCommitSize,
      commitFrequency,
      problematicCommitsRate,
    };
    
    console.log('Final commit metrics:', metrics);
    return metrics;
  }

  private isConventionalCommit(message: string): boolean {
    // Conventional Commit format: <type>[optional scope]: <description>
    const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?: .+/;
    return conventionalPattern.test(message);
  }

  private getCommitProblems(commit: {
    title: string;
    message: string;
    stats?: { additions: number; deletions: number; total: number };
  }): string[] {
    const problems = [];

    if (commit.stats?.total && commit.stats.total > 1000) {
      problems.push('large-changes');
    }

    // Skip uninformative message check for conventional commits
    if (!this.isConventionalCommit(commit.title)) {
      const uninformativePatterns = [
        /^fix\b/i,
        /^update\b/i,
        /^changes\b/i,
        /^wip\b/i,
        /^temp\b/i,
        /^testing\b/i,
        /^commit\b/i,
        /^[.]+$/,
      ];
      if (uninformativePatterns.some(pattern => pattern.test(commit.title.trim()))) {
        problems.push('uninformative-message');
      }
    }

    if (commit.message.includes('<<<<<<<') || commit.message.includes('>>>>>>>')) {
      problems.push('merge-conflict-markers');
    }

    if (commit.title.length < 10) {
      problems.push('short-message');
    }

    return problems;
  }

  private isProblematicCommit(commit: {
    title: string;
    message: string;
    stats?: { additions: number; deletions: number; total: number };
  }): boolean {
    return this.getCommitProblems(commit).length > 0;
  }
}