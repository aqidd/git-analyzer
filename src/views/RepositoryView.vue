<!-- 
  Updated: Repository view with healthcheck dashboard and paginated details
  - Added health metrics section with popup descriptions
  - Combined all details into paginated tabs
  - Improved code organization and readability
  - Added reusable HealthMetricCard component
-->
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

      <!-- Back Button -->
      <div class="mb-8">
        <button
          @click="$router.push('/')"
          class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to Repository List
        </button>
      </div>

      <!-- Date Filter -->
      <div class="mb-8 flex gap-4">
        <input type="date" v-model="timeFilter.startDate"
          class="rounded-md border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800" />
        <input type="date" v-model="timeFilter.endDate"
          class="rounded-md border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800" />
        <button @click="loadData" class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Apply Filter
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex h-64 items-center justify-center">
        <div class="text-center">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p class="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>

      <div v-if="!loading" class="space-y-8">

        <!-- Repository Health Analysis -->
        <section class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Repository Health Analysis</h2>
            <button @click="showMetricsInfo = true"
              class="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              View Metrics Info
            </button>
          </div>

          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Row 1 Commit Stats -->
            <!-- 1. Code Activity Score -->
            <HealthMetricCard
              title="Code Activity"
              :status="commitStats.dailyCommitRate >= 1 ? 'Active' : 'Low Activity'"
              :value="commitStats.dailyCommitRate.toFixed(1)"
              unit="commits/day"
              :isHealthy="commitStats.dailyCommitRate >= 1"
            />
            <!-- 2. Number of detailed commit -->
             <HealthMetricCard
              title="Detailed Commits"
              :status="commitStats.commitWithLongDescription > 0 ? 'Active' : 'Low Activity'"
              :value="commitStats.commitWithLongDescription"
              unit="commits with long description"
              :isHealthy="commitStats.commitWithLongDescription > 0"
            />
            <!-- 3. Code Churn -->
            <HealthMetricCard
              title="Code Growth"
              :status="codeRatioTrend"
              :value="commitStats.addRemoveRatio === Infinity ? '∞' : commitStats.addRemoveRatio.toFixed(1)"
              unit="code added ratio"
              :isHealthy="commitStats.addRemoveRatio >= 0.5 && commitStats.addRemoveRatio <= 2"
            />
            <div class="mb-6"></div>

            <!-- Row 2 Pipeline Stats -->
            <HealthMetricCard
              title="Successful Builds"
              :status="pipelineStats.successfulPipelines > 0 ? 'Good' : 'No Pipelines'"
              :value="pipelineStats.successfulPipelines"
              unit="pipelines"
              :isHealthy="pipelineStats.successfulPipelines > 0"
            />
            <HealthMetricCard
              title="Failed Builds"
              :status="pipelineStats.failedPipelines === 0 ? 'Perfect' : 'Has Failures'"
              :value="pipelineStats.failedPipelines"
              unit="pipelines"
              :isHealthy="pipelineStats.failedPipelines === 0"
            />
            <HealthMetricCard
              title="Build Success Rate"
              :status="pipelineStats.successRate >= 80 ? 'Good' : 'Moderate'"
              :value="`${pipelineStats.successRate.toFixed(1)}%`"
              unit="percentage of build success"
              :isHealthy="pipelineStats.successRate >= 80"
            />
            <!-- Pipeline Health Score -->
            <HealthMetricCard
              title="Pipeline Health"
              :status="`${pipelineStats.successRate.toFixed(0)}% Success`"
              :value="pipelineStats.deploymentFrequency.toFixed(1)"
              unit="deployments/day"
              :isHealthy="pipelineStats.successRate >= 80"
            />

            <!-- Contributor Stats -->
            <HealthMetricCard
              title="Bus Factor"
              :status="contributorStats.busFactor > 2 ? 'Healthy' : 'At Risk'"
              :value="contributorStats.busFactor"
              unit="contributors"
              :isHealthy="contributorStats.busFactor > 2"
            />
            <HealthMetricCard
              title="Top Contributor"
              :status="`${Math.round(contributorStats.totalCommits * (contributorStats.topContributorPercentage / 100))} commits`"
              :value="contributorStats.topContributor.substring(0, 14) + '...'"
              :unit="`${contributorStats.topContributorPercentage.toFixed(2)}% of Commits`"
              :isHealthy="contributorStats.giniCoefficient < 0.4"
            />
            <HealthMetricCard
              title="Commit Distribution"
              :status="contributorStats.giniCoefficient < 0.4 ? 'Healthy' : 'At Risk'"
              :value="contributorStats.giniCoefficient.toFixed(2)"
              unit="Gini Coefficient"
              :isHealthy="contributorStats.giniCoefficient < 0.4"
            />
            <div class="mb-6"></div>

            <!-- Branch Stats -->
            <HealthMetricCard
              title="Branch Health"
              :status="branchStats?.branchHealth"
              :value="`${branchStats?.healthyBranchCount} / ${branchStats?.totalBranches}`"
              unit="healthy branches"
              :isHealthy="(branchStats?.healthyBranchCount / branchStats?.totalBranches) > 0.7"
            />

            <HealthMetricCard
              title="Stagnant Branches"
              :status="(branchStats?.stagnantBranchCount / branches.length) <= 0.3 ? 'Healthy' : 'Needs Cleanup'"
              :value="branchStats?.stagnantBranchCount || 0"
              unit="Inactive >30 days"
              :isHealthy="(branchStats?.stagnantBranchCount / branches.length) <= 0.3"
            />

            <!-- Branch Health Score -->
            <HealthMetricCard
              title="Branch Health"
              :status="(branchStats?.stagnantBranchCount / branches.length) <= 0.3 ? 'Healthy' : 'Needs Cleanup'"
              :value="branchStats?.stagnantBranchCount || 0"
              unit="stagnant branches"
              :isHealthy="(branchStats?.stagnantBranchCount / branches.length) <= 0.3"
            />            

            <!-- Stagnant Branches List -->
            <div v-if="branchStats?.stagnantBranches.length" class="mb-6 col-span-full">
              <h3 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Stagnant Branches</h3>
              <div class="space-y-2">
                <div v-for="branch in branchStats.stagnantBranches" :key="branch.name"
                  class="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                  <span class="font-medium text-gray-900 dark:text-white">{{ branch.name }}</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400">{{ branch.daysSinceLastCommit }} days
                    old</span>
                </div>
              </div>
            </div>
          </div>

        </section>

        <!-- Repository Details -->
        <section class="rounded-lg bg-white shadow dark:bg-gray-800">
          <PaginatedDetails 
            :commits="commits" 
            :branches="branches" 
            :pipelines="pipelines"
            :contributors="contributors" 
            :pull-requests="pullRequests" 
          />
        </section>
      </div>

    </div>
  </div>

  <!-- Health Metrics Info Dialog -->
  <TransitionRoot appear :show="showMetricsInfo" as="template">
    <Dialog as="div" @close="showMetricsInfo = false" class="relative z-10">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/25 dark:bg-black/40" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95">
            <DialogPanel
              class="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                Repository Health Metrics
              </DialogTitle>
              <div class="mt-4 space-y-4">
                <div v-for="metric in healthMetrics" :key="metric.name"
                  class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                  <div class="flex items-center justify-between">
                    <h4 class="font-medium text-gray-900 dark:text-white">{{ metric.name }}</h4>
                    <span :class="[
                      'px-2 py-1 text-xs font-medium rounded-full',
                      metric.implementation.startsWith('✓')
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : metric.implementation.startsWith('⚠')
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    ]">
                      {{ metric.implementation.split(' ')[0] }} <!-- Show just the status icon -->
                    </span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ metric.description }}</p>
                  
                  <!-- Implementation Details -->
                  <div class="mt-3 rounded bg-gray-100 p-3 dark:bg-gray-600">
                    <p class="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                      {{ metric.implementation.split('\n').slice(1).join('\n') }} <!-- Show implementation details without status -->
                    </p>
                  </div>

                  <!-- Good/Bad Criteria -->
                  <div class="mt-3 grid grid-cols-2 gap-3">
                    <div class="rounded bg-green-50 p-2 dark:bg-green-900/30">
                      <span class="text-xs font-medium text-green-700 dark:text-green-300">Good Criteria</span>
                      <p class="mt-1 text-sm text-green-600 dark:text-green-200">{{ metric.good }}</p>
                    </div>
                    <div class="rounded bg-red-50 p-2 dark:bg-red-900/30">
                      <span class="text-xs font-medium text-red-700 dark:text-red-300">Bad Criteria</span>
                      <p class="mt-1 text-sm text-red-600 dark:text-red-200">{{ metric.bad }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex justify-end">
                <button type="button"
                  class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
                  @click="showMetricsInfo = false">
                  <span class="mr-2">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useGitlabStore } from '@/stores/gitlab.store'
import { useGithubStore } from '@/stores/github.store'
import { useAzureStore } from '@/stores/azure.store'
import { Analyzer } from '@/services/analyzer'
import HealthMetricCard from '@/components/HealthMetricCard.vue'
import PaginatedDetails from '@/components/PaginatedDetails.vue'
import type { TimeFilter, Commit, Pipeline, Contributor, RepositoryFile, Branch, PullRequest } from '@/types/repository'
import type { Repository as GitLabRepository } from '@/types/gitlab'
import type { Repository as GitHubRepository } from '@/types/github'
import type { Repository as AzureRepository } from '@/types/azure'

type Repository = GitLabRepository | GitHubRepository | AzureRepository

const route = useRoute()
const router = useRouter()
const gitlabStore = useGitlabStore()
const githubStore = useGithubStore()
const azureStore = useAzureStore()

// State refs
const error = ref<string | null>(null)
const loading = ref(false)
const showMetricsInfo = ref(false)
const repository = ref<Repository | null>(null)
const commits = ref<Commit[]>([])
const pipelines = ref<Pipeline[]>([])
const pullRequests = ref<PullRequest[]>([])
const contributors = ref<Contributor[]>([])
const files = ref<RepositoryFile[]>([])
const branches = ref<Branch[]>([])
const branchStats = ref<any>(null)

/**
 * Health metrics configuration and thresholds.
 * Each metric corresponds to one or more HealthMetricCard components in the UI.
 * Current Implementation Status:
 * ✓ - Fully Implemented
 * ⚠ - Partially Implemented
 * ⨯ - Not Yet Implemented
 */
const healthMetrics = [
  {
    name: 'Code Activity',
    description: 'Measures the frequency and consistency of code changes in the repository.',
    implementation: '✓ Implemented via commitStats with three metrics:\n- Daily commit rate (commits/day)\n- Detailed commits count\n- Code growth ratio',
    good: 'Daily commit rate ≥1, has detailed commits, code growth ratio between 0.5-2',
    bad: 'Daily commit rate <1, no detailed commits, or unbalanced code growth'
  },
  {
    name: 'Pipeline Health',
    description: 'Assesses CI/CD pipeline efficiency and reliability.',
    implementation: '✓ Implemented via pipelineStats with four metrics:\n- Successful builds count\n- Failed builds count\n- Build success rate (%)\n- Deployment frequency',
    good: 'Success rate ≥80%, has successful builds, deployment frequency >0',
    bad: 'Success rate <80%, has failed builds, or no deployments'
  },
  {
    name: 'Team Health',
    description: 'Analyzes work distribution and collaboration patterns.',
    implementation: '✓ Implemented via contributorStats with three metrics:\n- Bus factor (>2 is healthy)\n- Top contributor percentage\n- Gini coefficient (<0.4 is healthy)',
    good: 'Bus factor >2, balanced contributions (Gini <0.4)',
    bad: 'Bus factor ≤2, or concentrated contributions (Gini ≥0.4)'
  },
  {
    name: 'Branch Health',
    description: 'Evaluates branch management and maintenance.',
    implementation: '✓ Implemented via branchStats with metrics:\n- Healthy vs total branches ratio\n- Stagnant branch count\n- Days since last commit per branch',
    good: 'Stagnant branches ≤30% of total, regular merges to main',
    bad: 'Stagnant branches >30% of total, inactive branches >30 days'
  },
  {
    name: 'Code Quality',
    description: 'Evaluates code maintainability and test coverage.',
    implementation: '⨯ Not yet implemented. Planned metrics:\n- Test coverage percentage\n- Cyclomatic complexity\n- Code duplication percentage\n- Style violations count',
    good: 'Test coverage >80%, complexity <10, duplication <5%',
    bad: 'Test coverage <80%, complexity >10, duplication >5%'
  },
  {
    name: 'PR Velocity',
    description: 'Measures pull request workflow efficiency.',
    implementation: '⨯ Not yet implemented. Planned metrics:\n- Average review time\n- Merge success rate\n- PR size distribution\n- Review participation rate',
    good: 'Review time <24h, merge rate >90%, PRs <400 lines',
    bad: 'Review time >24h, merge rate <90%, PRs >400 lines'
  },
  {
    name: 'Documentation Health',
    description: 'Assesses documentation quality and currency.',
    implementation: '⨯ Not yet implemented. Planned metrics:\n- README freshness\n- API documentation coverage\n- Inline documentation ratio\n- Documentation update frequency',
    good: 'Current docs, clear guidelines, regular updates',
    bad: 'Outdated docs, missing guidelines, infrequent updates'
  },
  {
    name: 'Security Health',
    description: 'Evaluates repository security measures.',
    implementation: '⨯ Not yet implemented. Planned metrics:\n- Vulnerability count\n- Average remediation time\n- Dependency freshness\n- Security policy compliance',
    good: 'No critical vulnerabilities, quick fixes, current deps',
    bad: 'Open vulnerabilities, slow fixes, outdated deps'
  }
]

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

// Updated: Added pull requests fetching
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
      pullRequests.value = await gitlabStore.service.getPullRequests(projectId, timeFilter.value)
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
      pullRequests.value = await githubStore.service.getPullRequests(owner, repo, timeFilter.value)
      branchStats.value = analyzer.analyzeBranches(branches.value)
    } else if (type === 'azure') {
      if (!azureStore.auth.isAuthenticated) {
        throw new Error('Azure DevOps service not initialized. Please log in again.')
      }
      repository.value = azureStore.repositories.find(repo => repo.id === id) || null
      if (!repository.value) {
        console.log(id)
        console.log(azureStore.repositories)
        throw new Error('Repository not found')
      }
      const projectId = repository.value.project.id
      commits.value = await azureStore.service.getCommits(projectId, id, timeFilter.value)
      pipelines.value = await azureStore.service.getPipelines(projectId, id, timeFilter.value)
      contributors.value = await azureStore.service.getContributors(projectId, id)
      files.value = await azureStore.service.getFiles(projectId, id)
      branches.value = await azureStore.service.getBranches(projectId, id)
      pullRequests.value = await azureStore.service.getPullRequests(projectId, id, timeFilter.value)
      branchStats.value = analyzer.analyzeBranches(branches.value)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load repository data'
    commits.value = []
    pipelines.value = []
    contributors.value = []
    files.value = []
    pullRequests.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // Check if any provider is authenticated
  if (!gitlabStore.auth.isAuthenticated && !githubStore.auth.isAuthenticated && !azureStore.auth.isAuthenticated) {
    router.push('/login')
    return
  }

  await loadData()
})
</script>
