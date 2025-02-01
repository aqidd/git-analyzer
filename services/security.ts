import { GitLabService } from './gitlab';
import { SecurityMetrics } from '../types/gitlab';

export class SecurityAnalyzer {
  private gitlabService: GitLabService;

  constructor(gitlabService: GitLabService) {
    this.gitlabService = gitlabService;
  }

  async analyzeRepository(repoId: number): Promise<SecurityMetrics> {
    console.log('Starting security analysis for repository:', repoId);
    
    const files = await this.gitlabService.getRepositoryFiles(repoId);
    console.log('Files to analyze:', files.length);

    let vulnerabilityCount = 0;
    let exposedSecretsCount = 0;

    // Analyze each file for security issues
    for (const file of files) {
      // Check for potential secrets
      const secretsFound = this.findExposedSecrets(file.content);
      exposedSecretsCount += secretsFound.length;
      
      // Check for common vulnerabilities
      const vulnerabilities = this.findVulnerabilities(file.path, file.content);
      vulnerabilityCount += vulnerabilities.length;

      if (secretsFound.length > 0) {
        console.log('Secrets found in:', file.path, secretsFound);
      }
      
      if (vulnerabilities.length > 0) {
        console.log('Vulnerabilities found in:', file.path, vulnerabilities);
      }
    }

    // Calculate security score
    const securityScore = this.calculateSecurityScore({
      vulnerabilityCount,
      exposedSecretsCount,
      avgPatchTime: 0, // This would need CI/CD analysis to determine
      securityScore: 0,
    });

    const metrics: SecurityMetrics = {
      vulnerabilityCount,
      exposedSecretsCount,
      avgPatchTime: 0,
      securityScore,
    };

    console.log('Security analysis complete:', metrics);
    return metrics;
  }

  private findExposedSecrets(content: string): string[] {
    const secrets: string[] = [];
    
    // Regular expressions for common secret patterns
    const patterns = [
      {
        type: 'API Key',
        regex: /(['"]?(?:api[_-]?key|api[_-]?secret|access[_-]?key|auth[_-]?token)['"]\s*[:=]\s*['"][\w\-+=]{16,}['"])/gi
      },
      {
        type: 'AWS Key',
        regex: /AKIA[0-9A-Z]{16}/g
      },
      {
        type: 'Private Key',
        regex: /-----BEGIN (?:RSA |DSA )?PRIVATE KEY-----/g
      },
      {
        type: 'Generic Token',
        regex: /(['"]?token['"]\s*[:=]\s*['"][\w\-+=]{16,}['"])/gi
      },
      {
        type: 'Password',
        regex: /(['"]?password['"]\s*[:=]\s*['"][^'"]{8,}['"])/gi
      }
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern.regex);
      if (matches) {
        secrets.push(...matches.map(() => pattern.type));
      }
    }

    return secrets;
  }

  private findVulnerabilities(path: string, content: string): string[] {
    const vulnerabilities: string[] = [];

    // Check for common security anti-patterns
    const patterns = [
      {
        type: 'SQL Injection Risk',
        regex: /(?:executeQuery|query)\s*\(\s*[\`'"]\s*(?:[^'"\`]*\$\{|\+)/g
      },
      {
        type: 'XSS Risk',
        regex: /(?:innerHTML|outerHTML)\s*=|dangerouslySetInnerHTML/g
      },
      {
        type: 'Insecure Cookie',
        regex: /document\.cookie\s*=|cookies\.set\([^)]+secure:\s*false/g
      },
      {
        type: 'Eval Usage',
        regex: /\beval\s*\(|\bFunction\s*\(/g
      },
      {
        type: 'Insecure Random',
        regex: /Math\.random\s*\(/g
      }
    ];

    // Only analyze relevant files
    if (/\.(js|jsx|ts|tsx|php|py|rb)$/i.test(path)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          vulnerabilities.push(...matches.map(() => pattern.type));
        }
      }
    }

    return vulnerabilities;
  }

  private calculateSecurityScore(metrics: SecurityMetrics): number {
    // Base score starts at 100
    let score = 100;

    // Deduct points for vulnerabilities (up to 40 points)
    const vulnerabilityImpact = Math.min(metrics.vulnerabilityCount * 10, 40);
    score -= vulnerabilityImpact;

    // Deduct points for exposed secrets (up to 50 points)
    const secretsImpact = Math.min(metrics.exposedSecretsCount * 25, 50);
    score -= secretsImpact;

    // Ensure score doesn't go below 0
    return Math.max(0, Math.round(score));
  }
}