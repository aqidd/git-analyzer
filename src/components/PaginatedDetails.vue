<!-- 
  Updated: PaginatedDetails component
  - Added tab icons and counts
  - Improved styling and dark mode support
  - Enhanced pagination controls
-->
<template>
  <div class="space-y-4">
    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700 m-4">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="currentTab = tab.key"
          :class="[
            currentTab === tab.key
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
            'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium'
          ]"
        >
          <component
            :is="tab.icon"
            :class="[
              currentTab === tab.key ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300',
              '-ml-0.5 mr-2 h-5 w-5'
            ]"
            aria-hidden="true"
          />
          <span>{{ tab.label }}</span>
          <span
            :class="[
              currentTab === tab.key
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
                : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-400',
              'ml-3 hidden rounded-full py-0.5 px-2.5 text-xs font-medium md:inline-block'
            ]"
          >{{ items[tab.key]?.length || 0 }}</span>
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div class="min-h-[400px] p-4">
      <!-- Commits -->
      <div v-if="currentTab === 'commits'" class="space-y-4 ">
        <div v-for="commit in paginatedItems.commits" :key="commit.id" class="flex items-start justify-between rounded-lg bg-white p-4 border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ commit.message }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ commit.author_name }} on {{ new Date(commit.created_at).toLocaleDateString() }}
            </p>
          </div>
          <a :href="commit.web_url || commit.html_url" target="_blank" class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">View</a>
        </div>
      </div>

      <!-- Branches -->
      <div v-if="currentTab === 'branches'" class="space-y-4">
        <div v-for="branch in paginatedItems.branches" :key="branch.name" class="flex items-start justify-between rounded-lg bg-white p-4 border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-white">{{ branch.name }}</span>
              <span v-if="branch.protected" class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">Protected</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Last commit by {{ branch.lastCommitAuthor }} on {{ new Date(branch.lastCommitDate).toLocaleDateString() }}
            </p>
          </div>
        </div>
      </div>

      <!-- Contributors -->
      <div v-if="currentTab === 'contributors'" class="space-y-4">
        <div v-for="contributor in paginatedItems.contributors" :key="contributor.id" class="flex items-start rounded-lg bg-white p-4 border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <img v-if="contributor.avatar_url" :src="contributor.avatar_url" :alt="contributor.name" class="h-10 w-10 rounded-full mr-4" />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ contributor.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ contributor.commits }} commits</p>
          </div>
        </div>
      </div>

      <!-- Pull Requests -->
      <div v-if="currentTab === 'pullRequests'" class="space-y-4">
        <div v-for="pr in paginatedItems.pullRequests" :key="pr.id" class="flex items-start justify-between rounded-lg bg-white p-4 border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <div class="flex-grow">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-gray-900 dark:text-white">{{ pr.title }}</span>
              <span :class="[
                'rounded-full px-2 py-0.5 text-xs font-medium',
                pr.state === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                pr.state === 'merged' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              ]">
                {{ pr.state.charAt(0).toUpperCase() + pr.state.slice(1) }}
              </span>
              <span v-if="pr.isDraft" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200">Draft</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              #{{ pr.id }} by {{ pr.author.name }} · {{ pr.reviewCount }} reviews · {{ pr.comments }} comments
            </p>
            <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span class="inline-flex items-center gap-1">
                <span class="text-green-600 dark:text-green-400">+{{ pr.additions }}</span>
                <span class="text-red-600 dark:text-red-400">-{{ pr.deletions }}</span>
                · {{ pr.changedFiles }} files
              </span>
            </div>
          </div>
          <div class="text-right text-sm text-gray-500 dark:text-gray-400">
            <div>Created {{ new Date(pr.createdAt).toLocaleDateString() }}</div>
            <div v-if="pr.timeToMerge" class="text-green-600 dark:text-green-400">Merged in {{ Math.round(pr.timeToMerge) }}h</div>
            <div v-if="pr.timeToFirstReview" class="text-blue-600 dark:text-blue-400">First review in {{ Math.round(pr.timeToFirstReview) }}h</div>
          </div>
        </div>
      </div>

      <!-- Pipelines -->
      <div v-if="currentTab === 'pipelines'" class="space-y-4">
        <div v-for="pipeline in paginatedItems.pipelines" :key="pipeline.id" class="flex items-start justify-between rounded-lg bg-white p-4 border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ pipeline.ref }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Status: {{ pipeline.status }} | Updated: {{ new Date(pipeline.updated_at).toLocaleDateString() }}
            </p>
          </div>
          <a :href="pipeline.web_url || pipeline.html_url" target="_blank" class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">View</a>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="p-4 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-700">
      <div class="flex flex-1 justify-between sm:hidden">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Previous
        </button>
        <button
          @click="currentPage++"
          :disabled="currentPage >= totalPages"
          class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Next
        </button>
      </div>
      <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Showing
            <span class="font-medium">{{ startIndex + 1 }}</span>
            to
            <span class="font-medium">{{ Math.min(endIndex, totalItems) }}</span>
            of
            <span class="font-medium">{{ totalItems }}</span>
            results
          </p>
        </div>
        <div>
          <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <span class="sr-only">Previous</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
            </button>
            <button
              v-for="page in displayedPages"
              :key="page"
              @click="currentPage = page"
              :class="[
                page === currentPage
                  ? 'relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500'
                  : 'relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                'focus:z-20'
              ]"
            >
              {{ page }}
            </button>
            <button
              @click="currentPage++"
              :disabled="currentPage >= totalPages"
              class="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <span class="sr-only">Next</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Commit, Branch, Pipeline, Contributor, PullRequest } from '@/types/repository'
import { GitMergeIcon, GitCommitIcon, GitBranchIcon, UsersIcon, RocketIcon } from 'lucide-vue-next'

// Updated: Added pull requests tab with proper icons

interface Props {
  commits?: Commit[]
  branches?: Branch[]
  pipelines?: Pipeline[]
  contributors?: Contributor[]
  pullRequests?: PullRequest[]
}

const props = defineProps<Props>()
const itemsPerPage = 25
const currentPage = ref(1)
const currentTab = ref('commits')

const tabs = [
  { key: 'commits', label: 'Commits', icon: GitCommitIcon },
  { key: 'branches', label: 'Branches', icon: GitBranchIcon },
  { key: 'pullRequests', label: 'Pull Requests', icon: GitMergeIcon },
  { key: 'contributors', label: 'Contributors', icon: UsersIcon },
  { key: 'pipelines', label: 'Pipelines', icon: RocketIcon }
]

// Computed property for displayed page numbers
const displayedPages = computed(() => {
  const totalPages = Math.ceil(totalItems.value / itemsPerPage)
  const current = currentPage.value
  const pages = []

  if (totalPages <= 7) {
    // Show all pages if there are 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)

    if (current > 3) {
      // Show ellipsis after first page
      pages.push('...')
    }

    // Show pages around current page
    for (let i = Math.max(2, current - 1); i <= Math.min(current + 1, totalPages - 1); i++) {
      pages.push(i)
    }

    if (current < totalPages - 2) {
      // Show ellipsis before last page
      pages.push('...')
    }

    // Always show last page
    pages.push(totalPages)
  }

  return pages
})



const items = computed(() => ({
  commits: props.commits || [],
  branches: props.branches || [],
  pipelines: props.pipelines || [],
  contributors: props.contributors || [],
  pullRequests: props.pullRequests || []
}))

const totalItems = computed(() => items.value[currentTab.value]?.length || 0)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage)
const endIndex = computed(() => startIndex.value + itemsPerPage)

const paginatedItems = computed(() => {
  const currentItems = items.value[currentTab.value] || []
  return {
    [currentTab.value]: currentItems.slice(startIndex.value, endIndex.value)
  }
})

// Reset pagination when tab changes
watch(currentTab, () => {
  currentPage.value = 1
})
</script>
