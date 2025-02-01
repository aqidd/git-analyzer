import { GitLabService } from './gitlab';

export interface DocumentFile {
  path: string;
  content: string;
}

export interface DocumentationAnalysis {
  wordCount: number;
  hasHeadings: boolean;
  hasCodeBlocks: boolean;
  hasLinks: boolean;
  hasImages: boolean;
  readabilityScore: number;
}

export class DocumentationService {
  private gitlabService: GitLabService;

  constructor(gitlabService: GitLabService) {
    this.gitlabService = gitlabService;
  }

  analyzeDocument(content: string): DocumentationAnalysis {
    const hasHeadings = /^#{1,6}\s.+/m.test(content);
    const hasCodeBlocks = /```[\s\S]*?```/.test(content);
    const hasLinks = /\[.+\]\(.+\)/.test(content);
    const hasImages = /!\[.+\]\(.+\)/.test(content);
    
    // Calculate word count excluding code blocks and URLs
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[.+\]\(.+\)/g, '') // Remove links
      .replace(/!\[.+\]\(.+\)/g, ''); // Remove images
    
    const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;
    
    // For empty documents, all scores should be 0
    if (wordCount === 0) {
      return {
        wordCount: 0,
        hasHeadings: false,
        hasCodeBlocks: false,
        hasLinks: false,
        hasImages: false,
        readabilityScore: 0,
      };
    }
    
    // Simple readability score based on average words per sentence
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
    const readabilityScore = Math.max(0, 100 - Math.abs(avgWordsPerSentence - 15) * 5);

    return {
      wordCount,
      hasHeadings,
      hasCodeBlocks,
      hasLinks,
      hasImages,
      readabilityScore: Math.round(readabilityScore),
    };
  }

  calculateFileScore(analysis: DocumentationAnalysis): number {
    const weights = {
      wordCount: 0.3,
      structure: 0.3,
      readability: 0.4,
    };

    // Score based on word count (ideal range: 200-2000 words)
    let wordCountScore;
    if (analysis.wordCount === 0) {
      wordCountScore = 0;
    } else if (analysis.wordCount < 200) {
      wordCountScore = (analysis.wordCount / 200) * 80; // Max 80% for short docs
    } else if (analysis.wordCount <= 2000) {
      wordCountScore = 100;
    } else {
      // Penalize docs over 2000 words more heavily
      const excess = (analysis.wordCount - 2000) / 1000;
      wordCountScore = Math.max(0, 100 - (excess * 15)); // Increased penalty to 15 points per 1000 words
    }
    
    // Score based on document structure
    const structureFeatures = [
      analysis.hasHeadings,
      analysis.hasCodeBlocks,
      analysis.hasLinks,
      analysis.hasImages,
    ];
    
    const structureScore = structureFeatures.filter(Boolean).length * 25;

    const score = 
      wordCountScore * weights.wordCount +
      structureScore * weights.structure +
      analysis.readabilityScore * weights.readability;

    return Math.round(score);
  }
}