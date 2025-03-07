<template>
  <div class="p-4 bg-gray-50 ml-12 mr-6 min-h-screen dark:bg-gray-900">
    <div class="p-4 rounded-lg">
      <div class="flex flex-col gap-4 mb-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Your Repositories</h1>
          <div class="flex items-center gap-4">
            <div class="flex items-center">
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="pinnedStore.rememberPins"
                  @change="handleRememberPinsChange"
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Remember Pins</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button v-if="gitlabStore.auth.isAuthenticated" @click="handleLogout('gitlab')"
                :disabled="loggingOut"
                class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-[#FC6D26] hover:bg-[#E24329] focus:ring-4 focus:ring-[#FC6D26]/50 disabled:opacity-50 disabled:cursor-not-allowed">
                <span v-if="loggingOut" class="mr-2">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                Logout GitLab
              </button>
            <button v-if="githubStore.auth.isAuthenticated" @click="handleLogout('github')"
              :disabled="loggingOut"
              class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-[#2DA44E] hover:bg-[#2C974B] focus:ring-4 focus:ring-[#2DA44E]/50 disabled:opacity-50 disabled:cursor-not-allowed">
              <span v-if="loggingOut" class="mr-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              Logout GitHub
            </button>
            <button v-if="azureStore.auth.isAuthenticated" @click="handleLogout('azure')"
              :disabled="loggingOut"
              class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-[#0078D4] hover:bg-[#106EBE] focus:ring-4 focus:ring-[#0078D4]/50 disabled:opacity-50 disabled:cursor-not-allowed">
              <span v-if="loggingOut" class="mr-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              Logout Azure
            </button>
            </div>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search repositories..."
                class="w-full px-4 py-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
              />
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <select
              v-model="sortBy"
              class="px-4 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>
            <button
              @click="toggleSortOrder"
              class="p-2 text-gray-500 border border-gray-300 rounded-lg dark:text-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                :class="{ 'rotate-180': sortOrder === 'desc' }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex h-64 items-center justify-center">
        <div class="text-center">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p class="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>

      <div v-else-if="error"
        class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
        <div class="flex items-center">
          <span class="sr-only">Error</span>
          <div>{{ error }}</div>
        </div>
      </div>

      <div v-else-if="repositories.length === 0" class="text-center py-12">
        <div class="flex flex-col items-center justify-center">
          <p class="text-lg font-semibold text-gray-900 dark:text-white">No repositories found</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Get started by creating a new repository</p>
        </div>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <RepositoryCard v-for="repo in repositories" :key="repo.id" :repository="repo" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGitlabStore } from '@/stores/gitlab.store'
import { useGithubStore } from '@/stores/github.store'
import { useAzureStore } from '@/stores/azure.store'
import { usePinnedStore } from '@/stores/pinned.store'
import RepositoryCard from '@/components/RepositoryCard.vue'
import type { Repository as GitLabRepository } from '@/types/gitlab'
import type { Repository as GitHubRepository } from '@/types/github'
import type { Repository as AzureRepository } from '@/types/azure'

// Initialize stores early to ensure services are available
const gitlabStore = useGitlabStore()
const githubStore = useGithubStore()
const azureStore = useAzureStore()
const pinnedStore = usePinnedStore()
const router = useRouter()

const loading = computed(() => gitlabStore.loading || githubStore.loading || azureStore.loading)
const error = computed(() => gitlabStore.error || githubStore.error || azureStore.error)

const searchQuery = ref('')
const sortBy = ref('date')
const sortOrder = ref('desc')

const loggingOut = ref(false)

const handleLogout = async (type: 'gitlab' | 'github' | 'azure') => {
  try {
    loggingOut.value = true

    if (type === 'gitlab') await gitlabStore.logout()
    else if (type === 'github') await githubStore.logout()
    else if (type === 'azure') await azureStore.logout()

    // If no providers are authenticated, redirect to login
    if (!gitlabStore.auth.isAuthenticated && !githubStore.auth.isAuthenticated && !azureStore.auth.isAuthenticated) {
      await router.push('/login')
    }
  } catch (error) {
    console.error(`Error logging out from ${type}:`, error)
  } finally {
    loggingOut.value = false
  }
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

const repositories = computed(() => {
  const allRepos = [...gitlabStore.repositories, ...githubStore.repositories, ...azureStore.repositories]
  
  // Filter by search query
  const filteredRepos = searchQuery.value
    ? allRepos.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (repo.description?.toLowerCase() || '').includes(searchQuery.value.toLowerCase())
      )
    : allRepos

  // Sort repositories
  const sortedRepos = filteredRepos.sort((a, b) => {
    let comparison = 0
    if (sortBy.value === 'date') {
      const dateA = new Date(a.last_activity_at || a.updated_at || a.lastCommitDate)
      const dateB = new Date(b.last_activity_at || b.updated_at || b.lastCommitDate)
      comparison = dateB.getTime() - dateA.getTime()
    } else if (sortBy.value === 'name') {
      comparison = a.name.localeCompare(b.name)
    }
    return sortOrder.value === 'asc' ? comparison * -1 : comparison
  })

  // Move pinned repositories to the top
  return sortedRepos.sort((a, b) => {
    const aIsPinned = pinnedStore.isPinned(a.id?.toString() || '', getRepoType(a))
    const bIsPinned = pinnedStore.isPinned(b.id?.toString() || '', getRepoType(b))
    return bIsPinned ? 1 : aIsPinned ? -1 : 0
  })
})

type AllRepository = GitLabRepository | GitHubRepository | AzureRepository

const getRepoType = (repo: AllRepository) => {
  if ('web_url' in repo && 'star_count' in repo) return 'gitlab'
  if ('project' in repo && 'stats' in repo) return 'azure'
  return 'github'
}

const handleRememberPinsChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  pinnedStore.toggleRememberPins(target.checked)
}



onMounted(async () => {
  // Validate tokens first
  const validationTasks = []
  let hasValidAuth = false

  if (gitlabStore.auth.isAuthenticated) {
    validationTasks.push(
      gitlabStore.service.validateToken().then(isValid => {
        if (!isValid) gitlabStore.logout()
        else hasValidAuth = true
      })
    )
  }

  if (githubStore.auth.isAuthenticated) {
    validationTasks.push(
      githubStore.service.validateToken().then(isValid => {
        if (!isValid) githubStore.logout()
        else hasValidAuth = true
      })
    )
  }

  if (azureStore.auth.isAuthenticated) {
    validationTasks.push(
      azureStore.service.validateToken().then(isValid => {
        if (!isValid) azureStore.logout()
        else hasValidAuth = true
      })
    )
  }

  // Wait for all validations
  await Promise.all(validationTasks)

  // If no valid auth, redirect to login
  if (!hasValidAuth) {
    router.push('/login')
    return
  }

  // Fetch repositories from valid providers
  const fetchTasks = []
  if (gitlabStore.auth.isAuthenticated) fetchTasks.push(gitlabStore.fetchRepositories())
  if (githubStore.auth.isAuthenticated) fetchTasks.push(githubStore.fetchRepositories())
  if (azureStore.auth.isAuthenticated) fetchTasks.push(azureStore.fetchRepositories())

  try {
    await Promise.all(fetchTasks)
  } catch (error) {
    console.error('Error fetching repositories:', error)
  }
})

</script>
