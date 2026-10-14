<script setup lang="ts">
import { COMMENT_MAX_LENGTH } from '@leaveflow/contracts';
import { CircleCheck, CircleX } from 'lucide-vue-next';
import { computed, nextTick, ref, useId, watch } from 'vue';
import BaseButton from '../../../shared/components/ui/BaseButton.vue';
import BaseTextarea from '../../../shared/components/ui/BaseTextarea.vue';

const props = defineProps<{
  open: boolean;
  mode: 'approve' | 'reject';
  /** e.g. "Alice Cohen · 9 Nov – 13 Nov 2026" */
  summary: string;
  busy?: boolean;
}>();
const emit = defineEmits<{ confirm: [comment: string | null]; cancel: [] }>();

const comment = ref('');
const dialog = ref<HTMLElement | null>(null);
const textarea = ref<InstanceType<typeof BaseTextarea> | null>(null);
const titleId = useId();
let returnFocusTo: HTMLElement | null = null;

const isReject = computed(() => props.mode === 'reject');
const canConfirm = computed(() => !isReject.value || comment.value.trim().length > 0);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocusTo = document.activeElement as HTMLElement | null;
      comment.value = '';
      await nextTick();
      textarea.value?.focus();
    } else {
      returnFocusTo?.focus();
    }
  },
);

function confirm(): void {
  if (!canConfirm.value || props.busy) return;
  emit('confirm', comment.value.trim() || null);
}

/** Keeps Tab inside the dialog while it is open. */
function trapFocus(event: KeyboardEvent): void {
  const focusable = dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea');
  if (!focusable || focusable.length === 0) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      @click.self="emit('cancel')"
    >
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        @keydown.esc="emit('cancel')"
        @keydown.tab="trapFocus"
      >
        <div class="flex items-start gap-3">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full"
            :class="isReject ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'"
            aria-hidden="true"
          >
            <component :is="isReject ? CircleX : CircleCheck" class="size-5" />
          </span>
          <div>
            <h2 :id="titleId" class="text-lg font-semibold">
              {{ isReject ? 'Reject request' : 'Approve request' }}
            </h2>
            <p class="mt-0.5 text-sm text-slate-600">{{ summary }}</p>
          </div>
        </div>
        <form class="mt-4 space-y-4" @submit.prevent="confirm">
          <BaseTextarea
            ref="textarea"
            v-model="comment"
            :label="isReject ? 'Reason for rejection' : 'Comment (optional)'"
            :required="isReject"
            :maxlength="COMMENT_MAX_LENGTH"
            :rows="4"
          />
          <p v-if="isReject && !canConfirm" class="text-sm text-slate-500">
            A comment is required to reject a request.
          </p>
          <div class="flex justify-end gap-2">
            <BaseButton variant="secondary" :disabled="busy" @click="emit('cancel')"
              >Cancel</BaseButton
            >
            <BaseButton
              type="submit"
              :variant="isReject ? 'danger' : 'success'"
              :disabled="!canConfirm"
              :loading="busy"
            >
              {{ isReject ? 'Reject' : 'Approve' }}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
