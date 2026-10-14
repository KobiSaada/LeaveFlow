import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import DecisionDialog from './DecisionDialog.vue';

const mounted: Array<ReturnType<typeof mount>> = [];
async function open(mode: 'approve' | 'reject') {
  const wrapper = mount(DecisionDialog, {
    props: { open: false, mode, summary: 'Bob Levi · 13 Dec – 15 Dec 2026' },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await wrapper.setProps({ open: true });
  return wrapper;
}
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const confirmButton = () =>
  [...dialog().querySelectorAll('button')].find((b) => b.type === 'submit')!;
const typeComment = async (value: string) => {
  const textarea = dialog().querySelector('textarea')!;
  textarea.value = value;
  textarea.dispatchEvent(new Event('input'));
  await new Promise((resolve) => setTimeout(resolve));
};

afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

describe('DecisionDialog', () => {
  it('is an accessible modal dialog', async () => {
    await open('reject');
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog().getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Reject request',
    );
  });

  it('keeps Reject disabled for an empty or whitespace-only comment (BR-5)', async () => {
    await open('reject');
    expect(confirmButton().disabled).toBe(true);
    await typeComment('    ');
    expect(confirmButton().disabled).toBe(true);
    await typeComment('Release freeze');
    expect(confirmButton().disabled).toBe(false);
  });

  it('emits the trimmed comment on reject', async () => {
    const wrapper = await open('reject');
    await typeComment('  Release freeze  ');
    dialog().querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(wrapper.emitted('confirm')).toEqual([['Release freeze']]);
  });

  it('lets approve confirm without a comment and emits null', async () => {
    const wrapper = await open('approve');
    expect(confirmButton().disabled).toBe(false);
    dialog().querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(wrapper.emitted('confirm')).toEqual([[null]]);
  });

  it('cancels on Escape', async () => {
    const wrapper = await open('approve');
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
