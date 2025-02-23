<template>
  <div class="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Repository Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ repository?.name }}</h1>
        <p class="text-gray-500 dark:text-gray-400">{{ repository?.description }}</p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-8 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex h-64 items-center justify-center">
        <div class="text-center">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p class="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>

      <!-- Date Filter -->
      <div class="mb-8 flex gap-4">
        <input
          type="date"
          v-model="timeFilter.startDate"
          class="rounded-md border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
        <input
          type="date"
          v-model="timeFilter.endDate"
          class="rounded-md border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          @click="loadData"
          class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Apply Filter
        </button>
      </div>

      <div v-if="!loading" class="grid gap-6 lg:grid-cols-2">
        <!-- Commits Section -->
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Commits</h2>
          <div class="space-y-4">
            <div v-for="commit in commits" :key="commit.id" class="border-b pb-4 last:border-0">
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ commit.message }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ commit.author_name }} on {{ new Date(commit.created_at).toLocaleDateString() }}
                  </p>
                </div>
                <a
                  :href="commit.web_url || commit.html_url"
                  target="_blank"
                  class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  View
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Pipelines Section -->
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Pipelines</h2>
          <div class="space-y-4">
            <div v-for="pipeline in pipelines" :key="pipeline.id" class="border-b pb-4 last:border-0">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ pipeline.ref }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Status: {{ pipeline.status }} | Updated:
                    {{ new Date(pipeline.updated_at).toLocaleDateString() }}
                  </p>
                </div>
                <a
                  :href="pipeline.web_url || pipeline.html_url"
                  target="_blank"
                  class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  View
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Contributors Section -->
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Contributors</h2>
          <div class="space-y-4">
            <div
              v-for="contributor in contributors"
              :key="contributor.id"
              class="flex items-center space-x-4 border-b pb-4 last:border-0"
            >
              <img
                v-if="contributor.avatar_url"
                :src="contributor.avatar_url"
                :alt="contributor.name"
                class="h-10 w-10 rounded-full"
              />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ contributor.name }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ contributor.commits }} commits
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Files Section -->
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Files</h2>
          <div class="space-y-2">
            <div v-for="file in files" :key="file.path" class="border-b pb-2 last:border-0">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ file.path }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ file.type }} | {{ formatSize(file.size) }}
                  </p>
                </div>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ new Date(file.last_modified).toLocaleDateString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGitlabStore } from '@/stores/gitlab'
import { useGithubStore } from '@/stores/github'
import type { TimeFilter, Commit, Pipeline, Contributor, RepositoryFile } from '@/types/repository'
import type { Repository } from '@/types/gitlab'

const route = useRoute()
const gitlabStore = useGitlabStore()
const githubStore = useGithubStore()

const repository = ref<Repository | null>(null)
const commits = ref<Commit[]>([])
const pipelines = ref<Pipeline[]>([])
const contributors = ref<Contributor[]>([])
const files = ref<RepositoryFile[]>([])

const timeFilter = ref<TimeFilter>({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0]
})

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const error = ref<string | null>(null)
const loading = ref(false)

const loadData = async () => {
  const { id, type } = route.params
  error.value = null
  loading.value = true

  try {
    const service = type === 'gitlab' ? gitlabStore.service : githubStore.service
    if (!service) {
      throw new Error(`${type} service not initialized. Please log in again.`)
    }

    if (type === 'gitlab') {
      const projectId = Number(id)
      commits.value = await service.getCommits(projectId, timeFilter.value)
      pipelines.value = await service.getPipelines(projectId, timeFilter.value)
      contributors.value = await service.getContributors(projectId, timeFilter.value)
      files.value = await service.getFiles(projectId)
    } else {
      const [owner, repo] = (id as string).split('/')
      if (!owner || !repo) {
        throw new Error('Invalid repository identifier')
      }
      commits.value = await service.getCommits(owner, repo, timeFilter.value)
      pipelines.value = await service.getPipelines(owner, repo, timeFilter.value)
      contributors.value = await service.getContributors(owner, repo, timeFilter.value)
      files.value = await service.getFiles(owner, repo)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load repository data'
    commits.value = []
    pipelines.value = []
    contributors.value = []
    files.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadData()
})
</script>
