<template>
  <div class="w-full max-w-md space-y-6">
    <div class="text-center">
      <img
        class="mx-auto h-16 w-auto"
        src="https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png"
        alt="GitHub"
      />
      <h2 class="mt-6 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Sign in with GitHub
      </h2>
    </div>

    <form class="space-y-4" @submit.prevent="handleLogin">
      <div>
        <label for="github-token" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Personal Access Token</label>
        <div class="relative">
          <input
            id="github-token"
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
            id="github-remember-me"
            name="remember-me"
            type="checkbox"
            v-model="rememberMe"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
          />
          <label for="github-remember-me" class="ml-2 block text-sm text-gray-700 dark:text-gray-200">Remember me</label>
        </div>

        <div class="text-sm">
          <a href="#" class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">Need help?</a>
        </div>
      </div>

      <div v-if="githubStore.error" class="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/50">
        <div class="flex">
          <div class="ml-3">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ githubStore.error }}</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        :disabled="githubStore.loading"
        class="mt-4 flex w-full items-center justify-center rounded-lg bg-[#2DA44E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-150 ease-in-out hover:bg-[#2C974B] focus:outline-none focus:ring-2 focus:ring-[#2DA44E] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#2C974B] dark:focus:ring-offset-gray-900"
      >
        <span>{{ githubStore.loading ? 'Signing in...' : 'Sign in' }}</span>
      </button>

      <div class="mt-4 space-y-2 text-center text-sm">
        <p class="text-gray-600 dark:text-gray-400">
          Need a personal access token?
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >Generate one here</a>
        </p>
        <p class="text-gray-600 dark:text-gray-400">
          Don't have an account yet?
          <a href="https://github.com/signup" target="_blank" rel="noopener noreferrer" class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">Create account</a>
        </p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGithubStore } from '@/stores/github'

const router = useRouter()
const githubStore = useGithubStore()

const token = ref('')
const rememberMe = ref(false)

const handleLogin = async () => {
  try {
    await githubStore.login(token.value)
    if (githubStore.auth.isAuthenticated) {
      router.push('/')
    }
  } catch (err) {
    console.error('Login failed:', err)
  }
}
</script>
