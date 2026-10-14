import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PaginationControls from './PaginationControls.vue';

const pageInfo = (page: number, totalPages: number) => ({
  page,
  pageSize: 10,
  totalItems: totalPages * 10,
  totalPages,
});
const buttons = (wrapper: ReturnType<typeof mount>) => {
  const [previous, next] = wrapper.findAll('button');
  return { previous: previous!, next: next! };
};

describe('PaginationControls', () => {
  it('renders nothing for a single page', () => {
    expect(
      mount(PaginationControls, { props: { pageInfo: pageInfo(1, 1) } })
        .find('nav')
        .exists(),
    ).toBe(false);
  });

  it('disables Previous on the first page and Next on the last', () => {
    const first = buttons(mount(PaginationControls, { props: { pageInfo: pageInfo(1, 3) } }));
    expect(first.previous.element.disabled).toBe(true);
    expect(first.next.element.disabled).toBe(false);
    const last = buttons(mount(PaginationControls, { props: { pageInfo: pageInfo(3, 3) } }));
    expect(last.next.element.disabled).toBe(true);
  });

  it('emits the adjacent page number', async () => {
    const wrapper = mount(PaginationControls, { props: { pageInfo: pageInfo(2, 3) } });
    await buttons(wrapper).next.trigger('click');
    await buttons(wrapper).previous.trigger('click');
    expect(wrapper.emitted('update:page')).toEqual([[3], [1]]);
  });
});
