import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GitlabAuth, Repository } from '@/types/gitlab'
import { GitlabService } from '@/services/gitlab'

const DEFAULT_GITLAB_URL = 'https://gitlab.com'
const gitlabService = new GitlabService()

export const useGitlabStore = defineStore('gitlab', () => {
  const auth = ref<GitlabAuth>({
    token: '',
    url: DEFAULT_GITLAB_URL,
    isAuthenticated: false
  })

  const repositories = ref<Repository[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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

      auth.value = {
        token,
        url,
        isAuthenticated: true
      }
      
      await fetchRepositories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Authentication failed'
      auth.value = {
        token: '',
        url: DEFAULT_GITLAB_URL,
        isAuthenticated: false
      }
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
    auth.value = {
      token: '',
      url: DEFAULT_GITLAB_URL,
      isAuthenticated: false
    }
    repositories.value = []
  }

  return {
    auth,
    repositories,
    loading,
    error,
    login,
    logout,
    fetchRepositories
  }
})
