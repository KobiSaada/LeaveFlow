import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge.vue';

describe('StatusBadge', () => {
  it.each([
    ['PENDING', 'Pending'],
    ['APPROVED', 'Approved'],
    ['REJECTED', 'Rejected'],
  ] as const)('spells out %s as text, not colour alone', (status, label) => {
    const wrapper = mount(StatusBadge, { props: { status } });
    expect(wrapper.text()).toBe(label);
    expect(wrapper.attributes('data-status')).toBe(status);
  });
});
