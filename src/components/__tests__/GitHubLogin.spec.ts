// Last updated: 2025-03-02
// Tests for GitHubLogin.vue component
// Tests login functionality, form validation, and remember me feature

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import GitHubLogin from '../GitHubLogin.vue'
import { useGithubStore } from '@/stores/github'
import { createRouter, createWebHistory } from 'vue-router'

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: {} }]
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('GitHubLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountComponent(initialState = {}) {
    return mount(GitHubLogin, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState
          }),
          router
        ]
      }
    })
  }

  it('renders correctly', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('h2').text()).toBe('Sign in with GitHub')
    expect(wrapper.find('#github-token')).toBeTruthy()
    expect(wrapper.find('#github-remember-me')).toBeTruthy()
  })

  it('loads saved token from localStorage', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'github_token') return 'test-token'
      return null
    })

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('#github-token').element.value).toBe('test-token')
    expect(wrapper.find('#github-remember-me').element.checked).toBe(true)
  })

  it('handles login submission correctly', async () => {
    const wrapper = mountComponent()
    const githubStore = useGithubStore()

    // Fill form
    await wrapper.find('#github-token').setValue('test-token')
    await wrapper.find('#github-remember-me').setValue(true)

    // Submit form
    await wrapper.find('form').trigger('submit')

    // Verify store action was called
    expect(githubStore.login).toHaveBeenCalledWith('test-token')

    // Verify localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('github_token', 'test-token')
  })

  it('clears localStorage when remember me is unchecked', async () => {
    const wrapper = mountComponent()

    // Fill form without remember me
    await wrapper.find('#github-token').setValue('test-token')
    await wrapper.find('#github-remember-me').setValue(false)

    // Submit form
    await wrapper.find('form').trigger('submit')

    // Verify localStorage was cleared
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('github_token')
  })

  it('displays error message when login fails', async () => {
    const wrapper = mountComponent({
      github: {
        error: 'Invalid token'
      }
    })

    expect(wrapper.find('.bg-red-50').exists()).toBe(true)
    expect(wrapper.find('.text-red-800').text()).toBe('Invalid token')
  })

  it('disables submit button during loading', async () => {
    const wrapper = mountComponent({
      github: {
        loading: true
      }
    })

    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(submitButton.text()).toBe('Signing in...')
  })

  it('redirects to home after successful login', async () => {
    const wrapper = mountComponent({
      github: {
        auth: {
          isAuthenticated: true
        }
      }
    })

    // Fill and submit form
    await wrapper.find('#github-token').setValue('test-token')
    await wrapper.find('form').trigger('submit')

    // Verify router push was called
    expect(router.currentRoute.value.path).toBe('/')
  })
})
