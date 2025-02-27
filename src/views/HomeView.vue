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
        <div role="status">
          Loading...
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
        <div
          v-for="repo in repositories"
          :key="repo.id"
          class="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
        >
          <div class="p-5">
            <div class="flex items-center mb-3">
              <img
                :src="getRepoAvatarUrl(repo)"
                :alt="repo.name"
                class="w-8 h-8 rounded mr-3"
              />
              <h5 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white truncate">
                {{ repo.name }}
              </h5>
            </div>
            <p class="mb-3 font-normal text-gray-500 dark:text-gray-400 line-clamp-2">
              {{ repo.description || 'No description available' }}
            </p>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                  {{ repo.default_branch }}
                </span>
                <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  {{ getRepoStarCount(repo) }}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <a
                  :href="getRepoUrl(repo)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :class="[
                    'inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white rounded-lg focus:ring-4 focus:outline-none',
                    isGitLabRepo(repo) ? 'bg-[#FC6D26] hover:bg-[#E24329] focus:ring-[#FC6D26]/50' : 
                    isAzureRepo(repo) ? 'bg-[#0078D4] hover:bg-[#106EBE] focus:ring-[#0078D4]/50' : 
                    'bg-[#2DA44E] hover:bg-[#2C974B] focus:ring-[#2DA44E]/50'
                  ]"
                >
                  View
                </a>
                <router-link
                  :to="{
                    name: 'repository',
                    params: {
                      type: isGitLabRepo(repo) ? 'gitlab' : isAzureRepo(repo) ? 'azure' : 'github',
                      id: getRepositoryId(repo)
                    }
                  }"
                  class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 focus:ring-4 focus:outline-none focus:ring-indigo-300 dark:bg-gray-800 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-700"
                >
                  Analytics
                </router-link>
              </div>
            </div>
          </div>
        </div>
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

function isGitLabRepo(repo: AllRepository): repo is GitLabRepository {
  return 'web_url' in repo
}

function isAzureRepo(repo: AllRepository): repo is AzureRepository {
  return 'visibility' in repo && !('star_count' in repo) && !('owner' in repo)
}

function getRepoUrl(repo: AllRepository): string {
  if (isGitLabRepo(repo)) return repo.web_url
  if (isAzureRepo(repo)) return repo.url
  return repo.html_url
}

function getRepoAvatarUrl(repo: AllRepository): string {
  if (isGitLabRepo(repo)) {
    return repo.avatar_url || 'https://www.gravatar.com/avatar/?s=80&d=identicon'
  }
  if (isAzureRepo(repo)) {
    return 'https://www.svgrepo.com/show/448307/azure-devops.svg'
  }
  return repo.owner?.avatar_url || 'https://www.gravatar.com/avatar/?s=80&d=identicon'
}

function getRepositoryId(repo: AllRepository): string | number {
  if (isGitLabRepo(repo)) return repo.id
  if (isAzureRepo(repo)) return repo.id
  return `${repo.owner?.login}/${repo.name}`
}

function getRepoStarCount(repo: AllRepository): number {
  if (isGitLabRepo(repo)) return repo.star_count
  if (isAzureRepo(repo)) return 0
  return repo.stargazers_count
}

onMounted(() => {
  console.log('home mounted')
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
