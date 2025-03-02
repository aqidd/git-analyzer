import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HealthMetricCard from '../HealthMetricCard.vue'

describe('HealthMetricCard', () => {
  const defaultProps = {
    title: 'Code Activity',
    status: 'Active',
    value: '2.5',
    unit: 'commits/day',
    isHealthy: true
  }

  it('renders properly with healthy status', () => {
    const wrapper = mount(HealthMetricCard, { props: defaultProps })
    
    expect(wrapper.text()).toContain('Code Activity')
    expect(wrapper.text()).toContain('Active')
    expect(wrapper.text()).toContain('2.5')
    expect(wrapper.text()).toContain('commits/day')
    expect(wrapper.find('.bg-green-200').exists()).toBe(true)
  })

  it('renders properly with unhealthy status', () => {
    const wrapper = mount(HealthMetricCard, {
      props: {
        ...defaultProps,
        status: 'Low Activity',
        isHealthy: false
      }
    })
    
    expect(wrapper.text()).toContain('Low Activity')
    expect(wrapper.find('.bg-yellow-200').exists()).toBe(true)
  })

  it('handles numeric values', () => {
    const wrapper = mount(HealthMetricCard, {
      props: {
        ...defaultProps,
        value: 2.5
      }
    })
    
    expect(wrapper.text()).toContain('2.5')
  })

  it('handles long titles and statuses', () => {
    const wrapper = mount(HealthMetricCard, {
      props: {
        ...defaultProps,
        title: 'Very Long Title That Should Still Work',
        status: 'Extremely Long Status Message'
      }
    })
    
    expect(wrapper.text()).toContain('Very Long Title That Should Still Work')
    expect(wrapper.text()).toContain('Extremely Long Status Message')
  })
})
