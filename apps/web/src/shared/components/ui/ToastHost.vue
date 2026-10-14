<script setup lang="ts">
import { useToast } from '@/shared/composables/useToast';

const { toasts, dismiss } = useToast();
const tone = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-slate-200 bg-white text-slate-900',
};
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    aria-live="polite"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto flex w-full max-w-md items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg"
      :class="tone[toast.kind]"
      :role="toast.kind === 'error' ? 'alert' : 'status'"
    >
      <span>{{ toast.message }}</span>
      <button
        type="button"
        class="text-current/70 hover:text-current"
        aria-label="Dismiss"
        @click="dismiss(toast.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>
