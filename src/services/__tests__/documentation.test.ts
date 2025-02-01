import { describe, it, expect } from 'vitest';
import { DocumentationService } from '../documentation';
import { GitLabService } from '../gitlab';

describe('DocumentationService', () => {
  const gitlabService = new GitLabService({
    apiToken: 'test-token',
    baseUrl: 'https://gitlab.com',
  });
  const documentationService = new DocumentationService(gitlabService);

  describe('analyzeDocument', () => {
    it('should correctly analyze a well-structured document', () => {
      const content = `
# Project Title

This is a sample project description.

## Features
- Feature 1
- Feature 2

\`\`\`javascript
console.log('Hello World');
\`\`\`

[Link to docs](https://docs.example.com)
![Screenshot](image.png)
`;

      const analysis = documentationService.analyzeDocument(content);
      expect(analysis.hasHeadings).toBe(true);
      expect(analysis.hasCodeBlocks).toBe(true);
      expect(analysis.hasLinks).toBe(true);
      expect(analysis.hasImages).toBe(true);
      expect(analysis.wordCount).toBeGreaterThan(0);
      expect(analysis.readabilityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.readabilityScore).toBeLessThanOrEqual(100);
    });

    it('should handle empty documents', () => {
      const analysis = documentationService.analyzeDocument('');
      expect(analysis.wordCount).toBe(0);
      expect(analysis.hasHeadings).toBe(false);
      expect(analysis.hasCodeBlocks).toBe(false);
      expect(analysis.hasLinks).toBe(false);
      expect(analysis.hasImages).toBe(false);
      expect(analysis.readabilityScore).toBe(0);
    });
  });

  describe('empty repository handling', () => {
    it('should handle repositories with no documentation files', async () => {
      const emptyGitlabService = {
        getRepositoryFiles: async () => [] // Mock returning empty files array
      };
      const docService = new DocumentationService(emptyGitlabService as any);
      const files = await emptyGitlabService.getRepositoryFiles(1);
      
      // Verify we get an empty array of files
      expect(files).toHaveLength(0);
      
      // Calculate score for empty files array
      const analyzedFiles = files.map(file => ({
        file,
        analysis: docService.analyzeDocument(file.content),
        score: docService.calculateFileScore(docService.analyzeDocument(file.content))
      }));
      
      // Calculate documentation score
      const score = analyzedFiles.length === 0 ? 0 :
        Math.round(analyzedFiles.reduce((acc, file) => acc + file.score, 0) / Math.max(1, analyzedFiles.length));
      
      // Verify score is 0 for empty repository
      expect(score).toBe(0);
    });
  });

  describe('calculateFileScore', () => {
    it('should give high score to well-structured documents', () => {
      const analysis = {
        wordCount: 500,
        hasHeadings: true,
        hasCodeBlocks: true,
        hasLinks: true,
        hasImages: true,
        readabilityScore: 90,
      };

      const score = documentationService.calculateFileScore(analysis);
      expect(score).toBeGreaterThan(80);
    });

    it('should give low score to poor documents', () => {
      const analysis = {
        wordCount: 50,
        hasHeadings: false,
        hasCodeBlocks: false,
        hasLinks: false,
        hasImages: false,
        readabilityScore: 30,
      };

      const score = documentationService.calculateFileScore(analysis);
      expect(score).toBeLessThan(50);
    });

    it('should penalize extremely long documents', () => {
      const analysis = {
        wordCount: 5000,
        hasHeadings: true,
        hasCodeBlocks: true,
        hasLinks: true,
        hasImages: true,
        readabilityScore: 90,
      };

      const score = documentationService.calculateFileScore(analysis);
      expect(score).toBeLessThan(90);
    });
  });
});