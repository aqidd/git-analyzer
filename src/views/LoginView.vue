<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-6 py-12 dark:from-gray-900 dark:to-gray-800">
    <div class="mx-auto max-w-6xl">
      <!-- Hero Section -->
      <div class="mb-12 text-center">
        <h1 class="mb-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Repository Health Analytics
        </h1>
        <p class="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Comprehensive insights into your repository's health, team collaboration, and development practices.
        </p>
      </div>

      <!-- Main Content Grid -->
      <div class="grid gap-8 lg:grid-cols-2">
        <!-- Login Section -->
        <div class="flex items-start justify-center lg:items-center">
          <div class="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-xl dark:bg-gray-800">
            <div class="text-center">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Get Started</h2>
            </div>

            <div class="border-b border-gray-200 dark:border-gray-700">
              <nav class="-mb-px flex" aria-label="Tabs">
                <button v-for="tab in tabs" :key="tab.name" @click="activeTab = tab.name" :class="[
                  activeTab === tab.name
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                  'w-full whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors duration-200'
                ]">
                  {{ tab.label }}
                </button>
              </nav>
            </div>

            <div class="mt-8">
              <component :is="activeTab"></component>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="relative overflow-hidden rounded-xl bg-white p-3 shadow-xl dark:bg-gray-800">
          <div class="aspect-[16/10] overflow-hidden rounded-lg">
            <img src="@/assets/preview.png" alt="Platform Preview" class="h-full w-full object-cover" />
          </div>

          <!-- Feature List -->
          <div class="mt-6 grid gap-4 p-4 sm:grid-cols-2">
            <div v-for="feature in features" :key="feature.title"
              class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <div class="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <component :is="feature.icon" class="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white">{{ feature.title }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-300">{{ feature.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Need a custom template section -->
      <div class="mt-16">
        <div class="grid md:grid-cols-1 items-center">
          <div class="space-y-6">
            <h3 class="text-2xl font-bold">Need Customization?</h3>
            <p class="text-gray-600">If you have an existing metrics to track or need more complex features than our
              base offerings, we can help you with that. Ping us at flipboxstudio@gmail.com</p>
          </div>
        </div>

        <!-- Feature grid -->
        <div class="grid md:grid-cols-3 gap-4 mt-8">
          <div class="bg-gray-400 p-8 rounded-lg text-white">
            <h4 class="text-xl font-bold mb-4">Custom metrics</h4>
            <p>We'll create new metrics based on your requirement.</p>
          </div>
          <div class="bg-red-400 p-8 rounded-lg text-white">
            <h4 class="text-xl font-bold mb-4">AI customization</h4>
            <p>We can integrate AI to suit your personalized needs</p>
          </div>
          <div class="bg-blue-400 p-8 rounded-lg text-white">
            <h4 class="text-xl font-bold mb-4">Feature Customization</h4>
            <p>Need another feature? Let us know</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue'
import GitLabLogin from '@/components/GitLabLogin.vue'
import GitHubLogin from '@/components/GitHubLogin.vue'
import AzureLogin from '@/components/AzureLogin.vue'

// Lucide Icons
const ActivityIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
}

const GitBranchIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>`
}

const UsersIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
}

const PipelineIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`
}

const features = [
  {
    title: 'Code Activity Tracking',
    description: 'Monitor commit frequency, code changes, and development patterns',
    icon: ActivityIcon
  },
  {
    title: 'Branch Management',
    description: 'Track branch health, stale branches, and merge patterns',
    icon: GitBranchIcon
  },
  {
    title: 'Team Collaboration',
    description: 'Analyze contribution balance and knowledge distribution',
    icon: UsersIcon
  },
  {
    title: 'Pipeline Analytics',
    description: 'Monitor CI/CD health and deployment frequency',
    icon: PipelineIcon
  }
]

const tabs = [
  { name: markRaw(GitLabLogin), label: 'GitLab' },
  { name: markRaw(GitHubLogin), label: 'GitHub' },
  { name: markRaw(AzureLogin), label: 'Azure DevOps' },
]

const activeTab = ref(GitLabLogin)
</script>
