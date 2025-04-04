<!-- 
  Updated: Repository view with healthcheck dashboard, paginated details, and contributor filtering
  - Added health metrics section with popup descriptions
  - Combined all details into paginated tabs
  - Improved code organization and readability
  - Added reusable HealthMetricCard component
  - Added contributor filtering with proper type handling for different author formats
  - Combined contributors with same name into single filter option
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

      <!-- Filters -->
      <div class="mb-8 space-y-4">
        <!-- Date Filter -->
        <div class="flex gap-4">
          <input type="date" v-model="timeFilter.startDate"
            class="rounded-md border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800" />
          <input type="date" v-model="timeFilter.endDate"
            class="rounded-md border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800" />
        </div>
        <!-- Contributor Filter -->
        <div class="flex gap-4">
          <select v-model="selectedContributor"
            class="rounded-md border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
            <option value="">All Contributors</option>
            <option v-for="contributor in uniqueContributors" :key="contributor" :value="contributor">
              {{ contributor }}
            </option>
          </select>
          <button @click="loadData" 
            class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Apply Filters
          </button>
        </div>
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
          </div>

          <AccordionWrapper
            :sections="[
              {
                title: `Commit Stats`,
                overview: `Daily Commit Rate: ${commitStats.dailyCommitRate.toFixed(1)} commits/day`,
                metrics: [
                  {
                    title: 'Code Activity',
                    status: commitStats.dailyCommitRate >= 1 ? 'Active' : 'Low Activity',
                    value: commitStats.dailyCommitRate.toFixed(1),
                    unit: 'commits/day',
                    isHealthy: commitStats.dailyCommitRate >= 1,
                    description: 'Measures the frequency and consistency of code changes in the repository.'
                  },
                  {
                    title: 'Detailed Commits',
                    status: commitStats.commitWithLongDescription > 0 ? 'Active' : 'Low Activity',
                    value: commitStats.commitWithLongDescription,
                    unit: 'commits with long description',
                    isHealthy: commitStats.commitWithLongDescription > 0,
                    description: 'Tracks the number of commits with detailed descriptions.'
                  },
                  {
                    title: 'Code Growth',
                    status: codeRatioTrend,
                    value: commitStats.addRemoveRatio === Infinity ? '∞' : commitStats.addRemoveRatio.toFixed(1),
                    unit: 'code added ratio',
                    isHealthy: commitStats.addRemoveRatio >= 0.5 && commitStats.addRemoveRatio <= 2,
                    description: 'Evaluates the balance between code additions and removals.'
                  }
                ]
              },
              {
                title: `Pipeline Stats`,
                overview: `Success Rate: ${pipelineStats.successRate.toFixed(1)}%, Deployments: ${pipelineStats.deploymentFrequency.toFixed(1)}/day`,
                metrics: [
                  {
                    title: 'Successful Builds',
                    status: pipelineStats.successfulPipelines > 0 ? 'Good' : 'No Pipelines',
                    value: pipelineStats.successfulPipelines,
                    unit: 'pipelines',
                    isHealthy: pipelineStats.successfulPipelines > 0,
                    description: 'Counts the number of successful CI/CD pipeline builds.'
                  },
                  {
                    title: 'Failed Builds',
                    status: pipelineStats.failedPipelines === 0 ? 'Perfect' : 'Has Failures',
                    value: pipelineStats.failedPipelines,
                    unit: 'pipelines',
                    isHealthy: pipelineStats.failedPipelines === 0,
                    description: 'Tracks the number of failed CI/CD pipeline builds.'
                  },
                  {
                    title: 'Build Success Rate',
                    status: pipelineStats.successRate >= 80 ? 'Good' : 'Moderate',
                    value: `${pipelineStats.successRate.toFixed(1)}%`,
                    unit: 'percentage of build success',
                    isHealthy: pipelineStats.successRate >= 80,
                    description: 'Measures the percentage of successful builds in the CI/CD pipeline.'
                  },
                  {
                    title: 'Pipeline Health',
                    status: `${pipelineStats.successRate.toFixed(0)}% Success`,
                    value: pipelineStats.deploymentFrequency.toFixed(1),
                    unit: 'deployments/day',
                    isHealthy: pipelineStats.successRate >= 80,
                    description: 'Evaluates the frequency and reliability of deployments.'
                  }
                ]
              },
              {
                title: `Contributor Stats`,
                overview: `Bus Factor: ${contributorStats.busFactor}, Top Contributor: ${contributorStats.topContributor.substring(0, 14)}...`,
                metrics: [
                  {
                    title: 'Bus Factor',
                    status: contributorStats.busFactor > 2 ? 'Healthy' : 'At Risk',
                    value: contributorStats.busFactor,
                    unit: 'contributors',
                    isHealthy: contributorStats.busFactor > 2,
                    description: 'Assesses the risk of knowledge concentration among contributors.'
                  },
                  {
                    title: 'Top Contributor',
                    status: `${Math.round(contributorStats.totalCommits * (contributorStats.topContributorPercentage / 100))} commits`,
                    value: contributorStats.topContributor.substring(0, 14) + '...',
                    unit: `${contributorStats.topContributorPercentage.toFixed(2)}% of Commits`,
                    isHealthy: contributorStats.giniCoefficient < 0.4,
                    description: 'Identifies the contributor with the highest number of commits.'
                  },
                  {
                    title: 'Commit Distribution',
                    status: contributorStats.giniCoefficient < 0.4 ? 'Healthy' : 'At Risk',
                    value: contributorStats.giniCoefficient.toFixed(2),
                    unit: 'Gini Coefficient',
                    isHealthy: contributorStats.giniCoefficient < 0.4,
                    description: 'Analyzes the distribution of commits among contributors.'
                  }
                ]
              },
              {
                title: `Branch Stats`,
                overview: `Healthy Branches: ${branchStats?.healthyBranchCount || 0}/${branchStats?.totalBranches || 0}, Stagnant Branches: ${branchStats?.stagnantBranchCount || 0}`,
                metrics: [
                  {
                    title: 'Branch Health',
                    status: branchStats?.branchHealth || 'Unknown',
                    value: branchStats?.healthyBranchCount !== undefined && branchStats?.totalBranches !== undefined
                      ? `${branchStats.healthyBranchCount} / ${branchStats.totalBranches}`
                      : 'N/A',
                    unit: 'healthy branches',
                    isHealthy: branchStats?.healthyBranchCount !== undefined && branchStats?.totalBranches !== undefined
                      ? (branchStats.healthyBranchCount / branchStats.totalBranches) > 0.7
                      : false,
                    description: 'Evaluates the health of branches based on activity and merges.'
                  },
                  {
                    title: 'Stagnant Branches',
                    status: branchStats?.stagnantBranchCount !== undefined && branches.length > 0
                      ? (branchStats.stagnantBranchCount / branches.length) <= 0.3
                        ? 'Healthy'
                        : 'Needs Cleanup'
                      : 'Unknown',
                    value: branchStats?.stagnantBranchCount || 0,
                    unit: 'Inactive >30 days',
                    isHealthy: branchStats?.stagnantBranchCount !== undefined && branches.length > 0
                      ? (branchStats.stagnantBranchCount / branches.length) <= 0.3
                      : false,
                    description: 'Tracks the number of branches inactive for over 30 days.'
                  }
                ]
              },
              {
                title: `Pull Request Stats`,
                overview: `Total PRs: ${pullRequestStats?.totalPRs || 0}, Average PRs/day: ${(pullRequestStats?.averagePRPerDay || 0).toFixed(1)}`,
                metrics: [
                  {
                    title: 'Total Pull Requests',
                    status: pullRequestStats?.totalPRs > 0 ? 'Active' : 'No PRs',
                    value: pullRequestStats?.totalPRs || 0,
                    unit: 'pull requests',
                    isHealthy: pullRequestStats?.totalPRs > 0,
                    description: 'Counts the total number of pull requests in the repository.'
                  },
                  {
                    title: 'PR Frequency',
                    status: pullRequestStats?.averagePRPerDay >= 2 ? 'Active' : 'Low Activity',
                    value: (pullRequestStats?.averagePRPerDay || 0).toFixed(1),
                    unit: 'PRs/day',
                    isHealthy: pullRequestStats?.averagePRPerDay >= 2,
                    description: 'Measures the average number of pull requests per day.'
                  },
                  {
                    title: 'Top PR Contributor',
                    status: pullRequestStats?.topContributor ? 'Active' : 'No Data',
                    value: (pullRequestStats?.topContributor || '').substring(0, 14) + '...',
                    unit: `${(pullRequestStats?.topContributorPRs || 0)} PRs`,
                    isHealthy: pullRequestStats?.topContributor !== '',
                    description: 'Identifies the contributor with the highest number of pull requests.'
                  },
                  {
                    title: 'Top Contributor Rate',
                    status: pullRequestStats?.topContributorAvgPRPerDay >= 1 ? 'Active' : 'Low Activity',
                    value: (pullRequestStats?.topContributorAvgPRPerDay || 0).toFixed(1),
                    unit: 'PRs/day',
                    isHealthy: pullRequestStats?.topContributorAvgPRPerDay >= 1,
                    description: 'Measures the average pull request rate of the top contributor.'
                  },
                  {
                    title: 'Average LoC per PR',
                    status: pullRequestStats?.averageLoCPerPR < 300 ? 'Healthy' : 'Needs Improvement',
                    value: (pullRequestStats?.averageLoCPerPR || 0).toFixed(1),
                    unit: 'lines/PR',
                    isHealthy: pullRequestStats?.averageLoCPerPR < 300,
                    description: 'Evaluates the average lines of code per pull request.'
                  }
                ]
              }
            ]"
            @show-metric-info="showMetricInfo"
          />
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

  <!-- Metric Info Dialog -->
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
                {{ selectedMetric?.title }}
              </DialogTitle>
              <div class="mt-4 space-y-4">
                <ul class="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
                  <li v-for="(description, index) in selectedMetric?.description" :key="index">
                    <strong>{{ description.title  }}</strong>: {{ description.description }}
                  </li>
                </ul>
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
import { Analyzer } from '@/services/analyzer.service'
import PaginatedDetails from '@/components/PaginatedDetails.vue'
import AccordionWrapper from '@/components/AccordionWrapper.vue'
import type { TimeFilter, Commit, Pipeline, Contributor, Branch, PullRequest } from '@/types/repository'

// Define props for the component
defineProps<{
  type: string;
  id: string;
}>()

const route = useRoute()
const router = useRouter()
const gitlabStore = useGitlabStore()
const githubStore = useGithubStore()
const azureStore = useAzureStore()

// State refs
const error = ref<string | null>(null)
const loading = ref(false)
const showMetricsInfo = ref(false)
const selectedMetric = ref<null | { title: string; description: any }>(null)
const repository = ref(null)
const commits = ref<Commit[]>([])
const pipelines = ref<Pipeline[]>([])
const pullRequests = ref<PullRequest[]>([])
const contributors = ref<Contributor[]>([])
const branches = ref<Branch[]>([])
const branchStats = ref<any>(null)

const timeFilter = ref<TimeFilter>({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0]
})

const selectedContributor = ref('')
const uniqueContributors = ref<string[]>([])

const pullRequestStats = ref({
  totalPRs: 0,
  averagePRPerDay: 0,
  topContributor: '',
  topContributorPRs: 0,
  topContributorAvgPRPerDay: 0,
  averageLoCPerPR: 0
})

const analyzer = new Analyzer()

const pipelineStats = computed(() => {
  const stats = analyzer.analyzePipelines(pipelines.value, timeFilter.value)
  const healthyMetricsCount = [
    stats.successfulPipelines > 0,
    stats.failedPipelines === 0,
    stats.successRate >= 80,
    stats.deploymentFrequency > 0
  ].filter(Boolean).length
  return { ...stats, healthyMetricsCount, totalMetricsCount: 4 }
})
const commitStats = computed(() => analyzer.analyzeCommits(commits.value, timeFilter.value))
const contributorStats = computed(() => analyzer.analyzeContributors(contributors.value))

const codeRatioTrend = computed(() => {
  if (commitStats.value.addRemoveRatio === Infinity) {
    return 'Unbalanced';
  } else if (commitStats.value.addRemoveRatio >= 0.5 && commitStats.value.addRemoveRatio <= 2) {
    return 'Balanced';
  } else if (commitStats.value.addRemoveRatio < 0.5) {
    return 'More Removals';
  } else {
    return 'More Additions';
  }
});

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
      branches.value = await gitlabStore.service.getBranches(String(id), String(id))
      pullRequests.value = await gitlabStore.service.getPullRequests(projectId, timeFilter.value)
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
      branches.value = await githubStore.service.getBranches(owner, repo)
      pullRequests.value = await githubStore.service.getPullRequests(owner, repo, timeFilter.value)
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
      branches.value = await azureStore.service.getBranches(projectId, id)
      pullRequests.value = await azureStore.service.getPullRequests(projectId, id, timeFilter.value)
    }

    // Update unique contributors list before filtering
    const contributorMap = new Map<string, string[]>()
    
    // Helper function to get normalized name from different author formats
    const getNormalizedName = (author: unknown): string => {
      if (!author) return 'Unknown'
      
      // Handle PullRequest author object
      if (typeof author === 'object' && author !== null && 'name' in author) {
        return (author as { name: string }).name
      }
      
      // Handle string format (Branch lastCommitAuthor)
      if (typeof author === 'string') {
        return author
      }
      
      return 'Unknown'
    }

    // Collect all variations of names
    commits.value.forEach(commit => {
      const authorName = commit.author_name
      if (authorName) {
        const normalizedName = getNormalizedName(authorName)
        const variations = contributorMap.get(normalizedName) || []
        if (!variations.includes(authorName)) {
          variations.push(authorName)
          contributorMap.set(normalizedName, variations)
        }
      }
    })

    branches.value.forEach(branch => {
      if (branch.lastCommitAuthor) {
        const normalizedName = getNormalizedName(branch.lastCommitAuthor)
        const variations = contributorMap.get(normalizedName) || []
        if (!variations.includes(branch.lastCommitAuthor)) {
          variations.push(branch.lastCommitAuthor)
          contributorMap.set(normalizedName, variations)
        }
      }
    })

    pullRequests.value.forEach(pr => {
      if (pr.author?.name) {
        const normalizedName = getNormalizedName(pr.author)
        const variations = contributorMap.get(normalizedName) || []
        if (!variations.includes(pr.author.name)) {
          variations.push(pr.author.name)
          contributorMap.set(normalizedName, variations)
        }
      }
    })

    uniqueContributors.value = Array.from(contributorMap.keys()).sort()

    // Filter data by contributor if selected
    if (selectedContributor.value) {
      const variations = contributorMap.get(selectedContributor.value) || []
      commits.value = commits.value.filter(commit => variations.includes(commit.author_name))
      branches.value = branches.value.filter(branch => variations.includes(branch.lastCommitAuthor || ''))
      pullRequests.value = pullRequests.value.filter(pr => variations.includes(pr.author?.name || ''))
    }

    // Calculate statistics after filtering
    branchStats.value = analyzer.analyzeBranches(branches.value)
    pullRequestStats.value = analyzer.analyzePullRequests(pullRequests.value, timeFilter.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load repository data'
    commits.value = []
    pipelines.value = []
    contributors.value = []
    pullRequests.value = []
    uniqueContributors.value = []
  } finally {
    loading.value = false
  }
}

const showMetricInfo = (metric: { title: string; description: any }) => {
  selectedMetric.value = metric
  showMetricsInfo.value = true
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
