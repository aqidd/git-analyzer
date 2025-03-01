<!--
Created: Health metric card component for displaying repository health metrics
-->
<template>
  <div class="mb-6">
    <div class="flex flex-col gap-1 rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ title }}</span>
        <span :class="[
          'rounded-full px-2 py-0.5 text-xs font-medium',
          isHealthy ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
        ]">
          {{ status }}
        </span>
      </div>
      <div class="mt-2">
        <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ value }}</div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ unit }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  status: string
  value: string | number
  unit: string
  isHealthy: boolean
}>()
</script>
