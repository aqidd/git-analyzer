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
          
          <!-- Commit Stats -->
          <div class="mb-6 grid grid-cols-3 gap-4">
            <div class="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900">
              <p class="text-sm text-indigo-600 dark:text-indigo-200">Daily Commit Rate</p>
              <p class="text-2xl font-bold text-indigo-700 dark:text-indigo-100">{{ commitStats.dailyCommitRate.toFixed(1) }}</p>
            </div>
            <div class="rounded-lg bg-purple-50 p-4 dark:bg-purple-900">
              <p class="text-sm text-purple-600 dark:text-purple-200">Detailed Commits</p>
              <p class="text-2xl font-bold text-purple-700 dark:text-purple-100">{{ commitStats.commitWithLongDescription }}</p>
            </div>
            <div :class="[codeRatioColor]">
              <p :class="[codeRatioTextColor]">Code Add:Remove Ratio</p>
              <div class="flex items-center gap-2">
                <p :class="[`text-2xl font-bold`, codeRatioValueColor]">
                  {{ commitStats.addRemoveRatio === Infinity ? '∞' : commitStats.addRemoveRatio.toFixed(1) }}
                </p>
                <span :class="[codeRatioTextColor]">
                  {{ codeRatioTrend }}
                </span>
              </div>
            </div>
          </div>
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
          
          <!-- Pipeline Stats -->
          <div class="mb-6 grid grid-cols-4 gap-4">
            <div class="rounded-lg bg-green-50 p-4 dark:bg-green-900">
              <p class="text-sm text-green-600 dark:text-green-200">Successful</p>
              <p class="text-2xl font-bold text-green-700 dark:text-green-100">{{ pipelineStats.successfulPipelines }}</p>
            </div>
            <div class="rounded-lg bg-red-50 p-4 dark:bg-red-900">
              <p class="text-sm text-red-600 dark:text-red-200">Failed</p>
              <p class="text-2xl font-bold text-red-700 dark:text-red-100">{{ pipelineStats.failedPipelines }}</p>
            </div>
            <div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900">
              <p class="text-sm text-blue-600 dark:text-blue-200">Success Rate</p>
              <p class="text-2xl font-bold text-blue-700 dark:text-blue-100">{{ pipelineStats.successRate.toFixed(1) }}%</p>
            </div>
            <div class="rounded-lg bg-violet-50 p-4 dark:bg-violet-900">
              <p class="text-sm text-violet-600 dark:text-violet-200">Deployments/Day</p>
              <p class="text-2xl font-bold text-violet-700 dark:text-violet-100">{{ pipelineStats.deploymentFrequency.toFixed(1) }}</p>
            </div>
          </div>
          <div class="space-y-4">
            <div v-for="pipeline in pipelines" :key="pipeline.id" class="border-b pb-4 last:border-0">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ pipeline.ref }}</p>
                  <p class="font-medium text-gray-900 dark:text-white">{{ pipeline.name }}</p>
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
          
          <!-- Contributor Stats -->
          <div class="mb-6 grid grid-cols-2 gap-4">
            <div class="rounded-lg bg-amber-50 p-4 dark:bg-amber-900">
              <div class="flex items-center justify-between">
                <p class="text-sm text-amber-600 dark:text-amber-200">Bus Factor</p>
                <span 
                  :class="[
                    'px-2 py-1 text-xs rounded-full',
                    contributorStats.busFactor > 2 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  ]"
                >
                  {{ contributorStats.busFactor > 2 ? 'Healthy' : 'At Risk' }}
                </span>
              </div>
              <p class="text-2xl font-bold text-amber-700 dark:text-amber-100">{{ contributorStats.busFactor }}</p>
            </div>
            <div class="rounded-lg bg-orange-50 p-4 dark:bg-orange-900">
              <div class="flex items-center justify-between">
                <p class="text-sm text-orange-600 dark:text-orange-200">Top Contributor</p>
                <span 
                  :class="[
                    'px-2 py-1 text-xs rounded-full',
                    !contributorStats.imbalanceContribution ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  ]"
                >
                  {{ !contributorStats.imbalanceContribution ? 'Balanced' : 'Imbalanced' }}
                </span>
              </div>
              <p class="text-lg font-bold text-orange-700 dark:text-orange-100 truncate">{{ contributorStats.topContributor }}</p>
              <p class="text-sm text-orange-600 dark:text-orange-200">{{ contributorStats.topContributorPercentage.toFixed(1) }}% of commits</p>
            </div>
          </div>
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

        <!-- Branches Section -->
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Branches</h2>
          
          <!-- Branch Stats -->
          <div class="mb-6 grid grid-cols-2 gap-4">
            <div class="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900">
              <div class="flex items-center justify-between">
                <p class="text-sm text-emerald-600 dark:text-emerald-200">Branch Health</p>
                <span 
                  :class="[
                    'px-2 py-1 text-xs rounded-full',
                    branchStats?.healthyBranchCount / branchStats?.totalBranches > 0.7 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  ]"
                >
                  {{ branchStats?.branchHealth }}
                </span>
              </div>
              <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-100">{{ branchStats?.healthyBranchCount }} / {{ branchStats?.totalBranches }}</p>
              <p class="text-sm text-emerald-600 dark:text-emerald-200">Healthy Branches</p>
            </div>
            <div class="rounded-lg bg-rose-50 p-4 dark:bg-rose-900">
              <p class="text-sm text-rose-600 dark:text-rose-200">Stagnant Branches</p>
              <p class="text-2xl font-bold text-rose-700 dark:text-rose-100">{{ branchStats?.stagnantBranchCount }}</p>
              <p class="text-sm text-rose-600 dark:text-rose-200">Inactive >30 days</p>
            </div>
          </div>

          <!-- Stagnant Branches -->
          <div v-if="branchStats?.stagnantBranches.length" class="mb-6">
            <h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Stagnant Branches</h3>
            <div class="space-y-2">
              <div 
                v-for="branch in branchStats.stagnantBranches" 
                :key="branch.name"
                class="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-700"
              >
                <span class="font-medium text-gray-900 dark:text-white">{{ branch.name }}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ branch.daysSinceLastCommit }} days old</span>
              </div>
            </div>
          </div>

          <!-- All Branches -->
          <div class="space-y-2">
            <div 
              v-for="branch in branches" 
              :key="branch.name"
              class="flex items-center justify-between border-b pb-2 last:border-0"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-white">{{ branch.name }}</span>
                  <span 
                    v-if="branch.protected"
                    class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    Protected
                  </span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Last commit by {{ branch.lastCommitAuthor }} on {{ new Date(branch.lastCommitDate).toLocaleDateString() }}
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
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGitlabStore } from '@/stores/gitlab'
import { useGithubStore } from '@/stores/github'
import { useAzureStore } from '@/stores/azure'
import { Analyzer } from '@/services/analyzer'
import type { TimeFilter, Commit, Pipeline, Contributor, RepositoryFile, Branch } from '@/types/repository'
import type { Repository as GitLabRepository } from '@/types/gitlab'
import type { Repository as GitHubRepository } from '@/types/github'
import type { Repository as AzureRepository } from '@/types/azure'

type Repository = GitLabRepository | GitHubRepository | AzureRepository

const route = useRoute()
const gitlabStore = useGitlabStore()
const githubStore = useGithubStore()
const azureStore = useAzureStore()

const repository = ref<Repository | null>(null)
const commits = ref<Commit[]>([])
const pipelines = ref<Pipeline[]>([])
const contributors = ref<Contributor[]>([])
const files = ref<RepositoryFile[]>([])
const branches = ref<Branch[]>([])
const branchStats = ref<any>(null)

const timeFilter = ref<TimeFilter>({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0]
})

const analyzer = new Analyzer()

const pipelineStats = computed(() => analyzer.analyzePipelines(pipelines.value, timeFilter.value))
const commitStats = computed(() => analyzer.analyzeCommits(commits.value, timeFilter.value))
const contributorStats = computed(() => analyzer.analyzeContributors(contributors.value))

// Code ratio styling
const codeRatioColor = computed(() => {
  const ratio = commitStats.value.addRemoveRatio
  if (ratio === Infinity) return 'rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900'
  if (ratio > 1.5) return 'rounded-lg bg-green-50 p-4 dark:bg-green-900'
  if (ratio >= 0.75) return 'rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900'
  return 'rounded-lg bg-red-50 p-4 dark:bg-red-900'
})

const codeRatioTextColor = computed(() => {
  const ratio = commitStats.value.addRemoveRatio
  if (ratio === Infinity) return 'text-emerald-600 dark:text-emerald-200'
  if (ratio > 1.5) return 'text-green-600 dark:text-green-200'
  if (ratio >= 0.75) return 'text-yellow-600 dark:text-yellow-200'
  return 'text-red-600 dark:text-red-200'
})

const codeRatioValueColor = computed(() => {
  const ratio = commitStats.value.addRemoveRatio
  if (ratio === Infinity) return 'text-emerald-700 dark:text-emerald-100'
  if (ratio > 1.5) return 'text-green-700 dark:text-green-100'
  if (ratio >= 0.75) return 'text-yellow-700 dark:text-yellow-100'
  return 'text-red-700 dark:text-red-100'
})

const codeRatioTrend = computed(() => {
  const ratio = commitStats.value.addRemoveRatio
  if (ratio === Infinity) return '(Growing Fast)'
  if (ratio > 1.5) return '(Growing)'
  if (ratio >= 0.75) return '(Stable)'
  return '(Shrinking)'  
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
    if (type === 'gitlab') {
      if (!gitlabStore.service) {
        throw new Error('GitLab service not initialized. Please log in again.')
      }
      const projectId = Number(id)
      commits.value = await gitlabStore.service.getCommits(projectId, timeFilter.value)
      pipelines.value = await gitlabStore.service.getPipelines(projectId, timeFilter.value)
      contributors.value = await gitlabStore.service.getContributors(projectId, timeFilter.value)
      files.value = await gitlabStore.service.getFiles(projectId)
      branches.value = await gitlabStore.service.getBranches(String(id), String(id))
      branchStats.value = analyzer.analyzeBranches(branches.value)
    } else if (type === 'github') {
      if (!githubStore.service) {
        throw new Error('GitHub service not initialized. Please log in again.')
      }
      const [owner, repo] = (id as string).split('/')
      if (!owner || !repo) {
        throw new Error('Invalid repository identifier')
      }
      commits.value = await githubStore.service.getCommits(owner, repo, timeFilter.value)
      pipelines.value = await githubStore.service.getPipelines(owner, repo, timeFilter.value)
      contributors.value = await githubStore.service.getContributors(owner, repo, timeFilter.value)
      files.value = await githubStore.service.getFiles(owner, repo)
      branches.value = await githubStore.service.getBranches(owner, repo)
      branchStats.value = analyzer.analyzeBranches(branches.value)
    } else if (type === 'azure') {
      if (!azureStore.auth.isAuthenticated) {
        throw new Error('Azure DevOps service not initialized. Please log in again.')
      }
      repository.value = azureStore.repositories.find(repo => repo.id === id) || null
      if (!repository.value) {
        throw new Error('Repository not found')
      }
      const projectId = repository.value.project.id
      commits.value = await azureStore.service.getCommits(projectId, id, timeFilter.value)
      pipelines.value = await azureStore.service.getPipelines(projectId, id, timeFilter.value)
      contributors.value = await azureStore.service.getContributors(projectId, id)
      files.value = await azureStore.service.getFiles(projectId, id)
      branches.value = await azureStore.service.getBranches(projectId, id)
      branchStats.value = analyzer.analyzeBranches(branches.value)
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
