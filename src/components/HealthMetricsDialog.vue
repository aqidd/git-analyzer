<!-- 
  Created: Health metrics dialog component
  Shows detailed explanation of each health metric
-->
<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeDialog" class="relative z-10">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/25 dark:bg-black/40" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                {{ title }}
              </DialogTitle>
              <div class="mt-4">
                <div class="space-y-4">
                  <div v-for="(metric, idx) in metrics" :key="idx" class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                    <h4 class="font-medium text-gray-900 dark:text-white">{{ metric.name }}</h4>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ metric.description }}</p>
                    <div class="mt-2">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Good:</span>
                        <span class="text-sm text-gray-600 dark:text-gray-300">{{ metric.good }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Bad:</span>
                        <span class="text-sm text-gray-600 dark:text-gray-300">{{ metric.bad }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-6">
                <button
                  type="button"
                  class="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800"
                  @click="closeDialog"
                >
                  Got it!
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

interface Metric {
  name: string
  description: string
  good: string
  bad: string
}

interface Props {
  isOpen: boolean
  title: string
  metrics: Metric[]
}

defineProps<Props>()
const emit = defineEmits(['close'])

const closeDialog = () => {
  emit('close')
}
</script>
