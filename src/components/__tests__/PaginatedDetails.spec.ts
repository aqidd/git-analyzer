// Updated: Added test for PaginatedDetails component
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginatedDetails from '../PaginatedDetails.vue'
import { GitCommitIcon, GitBranchIcon, UsersIcon, RocketIcon, GitMergeIcon } from 'lucide-vue-next'

const mockData = {
  commits: [
    { 
      id: '1', 
      message: 'test commit', 
      author_name: 'test', 
      created_at: '2023-01-01', 
      web_url: 'https://test.com/commit/1',
      additions: 10, 
      deletions: 5 
    }
  ],
  branches: [
    { 
      name: 'main', 
      protected: true,
      lastCommitAuthor: 'test',
      lastCommitDate: '2023-01-01'
    }
  ],
  pipelines: [
    { 
      id: '1', 
      status: 'success', 
      ref: 'main',
      web_url: 'https://test.com/pipeline/1',
      updated_at: '2023-01-01'
    }
  ],
  contributors: [
    { 
      id: '1',
      name: 'test', 
      commits: 10, 
      avatar_url: 'https://test.com/avatar.png'
    }
  ],
  pullRequests: [
    { 
      id: '1', 
      title: 'test PR', 
      state: 'open', 
      isDraft: false, 
      author: { name: 'test' },
      createdAt: '2023-01-01',
      reviewCount: 2,
      comments: 5,
      additions: 100,
      deletions: 50,
      changedFiles: 3,
      timeToMerge: 24,
      timeToFirstReview: 2
    }
  ]
}

describe('PaginatedDetails', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(PaginatedDetails, {
      props: {
        commits: mockData.commits,
        branches: mockData.branches,
        pipelines: mockData.pipelines,
        contributors: mockData.contributors,
        pullRequests: mockData.pullRequests
      },
      global: {
        components: {
          GitCommitIcon,
          GitBranchIcon,
          UsersIcon,
          RocketIcon,
          GitMergeIcon
        }
      }
    })
  })

  it('renders properly', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('shows all tabs', () => {
    const tabs = wrapper.findAll('button[class*="group inline-flex items-center border-b-2"]')
    expect(tabs).toHaveLength(5) // commits, branches, pipelines, contributors, pull requests
    expect(tabs[0].text()).toContain('Commits')
    expect(tabs[1].text()).toContain('Branches')
    expect(tabs[2].text()).toContain('Pull Requests')
    expect(tabs[3].text()).toContain('Contributors')
    expect(tabs[4].text()).toContain('Pipelines')
  })

  it('displays correct tab content when switching tabs', async () => {
    // Check commits tab (default)
    expect(wrapper.find('.font-medium.text-gray-900.dark\\:text-white').text()).toBe('test commit')

    // Switch to branches tab
    await wrapper.findAll('button[class*="group inline-flex items-center border-b-2"]')[1].trigger('click')
    expect(wrapper.find('.font-medium.text-gray-900.dark\\:text-white').text()).toBe('main')

    // Switch to pull requests tab
    await wrapper.findAll('button[class*="group inline-flex items-center border-b-2"]')[2].trigger('click')
    expect(wrapper.find('.font-medium.text-gray-900.dark\\:text-white').text()).toBe('test PR')

    // Switch to contributors tab
    await wrapper.findAll('button[class*="group inline-flex items-center border-b-2"]')[3].trigger('click')
    expect(wrapper.find('.font-medium.text-gray-900.dark\\:text-white').text()).toBe('test')

    // Switch to pipelines tab
    await wrapper.findAll('button[class*="group inline-flex items-center border-b-2"]')[4].trigger('click')
    expect(wrapper.find('.font-medium.text-gray-900.dark\\:text-white').text()).toBe('main')
  })

  it('shows correct item count for each tab', () => {
    const counts = wrapper.findAll('.ml-3.hidden.rounded-full')
    expect(counts[0].text()).toBe('1') // commits
    expect(counts[1].text()).toBe('1') // branches
    expect(counts[2].text()).toBe('1') // pull requests
    expect(counts[3].text()).toBe('1') // contributors
    expect(counts[4].text()).toBe('1') // pipelines
  })

  it('handles pagination correctly', async () => {
    // Add more items to test pagination
    const manyCommits = Array(30).fill(null).map((_, i) => ({
      id: String(i),
      message: `commit ${i}`,
      author_name: 'test',
      created_at: '2023-01-01',
      web_url: `https://test.com/commit/${i}`,
      additions: 10,
      deletions: 5
    }))

    wrapper = mount(PaginatedDetails, {
      props: {
        commits: manyCommits,
        branches: mockData.branches,
        pipelines: mockData.pipelines,
        contributors: mockData.contributors,
        pullRequests: mockData.pullRequests
      },
      global: {
        components: {
          GitCommitIcon,
          GitBranchIcon,
          UsersIcon,
          RocketIcon,
          GitMergeIcon
        }
      }
    })

    // Wait for component to update
    await wrapper.vm.$nextTick()

    // Check first page
    const firstPageMessages = wrapper.findAll('.font-medium.text-gray-900.dark\\:text-white')
    expect(firstPageMessages[0].text()).toBe('commit 0')
    expect(firstPageMessages[24].text()).toBe('commit 24')

    // Go to next page
    const nextButton = wrapper.find('button:not([disabled])[class*="rounded-md border"]')
    await nextButton.trigger('click')
    await wrapper.vm.$nextTick()

    // Check second page
    const secondPageMessages = wrapper.findAll('.font-medium.text-gray-900.dark\\:text-white')
    expect(secondPageMessages[0].text()).toBe('commit 25')
    expect(secondPageMessages[4].text()).toBe('commit 29')
  })
})
