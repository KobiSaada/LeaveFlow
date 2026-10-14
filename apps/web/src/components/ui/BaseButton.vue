<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
  }>(),
  { variant: 'primary', type: 'button', loading: false, disabled: false, size: 'md' },
);

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  props.size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-sm',
  {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[props.variant],
]);
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <svg
      v-if="loading"
      class="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="4" />
    </svg>
    <slot />
  </button>
</template>
