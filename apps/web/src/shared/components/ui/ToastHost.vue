<script setup lang="ts">
import { CircleCheck, CircleX, Info, X } from 'lucide-vue-next';
import { useToast } from '@/shared/composables/useToast';

const { toasts, dismiss } = useToast();
const kinds = {
  success: {
    icon: CircleCheck,
    classes: 'border-emerald-200 bg-white text-slate-800',
    iconClass: 'text-emerald-600',
  },
  error: {
    icon: CircleX,
    classes: 'border-rose-200 bg-white text-slate-800',
    iconClass: 'text-rose-600',
  },
  info: {
    icon: Info,
    classes: 'border-sky-200 bg-white text-slate-800',
    iconClass: 'text-sky-600',
  },
};
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="translate-y-2 opacity-0"
      enter-active-class="transition duration-200"
      leave-to-class="opacity-0"
      leave-active-class="transition duration-150"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/5"
        :class="kinds[toast.kind].classes"
        :role="toast.kind === 'error' ? 'alert' : 'status'"
      >
        <component
          :is="kinds[toast.kind].icon"
          class="mt-0.5 size-5 shrink-0"
          :class="kinds[toast.kind].iconClass"
          aria-hidden="true"
        />
        <span class="flex-1">{{ toast.message }}</span>
        <button
          type="button"
          class="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss"
          @click="dismiss(toast.id)"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
