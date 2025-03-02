<!--
Created: Health metric card component for displaying repository health metrics
-->
<template>
  <div class="mb-6">
    <div :class="[
      'flex flex-col gap-1 rounded-lg p-4 shadow-sm transition-colors duration-200',
      isHealthy
        ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/50 dark:to-green-800/50 border border-green-200 dark:border-green-700'
        : 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/50 dark:to-yellow-800/50 border border-yellow-200 dark:border-yellow-700'
    ]">
      <div class="flex items-center justify-between">
        <span :class="[
          'text-sm font-medium',
          isHealthy ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
        ]">{{ title }}</span>
        <span :class="[
          'rounded-full px-2.5 py-1 text-xs font-medium shadow-sm',
          isHealthy
            ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
            : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
        ]">
          {{ status }}
        </span>
      </div>
      <div class="mt-3">
        <div :class="[
          'text-2xl font-bold',
          isHealthy ? 'text-green-900 dark:text-green-100' : 'text-yellow-900 dark:text-yellow-100'
        ]">{{ value }}</div>
        <p :class="[
          'text-sm',
          isHealthy ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
        ]">{{ unit }}</p>
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
