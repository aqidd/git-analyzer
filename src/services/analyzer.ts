import type { Pipeline, Commit, TimeFilter, Contributor } from "@/types/repository"

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
            p.status === 'completed' || 
            p.conclusion === 'success'
        ).length
        const failedPipelines = pipelines.filter(p => 
            p.status === 'failed' || 
            p.status === 'failure' || 
            p.conclusion === 'failure'
        ).length
        const totalPipelines = pipelines.length
        
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

    analyzeContributors(contributors: Contributor[]) {
        const totalCommits = contributors.reduce((sum, c) => sum + c.commits, 0)
        
        // Sort contributors by number of commits in descending order
        const sortedContributors = [...contributors].sort((a, b) => b.commits - a.commits)
        
        // Check if any contributor has more than 35% of total commits
        const hasImbalance = sortedContributors.some(c => (c.commits / totalCommits) > 0.35)
        
        // Calculate bus factor (contributors needed to reach 50% of commits)
        let cumulativeCommits = 0
        let busFactor = 0
        for (const contributor of sortedContributors) {
            cumulativeCommits += contributor.commits
            busFactor++
            if ((cumulativeCommits / totalCommits) >= 0.5) break
        }
        
        return {
            imbalanceContribution: hasImbalance,
            busFactor,
            topContributor: sortedContributors[0]?.name || 'N/A',
            topContributorPercentage: totalCommits > 0 ? ((sortedContributors[0]?.commits || 0) / totalCommits * 100) : 0
        }
    }

    analyzeDocumentation() {
        
    }
        
}