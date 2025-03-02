import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GithubAuth, Repository } from '@/types/github'
import { GithubService } from '@/services/github'

const githubService = new GithubService()

export const useGithubStore = defineStore('github', () => {
  const storedAuth = JSON.parse(localStorage.getItem('github_auth') || 'null')
  const auth = ref<GithubAuth>(storedAuth || {
    token: '',
    isAuthenticated: false
  })

  // Restore service state if auth exists
  if (storedAuth?.isAuthenticated) {
    githubService.setToken(storedAuth.token)
  }

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

      const newAuth = {
        token,
        isAuthenticated: true
      }
      auth.value = newAuth
      localStorage.setItem('github_auth', JSON.stringify(newAuth))
      
      await fetchRepositories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Authentication failed'
      const resetAuth = {
        token: '',
        isAuthenticated: false
      }
      auth.value = resetAuth
      localStorage.setItem('github_auth', JSON.stringify(resetAuth))
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
    const newAuth = {
      ...auth.value,
      isAuthenticated: false
    }
    auth.value = newAuth
    localStorage.setItem('github_auth', JSON.stringify(newAuth))
    repositories.value = []
  }

  return {
    auth,
    repositories,
    loading,
    error,
    login,
    logout,
    fetchRepositories,
    service: githubService
  }
})
