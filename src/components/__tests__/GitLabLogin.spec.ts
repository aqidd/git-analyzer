// Last updated: 2025-03-02
// Tests for GitLabLogin.vue component
// Tests login functionality, form validation, and remember me feature

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import GitLabLogin from '../GitLabLogin.vue'
import { useGitlabStore } from '@/stores/gitlab.store'
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

describe('GitLabLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountComponent(initialState = {}) {
    return mount(GitLabLogin, {
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
    expect(wrapper.find('h2').text()).toBe('Sign in with GitLab')
    expect(wrapper.find('#gitlab-url')).toBeTruthy()
    expect(wrapper.find('#gitlab-token')).toBeTruthy()
    expect(wrapper.find('#gitlab-remember-me')).toBeTruthy()
  })

  it('loads saved credentials from localStorage', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      const storage = {
        'gitlab_url': 'https://gitlab.com',
        'gitlab_token': 'test-token'
      }
      return storage[key]
    })

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('#gitlab-url').element.value).toBe('https://gitlab.com')
    expect(wrapper.find('#gitlab-token').element.value).toBe('test-token')
    expect(wrapper.find('#gitlab-remember-me').element.checked).toBe(true)
  })

  it('handles login submission correctly', async () => {
    const wrapper = mountComponent()
    const gitlabStore = useGitlabStore()

    // Fill form
    await wrapper.find('#gitlab-url').setValue('https://gitlab.com')
    await wrapper.find('#gitlab-token').setValue('test-token')
    await wrapper.find('#gitlab-remember-me').setValue(true)

    // Submit form
    await wrapper.find('form').trigger('submit')

    // Verify store action was called
    expect(gitlabStore.login).toHaveBeenCalledWith('https://gitlab.com', 'test-token')

    // Verify localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('gitlab_url', 'https://gitlab.com')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('gitlab_token', 'test-token')
  })

  it('clears localStorage when remember me is unchecked', async () => {
    const wrapper = mountComponent()

    // Fill form without remember me
    await wrapper.find('#gitlab-url').setValue('https://gitlab.com')
    await wrapper.find('#gitlab-token').setValue('test-token')
    await wrapper.find('#gitlab-remember-me').setValue(false)

    // Submit form
    await wrapper.find('form').trigger('submit')

    // Verify localStorage was cleared
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('gitlab_url')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('gitlab_token')
  })

  it('displays error message when login fails', async () => {
    const wrapper = mountComponent()
    const gitlabStore = useGitlabStore()

    // Mock the store to simulate an error
    gitlabStore.login.mockRejectedValueOnce(new Error('Invalid credentials'))

    // Trigger login
    await wrapper.find('#gitlab-url').setValue('https://gitlab.com')
    await wrapper.find('#gitlab-token').setValue('invalid-token')
    await wrapper.find('form').trigger('submit')

    // Wait for the next tick to let error state update
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.bg-red-50').exists()).toBe(true)
    expect(wrapper.find('.text-red-800').text()).toBe('Invalid credentials')
  })

  it('handles loading state correctly', async () => {
    const wrapper = mountComponent()
    const gitlabStore = useGitlabStore()

    // Mock the store to simulate loading
    gitlabStore.login.mockImplementationOnce(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Start login
    await wrapper.find('#gitlab-url').setValue('https://gitlab.com')
    await wrapper.find('#gitlab-token').setValue('test-token')
    await wrapper.find('form').trigger('submit')

    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(submitButton.text()).toBe('Signing in...')
  })

  it('validates URL format', async () => {
    const wrapper = mountComponent()
    const urlInput = wrapper.find('#gitlab-url')

    // Test invalid URL
    await urlInput.setValue('not-a-url')
    await wrapper.find('form').trigger('submit')
    expect(urlInput.element.validity.valid).toBe(false)

    // Test valid URL
    await urlInput.setValue('https://gitlab.com')
    await wrapper.find('form').trigger('submit')
    expect(urlInput.element.validity.valid).toBe(true)
  })

  it('redirects to home after successful login', async () => {
    const wrapper = mountComponent({
      gitlab: {
        auth: {
          isAuthenticated: true
        }
      }
    })

    // Fill and submit form
    await wrapper.find('#gitlab-url').setValue('https://gitlab.com')
    await wrapper.find('#gitlab-token').setValue('test-token')
    await wrapper.find('form').trigger('submit')

    // Verify router push was called
    expect(router.currentRoute.value.path).toBe('/')
  })
})
