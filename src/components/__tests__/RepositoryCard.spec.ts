// Updated: Added test for RepositoryCard component
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import RepositoryCard from '../RepositoryCard.vue'
import type { Repository as GitLabRepository } from '@/types/gitlab'
import type { Repository as GitHubRepository } from '@/types/github'
import type { Repository as AzureRepository } from '@/types/azure'

describe('RepositoryCard', () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/repository/:type/:id',
        name: 'repository',
        component: { template: '<div>Repository</div>' }
      }
    ]
  })

  const mockGitLabRepo: GitLabRepository = {
    id: '1',
    name: 'test-repo',
    description: 'Test repository',
    web_url: 'https://gitlab.com/test/test-repo',
    avatar_url: 'https://gitlab.com/avatar.png',
    star_count: 10,
    forks_count: 5,
    default_branch: 'main',
    stats: {}
  }

  const mockGitHubRepo: GitHubRepository = {
    name: 'test-repo',
    description: 'Test repository',
    html_url: 'https://github.com/test/test-repo',
    owner: {
      login: 'test',
      avatar_url: 'https://github.com/avatar.png'
    },
    default_branch: 'main',
    stargazers_count: 10,
    forks_count: 5,
    stats: {}
  }

  const mockAzureRepo: AzureRepository = {
    id: '1',
    name: 'test-repo',
    description: 'Test repository',
    url: 'https://dev.azure.com/test/test-repo',
    project: {
      id: '1',
      name: 'test-project'
    },
    default_branch: 'main',
    stats: {}
  }

  it('renders GitLab repository correctly', async () => {
    const wrapper = mount(RepositoryCard, {
      props: {
        repository: mockGitLabRepo
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    const title = wrapper.find('.text-xl.font-semibold')
    const description = wrapper.find('.mb-3.font-normal.text-gray-500')
    const branch = wrapper.find('.bg-blue-100.text-blue-800')
    const stars = wrapper.find('.text-sm.text-gray-500')

    expect(title.text()).toBe('test-repo')
    expect(description.text()).toBe('Test repository')
    expect(stars.text()).toBe('10 stars')
    expect(branch.text()).toBe('main')
    expect(wrapper.find('img').attributes('src')).toBe('https://gitlab.com/avatar.png')
  })

  it('renders GitHub repository correctly', async () => {
    const wrapper = mount(RepositoryCard, {
      props: {
        repository: mockGitHubRepo
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    const title = wrapper.find('.text-xl.font-semibold')
    const description = wrapper.find('.mb-3.font-normal.text-gray-500')
    const branch = wrapper.find('.bg-blue-100.text-blue-800')
    const stars = wrapper.find('.text-sm.text-gray-500')

    expect(title.text()).toBe('test-repo')
    expect(description.text()).toBe('Test repository')
    expect(stars.text()).toBe('10 stars')
    expect(branch.text()).toBe('main')
    expect(wrapper.find('img').attributes('src')).toBe('https://github.com/avatar.png')
  })

  it('renders Azure repository correctly', async () => {
    const wrapper = mount(RepositoryCard, {
      props: {
        repository: mockAzureRepo
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    const title = wrapper.find('.text-xl.font-semibold')
    const description = wrapper.find('.mb-3.font-normal.text-gray-500')
    const branch = wrapper.find('.bg-blue-100.text-blue-800')

    expect(title.text()).toBe('test-repo')
    expect(description.text()).toBe('Test repository')
    expect(branch.text()).toBe('main')
  })

  it('applies correct styles', async () => {
    const wrapper = mount(RepositoryCard, {
      props: {
        repository: mockGitLabRepo
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    const card = wrapper.find('.max-w-sm')
    expect(card.classes()).toContain('bg-white')
    expect(card.classes()).toContain('border')
    expect(card.classes()).toContain('rounded-lg')
    expect(card.classes()).toContain('shadow')
  })
})
