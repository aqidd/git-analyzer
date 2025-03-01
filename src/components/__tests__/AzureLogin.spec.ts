// Last updated: 2025-03-02
// Tests for AzureLogin.vue component
// Tests login functionality, form validation, and remember me feature

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AzureLogin from '../AzureLogin.vue'
import { useAzureStore } from '@/stores/azure'
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

describe('AzureLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountComponent(initialState = {}) {
    return mount(AzureLogin, {
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
    expect(wrapper.find('h2').text()).toBe('Sign in with Azure DevOps')
    expect(wrapper.find('#azure-organization')).toBeTruthy()
    expect(wrapper.find('#azure-token')).toBeTruthy()
    expect(wrapper.find('#azure-remember-me')).toBeTruthy()
  })

  it('loads saved credentials from localStorage', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      const storage = {
        'azure_organization': 'test-org',
        'azure_token': 'test-token'
      }
      return storage[key]
    })

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('#azure-organization').element.value).toBe('test-org')
    expect(wrapper.find('#azure-token').element.value).toBe('test-token')
    expect(wrapper.find('#azure-remember-me').element.checked).toBe(true)
  })

  it('handles login submission correctly', async () => {
    const wrapper = mountComponent()
    const azureStore = useAzureStore()

    // Fill form
    await wrapper.find('#azure-organization').setValue('test-org')
    await wrapper.find('#azure-token').setValue('test-token')
    await wrapper.find('#azure-remember-me').setValue(true)

    // Submit form
    await wrapper.find('form').trigger('submit')

    // Verify store action was called
    expect(azureStore.login).toHaveBeenCalledWith('test-org', 'test-token')

    // Verify localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('azure_organization', 'test-org')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('azure_token', 'test-token')
  })

  it('clears localStorage when remember me is unchecked', async () => {
    const wrapper = mountComponent()

    // Fill form without remember me
    await wrapper.find('#azure-organization').setValue('test-org')
    await wrapper.find('#azure-token').setValue('test-token')
    await wrapper.find('#azure-remember-me').setValue(false)

    // Submit form
    await wrapper.find('form').trigger('submit')

    // Verify localStorage was cleared
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('azure_organization')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('azure_token')
  })

  it('displays error message when login fails', async () => {
    const wrapper = mountComponent({
      azure: {
        error: 'Invalid credentials'
      }
    })

    expect(wrapper.find('.bg-red-50').exists()).toBe(true)
    expect(wrapper.find('.text-red-800').text()).toBe('Invalid credentials')
  })

  it('disables submit button during loading', async () => {
    const wrapper = mountComponent({
      azure: {
        loading: true
      }
    })

    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(submitButton.text()).toBe('Signing in...')
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('redirects to home after successful login', async () => {
    const wrapper = mountComponent({
      azure: {
        auth: {
          isAuthenticated: true
        }
      }
    })

    // Fill and submit form
    await wrapper.find('#azure-organization').setValue('test-org')
    await wrapper.find('#azure-token').setValue('test-token')
    await wrapper.find('form').trigger('submit')

    // Verify router push was called
    expect(router.currentRoute.value.path).toBe('/')
  })
})
