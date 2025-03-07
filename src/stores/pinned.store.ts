// Created: 2025-03-07
// - Added pinned repository store with persistence support
// - Added remember me functionality

import { defineStore } from 'pinia'
import { ref } from 'vue'

interface PinnedRepo {
  id: string | number
  name: string
  provider: 'gitlab' | 'github' | 'azure'
  url: string
}

export const usePinnedStore = defineStore('pinned', () => {
  const pinnedRepos = ref<PinnedRepo[]>([])
  const rememberPins = ref(localStorage.getItem('rememberPins') === 'true')

  // Load pinned repos from storage
  const loadPinnedRepos = () => {
    const storedRepos = rememberPins.value 
      ? localStorage.getItem('pinnedRepos')
      : sessionStorage.getItem('pinnedRepos')
    
    if (storedRepos) {
      pinnedRepos.value = JSON.parse(storedRepos)
    }
  }

  // Save pinned repos to storage
  const savePinnedRepos = () => {
    const storage = rememberPins.value ? localStorage : sessionStorage
    storage.setItem('pinnedRepos', JSON.stringify(pinnedRepos.value))
  }

  // Toggle remember pins setting
  const toggleRememberPins = (value: boolean) => {
    rememberPins.value = value
    localStorage.setItem('rememberPins', value.toString())
    
    // Move data between storages when toggling
    const currentPins = JSON.stringify(pinnedRepos.value)
    if (value) {
      localStorage.setItem('pinnedRepos', currentPins)
      sessionStorage.removeItem('pinnedRepos')
    } else {
      sessionStorage.setItem('pinnedRepos', currentPins)
      localStorage.removeItem('pinnedRepos')
    }
  }

  // Pin/unpin repository
  const togglePin = (repo: PinnedRepo) => {
    const index = pinnedRepos.value.findIndex(r => r.id === repo.id && r.provider === repo.provider)
    if (index === -1) {
      pinnedRepos.value.push(repo)
    } else {
      pinnedRepos.value.splice(index, 1)
    }
    savePinnedRepos()
  }

  // Check if repository is pinned
  const isPinned = (id: string | number, provider: string) => {
    return pinnedRepos.value.some(r => r.id === id && r.provider === provider)
  }

  // Initialize store
  loadPinnedRepos()

  return {
    pinnedRepos,
    rememberPins,
    togglePin,
    isPinned,
    toggleRememberPins
  }
})
