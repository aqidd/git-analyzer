import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GitlabAuth, Repository } from '@/types/gitlab'
import type { PullRequest, TimeFilter } from '@/types/repository'
import { GitlabService } from '@/services/gitlab'

const DEFAULT_GITLAB_URL = 'https://gitlab.com'
const gitlabService = new GitlabService()

export const useGitlabStore = defineStore('gitlab', () => {
  const storedAuth = JSON.parse(localStorage.getItem('gitlab_auth') || 'null')
  const auth = ref<GitlabAuth>(storedAuth || {
    token: '',
    url: DEFAULT_GITLAB_URL,
    isAuthenticated: false
  })

  // Restore service state if auth exists
  if (storedAuth?.isAuthenticated) {
    gitlabService.setBaseUrl(storedAuth.url)
    gitlabService.setToken(storedAuth.token)
  }

  const repositories = ref<Repository[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pullRequests = ref<PullRequest[]>([])

  async function login(url: string = DEFAULT_GITLAB_URL, token: string) {
    loading.value = true
    error.value = null
    
    try {
      gitlabService.setBaseUrl(url)
      gitlabService.setToken(token)
      const isValid = await gitlabService.validateToken()
      
      if (!isValid) {
        throw new Error('Invalid token')
      }

      const newAuth = {
        token,
        url,
        isAuthenticated: true
      }
      auth.value = newAuth
      localStorage.setItem('gitlab_auth', JSON.stringify(newAuth))
      
      await fetchRepositories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Authentication failed'
      const resetAuth = {
        token: '',
        url: DEFAULT_GITLAB_URL,
        isAuthenticated: false
      }
      auth.value = resetAuth
      localStorage.setItem('gitlab_auth', JSON.stringify(resetAuth))
    } finally {
      loading.value = false
    }
  }

  async function fetchRepositories() {
    if (!auth.value.isAuthenticated) return
    
    loading.value = true
    error.value = null
    
    try {
      repositories.value = await gitlabService.getRepositories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch repositories'
      repositories.value = []
    } finally {
      loading.value = false
    }
  }

  function logout() {
    const newAuth = {
      ...auth.value,
      isAuthenticated: false
    }
    auth.value = newAuth
    localStorage.setItem('gitlab_auth', JSON.stringify(newAuth))
    repositories.value = []
  }

  async function fetchPullRequests(owner: string, repo: string, timeFilter: TimeFilter) {
    if (!auth.value.isAuthenticated) return
    
    loading.value = true
    error.value = null
    
    try {
      pullRequests.value = await gitlabService.getPullRequests(owner, repo, timeFilter)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch pull requests'
      pullRequests.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    auth,
    repositories,
    loading,
    error,
    login,
    logout,
    fetchRepositories,
    fetchPullRequests,
    pullRequests,
    service: gitlabService
  }
})
