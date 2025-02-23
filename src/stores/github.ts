import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GithubAuth, Repository } from '@/types/github'
import { GithubService } from '@/services/github'

const githubService = new GithubService()

export const useGithubStore = defineStore('github', () => {
  const auth = ref<GithubAuth>({
    token: '',
    isAuthenticated: false
  })

  const repositories = ref<Repository[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function login(token: string) {
    loading.value = true
    error.value = null
    
    try {
      githubService.setToken(token)
      const isValid = await githubService.validateToken()
      
      if (!isValid) {
        throw new Error('Invalid token')
      }

      auth.value = {
        token,
        isAuthenticated: true
      }
      
      await fetchRepositories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Authentication failed'
      auth.value = {
        token: '',
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
      repositories.value = await githubService.getRepositories()
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
