import { GitLabService } from './gitlab';
import { DeploymentMetrics } from '../types/gitlab';

export class DeploymentAnalyzer {
  private gitlabService: GitLabService;

  constructor(gitlabService: GitLabService) {
    this.gitlabService = gitlabService;
  }

  async analyzeDeployments(repoId: number): Promise<DeploymentMetrics> {
    // Get pipelines from the last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    
    console.log('Starting deployment analysis');
    console.log('Time window:', since.toISOString(), 'to', new Date().toISOString());
    const pipelines = await this.gitlabService.getPipelines(repoId, since);
    console.log('Total pipelines found:', pipelines.length);
    
    if (pipelines.length === 0) {
      console.log('No pipelines found in the repository');
      return {
        frequency: 0,
        successRate: 0,
        avgTimeBetween: 0,
        pipelineEfficiency: 0,
        rollbackRate: 0,
      };
    }

    // Calculate deployment frequency (deployments per day)
    const daysDiff = (new Date().getTime() - since.getTime()) / (1000 * 60 * 60 * 24);
    const deploymentPipelines = pipelines.filter(p => 
      p.ref === 'main' || p.ref === 'master' || p.ref.startsWith('release/')
    );
    const frequency = deploymentPipelines.length / daysDiff;
    console.log('Deployment frequency:', frequency.toFixed(2), 'per day');
    console.log('Total deployment pipelines:', deploymentPipelines.length);

    // Calculate success rate
    const successfulPipelines = deploymentPipelines.filter(p => p.status === 'success');
    const successRate = deploymentPipelines.length > 0 
      ? (successfulPipelines.length / deploymentPipelines.length) * 100
      : 0;
    console.log('Success rate:', successRate.toFixed(2), '%');
    console.log('Successful deployments:', successfulPipelines.length);

    // Calculate average time between deployments (in hours)
    const sortedDeployments = [...deploymentPipelines].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    let totalTimeBetween = 0;
    for (let i = 0; i < sortedDeployments.length - 1; i++) {
      const timeDiff = new Date(sortedDeployments[i].created_at).getTime() - 
                      new Date(sortedDeployments[i + 1].created_at).getTime();
      totalTimeBetween += timeDiff;
    }
    const avgTimeBetween = sortedDeployments.length > 1
      ? totalTimeBetween / (sortedDeployments.length - 1) / (1000 * 60 * 60)
      : 0;
    console.log('Average time between deployments:', avgTimeBetween.toFixed(2), 'hours');

    // Calculate pipeline efficiency (ratio of successful jobs to total jobs)
    let totalJobs = 0;
    let successfulJobs = 0;
    
    for (const pipeline of deploymentPipelines) {
      const jobs = await this.gitlabService.getPipelineJobs(repoId, pipeline.id);
      totalJobs += jobs.length;
      successfulJobs += jobs.filter(j => j.status === 'success').length;
    }
    
    const pipelineEfficiency = totalJobs > 0 
      ? (successfulJobs / totalJobs) * 100 
      : 0;
    console.log('Pipeline efficiency:', pipelineEfficiency.toFixed(2), '%');

    // Calculate rollback rate (deployments that were rolled back)
    const rollbacks = deploymentPipelines.filter(p => 
      p.status === 'success' && 
      p.ref.startsWith('revert-') || 
      p.message?.toLowerCase().includes('rollback') ||
      p.message?.toLowerCase().includes('revert')
    );
    const rollbackRate = successfulPipelines.length > 0
      ? rollbacks.length / successfulPipelines.length
      : 0;
    console.log('Rollback rate:', (rollbackRate * 100).toFixed(2), '%');

    return {
      frequency,
      successRate,
      avgTimeBetween,
      pipelineEfficiency,
      rollbackRate,
    };
  }
}