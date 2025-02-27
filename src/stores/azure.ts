import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AzureAuth, Repository } from '@/types/azure'
import { AzureService } from '@/services/azure'

const azureService = new AzureService()

export const useAzureStore = defineStore('azure', () => {
  const auth = ref<AzureAuth>({
    token: '',
    organization: '',
    isAuthenticated: false
  })

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

      auth.value = {
        token,
        organization,
        isAuthenticated: true
      }
      
      await fetchRepositories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Authentication failed'
      auth.value = {
        token: '',
        organization: '',
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
      repositories.value = await azureService.getRepositories()
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
      organization: '',
      isAuthenticated: false
    }
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
