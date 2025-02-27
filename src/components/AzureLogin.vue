<template>
  <div class="w-full max-w-md space-y-6">
    <div class="text-center">
      <img
        class="mx-auto h-16 w-auto"
        src="https://www.svgrepo.com/show/448307/azure-devops.svg"
        alt="Azure DevOps"
      />
      <h2 class="mt-6 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Sign in with Azure DevOps
      </h2>
    </div>

    <form class="space-y-4" @submit.prevent="handleLogin">
      <div>
        <label for="azure-organization" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Organization</label>
        <div class="relative">
          <input
            id="azure-organization"
            v-model="organization"
            type="text"
            required
            class="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 transition duration-150 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500"
            placeholder="Enter your organization name"
          />
        </div>
      </div>

      <div>
        <label for="azure-token" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Personal Access Token</label>
        <div class="relative">
          <input
            id="azure-token"
            v-model="token"
            type="password"
            required
            class="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 transition duration-150 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500"
            placeholder="Enter your personal access token"
          />
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input
            id="azure-remember-me"
            name="remember-me"
            type="checkbox"
            v-model="rememberMe"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
          />
          <label for="azure-remember-me" class="ml-2 block text-sm text-gray-700 dark:text-gray-200">Remember me</label>
        </div>

        <div class="text-sm">
          <a 
            href="https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate" 
            target="_blank"
            class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Need help?
          </a>
        </div>
      </div>

      <div v-if="azureStore.error" class="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/50">
        <div class="flex">
          <div class="ml-3">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ azureStore.error }}</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        :disabled="azureStore.loading"
        class="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-150 ease-in-out hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        <svg
          v-if="azureStore.loading"
          class="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {{ azureStore.loading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAzureStore } from '@/stores/azure'
import { useRouter } from 'vue-router'

const router = useRouter()
const azureStore = useAzureStore()
const organization = ref('')
const token = ref('')
const rememberMe = ref(false)

async function handleLogin() {
  if (rememberMe.value) {
    localStorage.setItem('azure_organization', organization.value)
    localStorage.setItem('azure_token', token.value)
  } else {
    localStorage.removeItem('azure_organization')
    localStorage.removeItem('azure_token')
  }

  await azureStore.login(organization.value, token.value)
  if (azureStore.auth.isAuthenticated) {
    router.push('/')
  }
}

const savedOrganization = localStorage.getItem('azure_organization')
const savedToken = localStorage.getItem('azure_token')

if (savedOrganization && savedToken) {
  organization.value = savedOrganization
  token.value = savedToken
  rememberMe.value = true
}
</script>
