<template>
  <div class="p-4 bg-gray-50 sm:ml-64 min-h-screen dark:bg-gray-900">
    <div class="p-4 rounded-lg">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Your Repositories</h1>
        <div class="flex gap-2">
          <button
            v-if="gitlabStore.auth.isAuthenticated"
            @click="gitlabStore.logout()"
            class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-[#FC6D26] hover:bg-[#E24329] focus:ring-4 focus:ring-[#FC6D26]/50"
          >
            Logout GitLab
          </button>
          <button
            v-if="githubStore.auth.isAuthenticated"
            @click="githubStore.logout()"
            class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-[#2DA44E] hover:bg-[#2C974B] focus:ring-4 focus:ring-[#2DA44E]/50"
          >
            Logout GitHub
          </button>
          <button
            v-if="azureStore.auth.isAuthenticated"
            @click="azureStore.logout()"
            class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-[#0078D4] hover:bg-[#106EBE] focus:ring-4 focus:ring-[#0078D4]/50"
          >
            Logout Azure
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center items-center h-64">
        <div role="status" class="flex items-center justify-center">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" class="animate-spin">
            <path stroke="#0A0A30" stroke-linecap="round" stroke-width="1.5" d="M12 6.864v1.333m0 7.606v1.333M17.136 12h-1.333m-7.606 0H6.864m8.768 3.632l-.943-.943M9.311 9.311l-.943-.943m0 7.264l.943-.943m5.378-5.378l.943-.943" style="animation:loader4 1.5s linear infinite both;transform-origin:center center"/>
          </svg>
          <span class="sr-only">Loading...</span>
        </div>
      </div>

      <div v-else-if="error" class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
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
        <RepositoryCard
          v-for="repo in repositories"
          :key="repo.id"
          :repository="repo"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGitlabStore } from '@/stores/gitlab'
import { useGithubStore } from '@/stores/github'
import { useAzureStore } from '@/stores/azure'
import RepositoryCard from '@/components/RepositoryCard.vue'
import type { Repository as GitLabRepository } from '@/types/gitlab'
import type { Repository as GitHubRepository } from '@/types/github'
import type { Repository as AzureRepository } from '@/types/azure'

const router = useRouter()
const gitlabStore = useGitlabStore()
const githubStore = useGithubStore()
const azureStore = useAzureStore()

const loading = computed(() => gitlabStore.loading || githubStore.loading || azureStore.loading)
const error = computed(() => gitlabStore.error || githubStore.error || azureStore.error)

const repositories = computed(() => {
  const allRepos = [...gitlabStore.repositories, ...githubStore.repositories, ...azureStore.repositories]
  return allRepos.sort((a, b) => {
    const dateA = new Date(a.last_activity_at || a.updated_at || a.lastCommitDate)
    const dateB = new Date(b.last_activity_at || b.updated_at || b.lastCommitDate)
    return dateB.getTime() - dateA.getTime()
  })
})

type AllRepository = GitLabRepository | GitHubRepository | AzureRepository



onMounted(() => {
  if (!gitlabStore.auth.isAuthenticated && !githubStore.auth.isAuthenticated && !azureStore.auth.isAuthenticated) {
    router.push('/login')
    return
  }

  if (gitlabStore.auth.isAuthenticated) {
    gitlabStore.fetchRepositories()
  }

  if (githubStore.auth.isAuthenticated) {
    githubStore.fetchRepositories()
  }

  if (azureStore.auth.isAuthenticated) {
    azureStore.fetchRepositories()
  }
})
</script>
