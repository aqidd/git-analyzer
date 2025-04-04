<template>
  <div class="space-y-4">
    <div v-for="section in sections" :key="section.title" class="rounded-lg bg-white shadow dark:bg-gray-800">
      <button
        @click="toggleSection(section.title)"
        class="w-full flex justify-between items-center px-4 py-2 text-left text-gray-900 dark:text-white"
      >
        <div>
          <span class="font-medium">{{ section.title }}</span>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ section.overview }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click.stop="$emit('show-metric-info', { 
              title: section.title, 
              description: section.metrics.map(metric => ({ title: metric.title, description: metric.description })) 
            })"
            class="text-indigo-600 hover:underline"
          >
            Details
          </button>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            :class="{'rotate-180': openSections.includes(section.title)}"
            class="h-5 w-5 transform transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div v-if="openSections.includes(section.title)" class="px-4 py-2 space-y-2">
        <div v-for="metric in section.metrics" :key="metric.title">
          <HealthMetricCard
            :title="metric.title"
            :status="metric.status"
            :value="metric.value"
            :unit="metric.unit"
            :isHealthy="metric.isHealthy"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HealthMetricCard from './HealthMetricCard.vue'

interface Metric {
  title: string
  status: string
  value: string | number
  unit: string
  isHealthy: boolean
  description: string
}

interface Section {
  title: string
  overview: string
  metrics: Metric[]
}

defineProps<{
  sections: Section[]
}>()

const openSections = ref<string[]>([])

const toggleSection = (title: string) => {
  if (openSections.value.includes(title)) {
    openSections.value = openSections.value.filter(section => section !== title)
  } else {
    openSections.value.push(title)
  }
}
</script>

<style scoped>
/* Add any necessary styles here */
</style>
