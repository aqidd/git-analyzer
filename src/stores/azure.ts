import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AzureAuth, Repository } from '@/types/azure'
import { AzureService } from '@/services/azure'

const azureService = new AzureService()

export const useAzureStore = defineStore('azure', () => {
  const storedAuth = JSON.parse(localStorage.getItem('azure_auth') || 'null')
  const auth = ref<AzureAuth>(storedAuth || {
    token: '',
    organization: '',
    isAuthenticated: false
  })

  // Restore service state if auth exists
  if (storedAuth?.isAuthenticated) {
    azureService.setOrganization(storedAuth.organization)
    azureService.setToken(storedAuth.token)
  }

  const repositories = ref<Repository[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function login(organization: string, token: string) {
    loading.value = true
    error.value = null
    
    try {
      azureService.setOrganization(organization)
      azureService.setToken(token)
      const isValid = await azureService.validateToken()
      
      if (!isValid) {
        throw new Error('Invalid token')
      }

      const newAuth = {
        token,
        organization,
        isAuthenticated: true
      }
      auth.value = newAuth
      localStorage.setItem('azure_auth', JSON.stringify(newAuth))
      
      await fetchRepositories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Authentication failed'
      const resetAuth = {
        token: '',
        organization: '',
        isAuthenticated: false
      }
      auth.value = resetAuth
      localStorage.setItem('azure_auth', JSON.stringify(resetAuth))
    } finally {
      loading.value = false
    }
  }

  async function fetchRepositories() {
    if (!auth.value.isAuthenticated) return

    loading.value = true
    error.value = null

    try {
      repositories.value = await azureService.getRepositories()
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
    localStorage.setItem('azure_auth', JSON.stringify(newAuth))
    repositories.value = []
    error.value = null
  }

  return {
    auth,
    repositories,
    loading,
    error,
    login,
    logout,
    fetchRepositories,
    service: azureService
  }
})
