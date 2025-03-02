<!--
  Changes:
  - Created RepositoryCard component to display repository information
  - Added props for repository data and helper methods
  - Implemented consistent styling with Tailwind CSS
  - Added dark mode support
-->
<template>
  <div class="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
    <div class="p-5">
      <div class="flex items-center mb-3">
        <img :src="avatarUrl" :alt="repository.name" class="w-8 h-8 rounded mr-3" />
        <h5 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white truncate">
          {{ repository.name }}
        </h5>
      </div>
      <p class="mb-3 font-normal text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[3em]">
        {{ repository.description || 'No description available' }}
      </p>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-4">
          <span
            class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
            {{ repository.default_branch }}
          </span>
          <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
            {{ starCount }}
          </div>
        </div>
      </div>
      <div class="flex items-center">
        <div class="flex items-center space-x-2">
          <a :href="repoUrl" target="_blank" rel="noopener noreferrer" :class="[
            'inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white rounded-lg focus:ring-4 focus:outline-none',
            isGitLab ? 'bg-[#FC6D26] hover:bg-[#E24329] focus:ring-[#FC6D26]/50' :
              isAzure ? 'bg-[#0078D4] hover:bg-[#106EBE] focus:ring-[#0078D4]/50' :
                'bg-[#2DA44E] hover:bg-[#2C974B] focus:ring-[#2DA44E]/50'
          ]">
            View
          </a>
          <router-link :to="{
            name: 'repository',
            params: {
              type: repoType,
              id: repositoryId
            }
          }"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 focus:ring-4 focus:outline-none focus:ring-indigo-300 dark:bg-gray-800 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-700">
            Analytics
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Repository } from '@/types/repository'

const props = defineProps<{
  repository: Repository
}>()

const isGitLab = computed(() => 'web_url' in props.repository && 'star_count' in props.repository)
const isAzure = computed(() => 'project' in props.repository && 'stats' in props.repository)
const isGitHub = computed(() => 'owner' in props.repository && 'html_url' in props.repository)

const avatarUrl = computed(() => {
  if (isGitLab.value) {
    return props.repository?.avatar_url || 'https://about.gitlab.com/images/press/logo/svg/gitlab-logo-500.svg'
  } else if (isAzure.value) {
    return 'https://www.svgrepo.com/show/448307/azure-devops.svg'
  } else if (isGitHub.value) {
    return props.repository?.owner?.avatar_url || 'https://www.svgrepo.com/show/35001/github.svg'
  }
  return '/default-icon.svg'
})

const starCount = computed(() => {
  if (isGitLab.value) {
    return `${props.repository?.star_count} stars`
  } else if (isAzure.value) {
    return ''
  } else if (isGitHub.value) {
    return `${props.repository?.stargazers_count} stars`
  }
  return ''
})

const repoUrl = computed(() => {
  if (isGitLab.value) {
    return props.repository?.web_url
  } else if (isAzure.value) {
    return props.repository?.url
  } else if (isGitHub.value) {
    return props.repository?.html_url
  }
  return '#'
})

const repoType = computed(() => {
  if (isGitLab.value) return 'gitlab'
  if (isAzure.value) return 'azure'
  return 'github'
})

const repositoryId = computed(() => {
  if (isGitLab.value) {
    return props.repository.id
  } else if (isAzure.value) {
    return props.repository.id
  } else if (isGitHub.value && 'owner' in props.repository) {
    return `${props.repository.owner?.login}/${props.repository.name}`
  }
  return ''
})
</script>
