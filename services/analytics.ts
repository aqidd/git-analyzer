import { GitLabService } from './gitlab';
import { DocumentationService } from './documentation';
import { CommitAnalyzer } from './commit';
import { DeploymentAnalyzer } from './deployment';
import {
  AnalyticsScore,
  DocumentationMetrics,
  TestingMetrics,
  CommitMetrics,
  SecurityMetrics,
  DeploymentMetrics,
} from '../types/gitlab';

export class AnalyticsService {
  private gitlabService: GitLabService;
  private documentationService: DocumentationService;
  private commitAnalyzer: CommitAnalyzer;
  private deploymentAnalyzer: DeploymentAnalyzer;

  constructor(gitlabService: GitLabService) {
    this.gitlabService = gitlabService;
    this.documentationService = new DocumentationService(gitlabService);
    this.commitAnalyzer = new CommitAnalyzer(gitlabService);
    this.deploymentAnalyzer = new DeploymentAnalyzer(gitlabService);
  }

  async calculateDocumentationScore(repoId: number): Promise<DocumentationMetrics> {
    const files = await this.gitlabService.getRepositoryFiles(repoId);
    
    let readmeScore = 0;
    let adrScore = 0;
    let contributingGuideExists = false;
    let licenseExists = false;
    
    for (const file of files) {
      const analysis = this.documentationService.analyzeDocument(file.content);
      const fileScore = this.documentationService.calculateFileScore(analysis);
      
      if (file.path.toLowerCase() === 'readme.md') {
        readmeScore = fileScore;
      } else if (file.path.toLowerCase().includes('adr') || file.path.toLowerCase().includes('architecture')) {
        adrScore = Math.max(adrScore, fileScore);
      } else if (file.path.toLowerCase() === 'contributing.md') {
        contributingGuideExists = true;
      } else if (file.path.toLowerCase().includes('license')) {
        licenseExists = true;
      }
    }
    
    // Calculate inline documentation score (this will be implemented separately)
    const inlineDocScore = 0;

    return {
      readmeScore,
      adrScore,
      inlineDocScore,
      contributingGuideExists,
      licenseExists,
      totalScore: readmeScore,
    };
  }

  async calculateTestingMetrics(repoId: number): Promise<TestingMetrics> {
    // Implementation will be added in subsequent updates
    return {
      coverage: 0,
      unitTestCount: 0,
      integrationTestCount: 0,
      e2eTestCount: 0,
      avgExecutionTime: 0,
      reliability: 0,
    };
  }

  async analyzeCommits(repoId: number): Promise<CommitMetrics> {
    return this.commitAnalyzer.analyzeRepository(repoId);
  }

  async analyzeDeployments(repoId: number): Promise<DeploymentMetrics> {
    return this.deploymentAnalyzer.analyzeDeployments(repoId);
  }
}