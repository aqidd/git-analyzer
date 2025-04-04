<template>
  <div class="space-y-4">
    <div v-for="section in sections" :key="section.title" class="rounded-lg bg-white shadow dark:bg-gray-800">
      <button
        @click="toggleSection(section.title)"
        class="w-full flex justify-between items-center px-4 py-2 text-left text-gray-900 dark:text-white"
      >
        <span class="font-medium">{{ section.title }}</span>
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
}

interface Section {
  title: string
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
