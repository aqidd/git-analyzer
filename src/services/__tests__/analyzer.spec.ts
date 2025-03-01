// Last updated: 2025-03-02
// Tests for analyzer.ts service
// Tests commit analysis, pipeline analysis, branch analysis, and contributor analysis

import { describe, it, expect } from 'vitest'
import { Analyzer } from '../analyzer'
import type { Commit, Pipeline, Branch, Contributor } from '@/types/repository'

describe('Analyzer', () => {
  const analyzer = new Analyzer()
  const timeFilter = {
    startDate: '2025-01-01',
    endDate: '2025-02-01'
  }

  describe('analyzeCommits', () => {
    it('calculates daily commit rate correctly', () => {
      const commits: Commit[] = [
        { code_added: 10, code_removed: 5, message: 'test commit 1' },
        { code_added: 20, code_removed: 8, message: 'test commit 2' },
        { code_added: 15, code_removed: 3, message: 'A very long commit message that exceeds fifty characters in length' }
      ] as Commit[]

      const result = analyzer.analyzeCommits(commits, timeFilter)

      // 3 commits over 31 days = ~0.097 commits per day
      expect(result.dailyCommitRate).toBeCloseTo(0.097, 3)
      expect(result.commitWithLongDescription).toBe(1)
      expect(result.addRemoveRatio).toBe(2.8125) // (10+20+15)/(5+8+3)
    })

    it('handles zero commits correctly', () => {
      const result = analyzer.analyzeCommits([], timeFilter)

      expect(result.dailyCommitRate).toBe(0)
      expect(result.commitWithLongDescription).toBe(0)
      expect(result.addRemoveRatio).toBe(1)
    })

    it('handles zero code removals correctly', () => {
      const commits: Commit[] = [
        { code_added: 10, code_removed: 0, message: 'test commit' }
      ] as Commit[]

      const result = analyzer.analyzeCommits(commits, timeFilter)
      expect(result.addRemoveRatio).toBe(Infinity)
    })
  })

  describe('analyzePipelines', () => {
    it('calculates pipeline statistics correctly', () => {
      const pipelines: Pipeline[] = [
        { status: 'success', ref: 'main' },
        { status: 'failed' },
        { status: 'succeeded', ref: 'feature' },
        { conclusion: 'success', ref: 'master' },
        { conclusion: 'failure' }
      ] as Pipeline[]

      const result = analyzer.analyzePipelines(pipelines, timeFilter)

      expect(result.successfulPipelines).toBe(3)
      expect(result.failedPipelines).toBe(2)
      expect(result.successRate).toBe(60)
      // 2 successful main/master pipelines over 31 days
      expect(result.deploymentFrequency).toBeCloseTo(0.065, 3)
    })

    it('handles empty pipeline list', () => {
      const result = analyzer.analyzePipelines([], timeFilter)

      expect(result.successfulPipelines).toBe(0)
      expect(result.failedPipelines).toBe(0)
      expect(result.successRate).toBe(0)
      expect(result.deploymentFrequency).toBe(0)
    })
  })

  describe('analyzeBranches', () => {
    it('identifies stagnant branches correctly', () => {
      const now = new Date()
      const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)
      const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)

      const branches: Branch[] = [
        { name: 'main', lastCommitDate: now.toISOString(), protected: true },
        { name: 'stagnant1', lastCommitDate: thirtyOneDaysAgo.toISOString(), protected: false },
        { name: 'active1', lastCommitDate: twentyNineDaysAgo.toISOString(), protected: false },
        { name: 'protected-stagnant', lastCommitDate: thirtyOneDaysAgo.toISOString(), protected: true }
      ] as Branch[]

      const result = analyzer.analyzeBranches(branches)

      expect(result.totalBranches).toBe(4)
      expect(result.stagnantBranches).toHaveLength(1)
      expect(result.stagnantBranches[0].name).toBe('stagnant1')
      expect(result.healthyBranchCount).toBe(3)
      expect(result.branchHealth).toBe('75.0%')
    })

    it('handles empty branch list', () => {
      const result = analyzer.analyzeBranches([])

      expect(result.totalBranches).toBe(0)
      expect(result.stagnantBranches).toHaveLength(0)
      expect(result.stagnantBranchCount).toBe(0)
      expect(result.healthyBranchCount).toBe(0)
      expect(result.branchHealth).toBe('N/A')
    })
  })

  describe('analyzeContributors', () => {
    it('calculates contributor statistics correctly', () => {
      const contributors: Contributor[] = [
        { name: 'Alice', commits: 100 },
        { name: 'Bob', commits: 50 },
        { name: 'Charlie', commits: 30 }
      ] as Contributor[]

      const result = analyzer.analyzeContributors(contributors)

      expect(result.totalContributors).toBe(3)
      expect(result.totalCommits).toBe(180)
      expect(result.busFactor).toBe(1) // Only Alice needed for >50% of commits (100/180 = 55.6%)
      expect(result.topContributor).toBe('Alice')
      expect(result.topContributorPercentage).toBeCloseTo(55.56, 2) // 100/180 * 100
      // For [100, 50, 30] distribution, Gini coefficient should be ~0.259
      expect(result.giniCoefficient).toBeCloseTo(0.259, 3)
      expect(result.commitDistribution).toBe('Moderate') // With coefficient of 0.259 (< 0.4), should be Moderate
    })

    it('handles single contributor correctly', () => {
      const contributors: Contributor[] = [
        { name: 'Solo', commits: 100 }
      ] as Contributor[]

      const result = analyzer.analyzeContributors(contributors)

      expect(result.totalContributors).toBe(1)
      expect(result.busFactor).toBe(1)
      expect(result.topContributor).toBe('Solo')
      expect(result.topContributorPercentage).toBe(100)
      expect(result.giniCoefficient).toBe(0)
      expect(result.commitDistribution).toBe('Equal')
    })

    it('handles empty contributor list', () => {
      const result = analyzer.analyzeContributors([])

      expect(result.totalContributors).toBe(0)
      expect(result.totalCommits).toBe(0)
      expect(result.busFactor).toBe(0)
      expect(result.topContributor).toBe('N/A')
      expect(result.topContributorPercentage).toBe(0)
      expect(result.giniCoefficient).toBe(0)
      expect(result.commitDistribution).toBe('Equal')
    })

    it('calculates Gini coefficient correctly for equal distribution', () => {
      const contributors: Contributor[] = [
        { name: 'A', commits: 50 },
        { name: 'B', commits: 50 },
        { name: 'C', commits: 50 }
      ] as Contributor[]

      const result = analyzer.analyzeContributors(contributors)
      expect(result.giniCoefficient).toBe(0)
      expect(result.commitDistribution).toBe('Equal')
    })

    it('calculates Gini coefficient correctly for unequal distribution', () => {
      const contributors: Contributor[] = [
        { name: 'A', commits: 90 },
        { name: 'B', commits: 5 },
        { name: 'C', commits: 5 }
      ] as Contributor[]

      const result = analyzer.analyzeContributors(contributors)
      // For [90, 5, 5] distribution, Gini coefficient should be ~0.567
      expect(result.giniCoefficient).toBeCloseTo(0.567, 3)
      expect(result.commitDistribution).toBe('Unequal') // With coefficient of 0.567 (< 0.8), should be Unequal
    })
  })

  describe('calculateGiniCoefficient', () => {
    it('returns 0 for empty array', () => {
      expect(analyzer.calculateGiniCoefficient([])).toBe(0)
    })

    it('returns 0 for single value', () => {
      expect(analyzer.calculateGiniCoefficient([100])).toBe(0)
    })

    it('returns 0 for perfectly equal distribution', () => {
      expect(analyzer.calculateGiniCoefficient([10, 10, 10])).toBe(0)
      expect(analyzer.calculateGiniCoefficient([50, 50])).toBe(0)
    })

    it('returns correct value for moderately unequal distribution', () => {
      // [30, 20, 10] represents a moderately unequal distribution
      const result = analyzer.calculateGiniCoefficient([30, 20, 10])
      expect(result).toBeGreaterThan(0.2)
      expect(result).toBeLessThan(0.4)
    })

    it('returns correct value for highly unequal distribution', () => {
      // [90, 5, 5] represents a highly unequal distribution
      const result = analyzer.calculateGiniCoefficient([90, 5, 5])
      expect(result).toBeGreaterThan(0.5)
      expect(result).toBeLessThan(0.8)
    })

    it('returns correct value for completely unequal distribution', () => {
      // [100, 0, 0] represents complete inequality
      const result = analyzer.calculateGiniCoefficient([100, 0, 0])
      expect(result).toBeCloseTo(0.667, 3) // Due to the mean-based calculation method
    })

    it('calculates coefficient for skewed distribution', () => {
      // [10, 5, 5] represents a moderately skewed distribution
      const result = analyzer.calculateGiniCoefficient([10, 5, 5])
      expect(result).toBeCloseTo(0.167, 3)
    })

    it('maintains value between 0 and 1', () => {
      // Test with various distributions
      const distributions = [
        [1, 1, 1],
        [10, 5, 2],
        [100, 50, 10],
        [1000, 100, 1],
        [1, 0, 0]
      ]

      distributions.forEach(dist => {
        const result = analyzer.calculateGiniCoefficient(dist)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(1)
      })
    })
  })
})
