import type { Pipeline, Commit, TimeFilter, Contributor, Branch } from "@/types/repository"

export class Analyzer {
    analyzeCommits(commits: Commit[], timeFilter: TimeFilter) {
        const startDate = new Date(timeFilter.startDate)
        const endDate = new Date(timeFilter.endDate)
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        const totalAdded = commits.reduce((sum, commit) => sum + commit.code_added, 0)
        const totalRemoved = commits.reduce((sum, commit) => sum + commit.code_removed, 0)
        
        return {
            dailyCommitRate: totalDays > 0 ? (commits.length / totalDays) : 0,
            commitWithLongDescription: commits.filter(c => c.message.length > 50).length,
            addRemoveRatio: totalRemoved > 0 ? (totalAdded / totalRemoved) : totalAdded > 0 ? Infinity : 1
        }
    }

    analyzePipelines(pipelines: Pipeline[], timeFilter: TimeFilter) {
        const successfulPipelines = pipelines.filter(p => 
            p.status === 'success' || 
            p.status === 'succeeded' || 
            p.conclusion === 'success'
        ).length
        const failedPipelines = pipelines.filter(p => 
            p.status === 'failed' || 
            p.status === 'failure' || 
            p.conclusion === 'failure'
        ).length
        const totalPipelines = pipelines.length
        
        console.log('==Printing Pielines==')
        console.log(successfulPipelines, failedPipelines, totalPipelines)
        console.log(pipelines)
        // Calculate deployment frequency for main/master/develop branches
        const mainBranchPipelines = pipelines.filter(p => 
            (p.ref === 'main' || p.ref === 'master' || p.ref === 'develop') &&
            (p.status === 'success' || p.status === 'succeeded' || p.status === 'completed' || p.conclusion === 'success')
        ).length

        const startDate = new Date(timeFilter.startDate)
        const endDate = new Date(timeFilter.endDate)
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
            successfulPipelines,
            failedPipelines,
            successRate: totalPipelines > 0 ? (successfulPipelines / totalPipelines) * 100 : 0,
            deploymentFrequency: totalDays > 0 ? mainBranchPipelines / totalDays : 0,
        }
    }

    analyzeBranches(branches: Branch[]) {
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        
        const stagnantBranches = branches.filter(branch => {
            const lastCommit = new Date(branch.lastCommitDate)
            return lastCommit < thirtyDaysAgo && !branch.protected
        })
        
        return {
            totalBranches: branches.length,
            stagnantBranches: stagnantBranches.map(b => ({
                name: b.name,
                daysSinceLastCommit: Math.floor((now.getTime() - new Date(b.lastCommitDate).getTime()) / (1000 * 60 * 60 * 24))
            })),
            stagnantBranchCount: stagnantBranches.length,
            healthyBranchCount: branches.length - stagnantBranches.length,
            branchHealth: branches.length > 0 ? ((branches.length - stagnantBranches.length) / branches.length * 100).toFixed(1) + '%' : 'N/A'
        }
    }

    analyzeContributors(contributors: Contributor[]) {
        const totalCommits = contributors.reduce((sum, c) => sum + c.commits, 0)
        
        // Sort contributors by number of commits in descending order
        const sortedContributors = [...contributors].sort((a, b) => b.commits - a.commits)
        
        // Calculate Gini coefficient
        const giniCoefficient = this.calculateGiniCoefficient(sortedContributors.map(c => c.commits))
        
        // Calculate bus factor (contributors needed to reach 50% of commits)
        let cumulativeCommits = 0
        let busFactor = 0
        for (const contributor of sortedContributors) {
            cumulativeCommits += contributor.commits
            busFactor++
            if ((cumulativeCommits / totalCommits) >= 0.5) break
        }
        
        return {
            totalContributors: contributors.length,
            totalCommits,
            busFactor,
            topContributor: sortedContributors[0]?.name || 'N/A',
            topContributorPercentage: totalCommits > 0 ? ((sortedContributors[0]?.commits || 0) / totalCommits * 100) : 0,
            giniCoefficient: parseFloat(giniCoefficient.toFixed(3)),
            commitDistribution: this.getCommitDistributionCategory(giniCoefficient)
        }
    }

    calculateGiniCoefficient(values: number[]): number {
        if (values.length === 0) return 0
        if (values.length === 1) return 0
        
        const sortedValues = [...values].sort((a, b) => a - b)
        const n = sortedValues.length
        const mean = sortedValues.reduce((a, b) => a + b, 0) / n
        
        let sumNumerator = 0
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                sumNumerator += Math.abs(sortedValues[i] - sortedValues[j])
            }
        }
        
        const gini = sumNumerator / (2 * n * n * mean)
        return Math.min(Math.max(gini, 0), 1) // Ensure result is between 0 and 1
    }

    private getCommitDistributionCategory(gini: number): string {
        if (gini < 0.2) return 'Equal'
        if (gini < 0.4) return 'Moderate'
        if (gini < 0.8) return 'Unequal'
        return 'Very Unequal'
    }

    analyzePullRequests(pullRequests: any[], timeFilter: TimeFilter) {
        const startDate = new Date(timeFilter.startDate)
        const endDate = new Date(timeFilter.endDate)
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

        // Group PRs by author
        const authorStats = pullRequests.reduce((acc: { [key: string]: number }, pr) => {
            const author = typeof pr.author === 'object' ? pr.author.name : pr.author || pr.user?.login || 'Unknown'
            acc[author] = (acc[author] || 0) + 1
            return acc
        }, {})

        // Find top contributor
        let topContributor = 'Unknown'
        let topContributorPRs = 0
        Object.entries(authorStats).forEach(([author, count]) => {
            if (count > topContributorPRs) {
                topContributor = author
                topContributorPRs = count
            }
        })

        return {
            totalPRs: pullRequests.length,
            averagePRPerDay: totalDays > 0 ? pullRequests.length / totalDays : 0,
            topContributor,
            topContributorPRs,
            topContributorAvgPRPerDay: totalDays > 0 ? topContributorPRs / totalDays : 0
        }
    }

    analyzeDocumentation() {
        
    }
        
}