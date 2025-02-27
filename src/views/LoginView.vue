<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-8 dark:bg-gray-900">
    <div class="w-full max-w-md space-y-6 bg-white p-8 shadow-lg dark:bg-gray-800 sm:rounded-lg">
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            @click="activeTab = tab.name"
            :class="[
              activeTab === tab.name
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
              'w-full whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors duration-200'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <div class="mt-8">
        <component :is="activeTab"></component>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GitLabLogin from '@/components/GitLabLogin.vue'
import GitHubLogin from '@/components/GitHubLogin.vue'
import AzureLogin from '@/components/AzureLogin.vue'

const tabs = [
  { name: GitLabLogin, label: 'GitLab' },
  { name: GitHubLogin, label: 'GitHub' },
  // TODO: enable this after find out why commits returned error
  // { name: AzureLogin, label: 'Azure DevOps' },
]

const activeTab = ref(GitLabLogin)
</script>
