import type { Commit, Contributor, Pipeline, RepositoryFile, TimeFilter } from "@/types/repository";

export abstract class GitService {
    token: string = ''

    abstract setToken(token: string): void

    //TODO change to generic repo
    abstract getRepositories(): Promise<any[]>
    abstract getCommits(owner: string, repo: string, timeFilter: TimeFilter): Promise<Commit[]> 
    abstract getPipelines(owner: string, repo: string, timeFilter: TimeFilter): Promise<Pipeline[]> 
    abstract getContributors(owner: string, repo: string, timeFilter: TimeFilter): Promise<Contributor[]> 
    abstract getFiles(owner: string, repo: string, path: string): Promise<RepositoryFile[]> 
}